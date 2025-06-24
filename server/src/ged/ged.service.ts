import { Injectable, ForbiddenException, NotFoundException 
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { SearchDocumentDto } from './dto/search-document.dto';
import { Document, User } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { NotificationService } from './notification.service';

@Injectable()
export class GedService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}


  async getSlaBreaches(user: User) {
  // Only admin/chef roles can view
  if (!['SUPER_ADMIN', 'CHEF_EQUIPE', 'ADMINISTRATEUR'].includes(user.role)) {
  throw new ForbiddenException('You do not have permission to view SLA breaches');
  }
  const thresholdHours = 48; // Example SLA: 48 hours
  const thresholdDate = new Date(Date.now() - thresholdHours * 60 * 60 * 1000);
  const docs = await this.prisma.document.findMany({
  where: {
  uploadedAt: { lte: thresholdDate },
  OR: [
  { status: { not: 'scanned' } },
  { status: null },
  ],
  },
  orderBy: { uploadedAt: 'asc' },
  });
  return docs; // Always return an array, even if empty
  }
  
  // Color-coded SLA status for each document
  async getSlaStatus(user: User) {
  // Only admin/chef roles can view
  if (!['SUPER_ADMIN', 'CHEF_EQUIPE', 'ADMINISTRATEUR'].includes(user.role)) {
  throw new ForbiddenException('You do not have permission to view SLA status');
  }
  const warningHours = 36; // 🟠 warning if older than 36h
  const breachHours = 48;  // 🔴 breach if older than 48h
  const now = new Date();
  const docs = await this.prisma.document.findMany({
  orderBy: { uploadedAt: 'asc' },
  });
  if (!docs.length) return [];
  return docs.map(doc => {
  const hours = (now.getTime() - doc.uploadedAt.getTime()) / (1000 * 60 * 60);
  let slaStatus = 'green'; // 🟢
  if (doc.status !== 'scanned') {
  if (hours >= breachHours) slaStatus = 'red'; // 🔴
  else if (hours >= warningHours) slaStatus = 'orange'; // 🟠
  }
  return { ...doc, slaStatus };
  });
  }

  // Audit trail/history for a document
  async getDocumentAudit(id: string, user: User) {
    // Only allow if user can view the document
    await this.getDocumentById(id, user);
    return this.prisma.auditLog.findMany({
      where: { details: { path: ['documentId'], equals: id } },
      orderBy: { timestamp: 'asc' },
    });
  }

  // Assignment/reaffectation logic
  async assignDocument(
    id: string,
    body: { assignedToUserId?: string; teamId?: string },
    user: User,
  ) {
    // Only Chef d’équipe or Super Admin can assign manually
    if (!['CHEF_EQUIPE', 'SUPER_ADMIN'].includes(user.role)) {
      throw new ForbiddenException('You do not have permission to assign documents');
    }
    // If no assignedToUserId provided, do auto-assignment
    let assignedToUserId = body.assignedToUserId;
    if (!assignedToUserId) {
      // Find all eligible users (SCAN_TEAM, GESTIONNAIRE, active)
      const eligible = await this.prisma.user.findMany({
        where: {
          role: { in: ['SCAN_TEAM', 'GESTIONNAIRE'] },
          active: true,
        },
      });
      if (eligible.length === 0) throw new ForbiddenException('No eligible users for auto-assignment.');
      // Assign to user with lowest open documents
      const workloads = await Promise.all(eligible.map(async user => {
        const count = await this.prisma.document.count({
          where: { uploadedById: user.id, status: { not: 'scanned' } },
        });
        return { user, count };
      }));
      workloads.sort((a, b) => a.count - b.count);
      assignedToUserId = workloads[0].user.id;
    }
    const doc = await this.prisma.document.update({
      where: { id },
      data: {
        uploadedById: assignedToUserId,
        ...(body.teamId && { teamId: body.teamId }),
      },
    });
    // Audit log
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'ASSIGN_DOCUMENT',
          details: { documentId: id, assignedToUserId, ...body },
        },
      });
    } catch (e) {
      console.log(`[AUDIT] Document assigned: ${id} by ${user.id}`);
    }
    // Notification
    await this.notificationService.notify('document_assigned', { document: doc, user, assignedToUserId, ...body });
    return doc;
  }
    async getDocumentStats(user: User) {
    // Only allow for admin/chef roles
    if (!['SUPER_ADMIN', 'CHEF_EQUIPE'].includes(user.role)) {
      throw new ForbiddenException('You do not have permission to view stats');
    }
    const total = await this.prisma.document.count();
    const byType = await this.prisma.document.groupBy({
      by: ['type'],
      _count: { type: true },
    });
    const recent = await this.prisma.document.findMany({
      orderBy: { uploadedAt: 'desc' },
      take: 10,
      select: { id: true, name: true, type: true, uploadedAt: true },
    });
    return { total, byType, recent };
  }

  // Example: update document status (for SCAN workflow)
  async updateDocumentStatus(id: string, status: string, user: User) {
    // Only SCAN_TEAM, CHEF_EQUIPE, SUPER_ADMIN can update status
    if (!['SCAN_TEAM', 'CHEF_EQUIPE', 'SUPER_ADMIN'].includes(user.role)) {
      throw new ForbiddenException('You do not have permission to update document status');
    }
    // Try to update status if the field exists, otherwise just fetch the doc
    let doc;
    try {
      // Real status update now that Prisma client is correct
      doc = await this.prisma.document.update({
        where: { id },
        data: { status },
      });
    } catch (err) {
      // If status field does not exist, fallback to fetching the doc
      doc = await this.prisma.document.findUnique({ where: { id } });
      console.warn('[WARN] Document.status field does not exist in schema. Status not updated.');
    }
    // Audit log (real or placeholder)
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'UPDATE_DOCUMENT_STATUS',
          details: { documentId: id, newStatus: status },
        },
      });
    } catch (e) {
      // If AuditLog model does not exist, fallback to console
      console.log(`[AUDIT] Document status updated: ${id} to ${status} by ${user.id}`);
    }
    // Notification
    await this.notificationService.notify('document_status_updated', { document: doc, user, status });
    return doc;
  }

  async uploadDocument(
    file: Express.Multer.File,
    dto: CreateDocumentDto,
    user: User,
  ): Promise<Document> {
    // Access control: Only Scan Team, Chef d’équipe, Super Admin can upload
    if (!['SCAN_TEAM', 'CHEF_EQUIPE', 'SUPER_ADMIN'].includes(user.role)) {
      throw new ForbiddenException('You do not have permission to upload documents');
    }
    // Validate file type and size (example: max 10MB, allowed types: pdf, jpg, png)
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new ForbiddenException('File type not allowed.');
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new ForbiddenException('File size exceeds 10MB limit.');
    }
    // Defensive: ensure bordereau exists if bordereauId provided
    if (dto.bordereauId) {
      const bordereau = await this.prisma.bordereau.findUnique({ where: { id: dto.bordereauId } });
      if (!bordereau) throw new ForbiddenException('Linked bordereau does not exist.');
    }
    const doc = await this.prisma.document.create({
      data: {
        name: dto.name,
        type: dto.type,
        path: file.path,
        uploadedById: user.id,
        bordereauId: dto.bordereauId,
        status: 'uploaded',
      },
    });
    // Audit log
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'UPLOAD_DOCUMENT',
          details: { documentId: doc.id },
        },
      });
    } catch (e) {
      console.log(`[AUDIT] Document uploaded: ${doc.id} by ${user.id}`);
    }
    // Notification
    await this.notificationService.notify('document_uploaded', { document: doc, user });
    return doc;
  }

  async searchDocuments(query: SearchDocumentDto, user: User) {
    // Access control: Gestionnaires can only view linked docs, others can see all
    const where: any = {};
    if (query.type) where.type = query.type;
    if (query.uploadedAfter || query.uploadedBefore) {
      where.uploadedAt = {};
      if (query.uploadedAfter) where.uploadedAt.gte = new Date(query.uploadedAfter);
      if (query.uploadedBefore) where.uploadedAt.lte = new Date(query.uploadedBefore);
    }
    if (query.bordereauReference) {
      where.bordereau = { reference: query.bordereauReference };
    }
    // Filter by clientName and prestataire (if present)
    if (query.clientName) {
      where.bordereau = { ...where.bordereau, client: { name: { contains: query.clientName, mode: 'insensitive' } } };
    }
    if (query.prestataire) {
      where.bordereau = { ...where.bordereau, prestataire: { name: { contains: query.prestataire, mode: 'insensitive' } } };
    }
    if (user.role === 'GESTIONNAIRE') {
      where.bordereau = { ...where.bordereau, clientId: user.id };
    }
    // Keyword search (in name, type, and OCR text)
    if (query.keywords) {
      where.OR = [
        { name: { contains: query.keywords, mode: 'insensitive' } },
        { type: { contains: query.keywords, mode: 'insensitive' } },
        { ocrText: { contains: query.keywords, mode: 'insensitive' } },
      ];
    }
    return this.prisma.document.findMany({
      where,
      include: { bordereau: { include: { client: true, prestataire: true } }, uploader: true },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async getDocumentById(id: string, user: User) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: { bordereau: true, uploader: true },
    });
    if (!doc) throw new NotFoundException('Document not found');
    // Access control: Gestionnaire can only view linked docs
    if (user.role === 'GESTIONNAIRE' && doc.bordereau?.clientId !== user.id) {
      throw new ForbiddenException('You do not have access to this document');
    }
    return doc;
  }

  async tagDocument(id: string, tags: { type?: string; bordereauId?: string }, user: User) {
    // Only Chef d’équipe or Super Admin can tag
    if (!['CHEF_EQUIPE', 'SUPER_ADMIN'].includes(user.role)) {
      throw new ForbiddenException('You do not have permission to tag documents');
    }
    const doc = await this.prisma.document.update({
      where: { id },
      data: {
        type: tags.type,
        bordereauId: tags.bordereauId,
      },
    });
    // Audit log
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'TAG_DOCUMENT',
          details: { documentId: id, tags },
        },
      });
    } catch (e) {
      console.log(`[AUDIT] Document tagged: ${id} by ${user.id}`);
    }
    // Notification
    await this.notificationService.notify('document_tagged', { document: doc, user });
    return doc;
  }

  async deleteDocument(id: string, user: User) {
    // Only Super Admin can delete
    if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only Super Admin can delete documents');
    }
    // Find document to get file path
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    // Delete file from disk
    if (doc.path) {
      try {
        fs.unlinkSync(path.resolve(doc.path));
      } catch (err) {
        console.error(`[WARN] Failed to delete file from disk: ${doc.path}`);
      }
    }
    // Audit log
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'DELETE_DOCUMENT',
          details: { documentId: id },
        },
      });
    } catch (e) {
      console.log(`[AUDIT] Document deleted: ${id} by ${user.id}`);
    }
    // Notification
    await this.notificationService.notify('document_deleted', { document: doc, user });
    return this.prisma.document.delete({ where: { id } });
  }
}
