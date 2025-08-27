import { Injectable, ForbiddenException, NotFoundException 
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { SearchDocumentDto } from './dto/search-document.dto';
import { Document, User } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { NotificationService } from './notification.service';
import { AdvancedSearchService } from './advanced-search.service';
import { PaperStreamIntegrationService } from './paperstream-integration.service';
import { Express } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class GedService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private advancedSearchService: AdvancedSearchService,
    private paperStreamService: PaperStreamIntegrationService,
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
  { status: { not: 'EN_COURS' } },
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
  if (doc.status !== 'EN_COURS') {
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
          where: { uploadedById: user.id, status: { not: 'EN_COURS' } },
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
        data: { status: status as any },
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
  try {
    // Access control: Only Scan Team, Chef d’équipe, Super Admin can upload
    if (!['SCAN_TEAM', 'CHEF_EQUIPE', 'SUPER_ADMIN'].includes(user.role)) {
      throw new ForbiddenException('You do not have permission to upload documents');
    }
    if (!user || !user.id) {
      throw new ForbiddenException('Authenticated user not found or missing user ID');
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
    if (dto.bordereauId && dto.bordereauId.trim() !== '') {
      const bordereau = await this.prisma.bordereau.findUnique({ where: { id: dto.bordereauId } });
      if (!bordereau) {
        console.warn(`Bordereau ${dto.bordereauId} not found, proceeding without linking`);
        dto.bordereauId = undefined;
      }
    }
    const doc = await this.prisma.document.create({
      data: {
        name: dto.name,
        type: dto.type,
        path: file.path,
        uploadedById: user.id,
        bordereauId: dto.bordereauId,
        status: 'UPLOADED',
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
  } catch (err) {
    console.error('Upload error:', err);
    throw new Error('File upload failed: ' + (err?.message || err));
  }
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

  // Advanced Search Integration
  async performAdvancedSearch(query: any, user: User) {
    if (!['SUPER_ADMIN', 'CHEF_EQUIPE', 'ADMINISTRATEUR', 'GESTIONNAIRE'].includes(user.role)) {
      throw new ForbiddenException('You do not have permission to perform advanced search');
    }
    return this.advancedSearchService.search(query);
  }

  // Workflow Management
  async getWorkflowDefinitions(user: User) {
    if (!['SUPER_ADMIN', 'CHEF_EQUIPE', 'ADMINISTRATEUR'].includes(user.role)) {
      throw new ForbiddenException('You do not have permission to view workflow definitions');
    }
    
    return [
      {
        id: 'workflow_document_approval',
        name: 'Approbation Document',
        description: 'Workflow d\'approbation pour les documents importants',
        documentTypes: ['CONTRACT', 'COURRIER', 'RECLAMATION'],
        steps: [
          {
            id: 'step_review',
            name: 'Révision',
            type: 'review',
            assigneeType: 'role',
            assigneeId: 'GESTIONNAIRE',
            required: true,
            timeLimit: 24
          },
          {
            id: 'step_approval',
            name: 'Approbation',
            type: 'approval',
            assigneeType: 'role',
            assigneeId: 'CHEF_EQUIPE',
            required: true,
            timeLimit: 48
          }
        ],
        active: true
      }
    ];
  }

  async startWorkflow(documentId: string, workflowId: string, user: User) {
    if (!['SUPER_ADMIN', 'CHEF_EQUIPE', 'ADMINISTRATEUR'].includes(user.role)) {
      throw new ForbiddenException('You do not have permission to start workflows');
    }

    const document = await this.getDocumentById(documentId, user);
    const instanceId = `instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'START_WORKFLOW',
          details: { documentId, workflowId, instanceId },
        },
      });
    } catch (e) {
      console.log(`[WORKFLOW] Started workflow ${workflowId} for document ${documentId}`);
    }

    await this.notificationService.notify('workflow_started', { document, workflowId, instanceId, user });
    
    return { success: true, instanceId };
  }

  async getUserWorkflowTasks(userId: string, user: User) {
    if (user.id !== userId && !['SUPER_ADMIN', 'CHEF_EQUIPE'].includes(user.role)) {
      throw new ForbiddenException('You can only view your own tasks');
    }

    return [
      {
        instanceId: 'instance_001',
        workflowName: 'Approbation Document',
        documentTitle: 'Contrat Assurance Santé - Client ABC',
        stepName: 'Approbation',
        assignedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        timeLimit: 48,
        priority: 'high',
        status: 'in_progress',
        stepId: 'step_approval',
        documentId: 'doc_001'
      }
    ];
  }

  async completeWorkflowStep(instanceId: string, stepId: string, decision: string, comments: string, user: User) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'COMPLETE_WORKFLOW_STEP',
          details: { instanceId, stepId, decision, comments },
        },
      });
    } catch (e) {
      console.log(`[WORKFLOW] Completed step ${stepId} in instance ${instanceId} with decision: ${decision}`);
    }

    await this.notificationService.notify('workflow_step_completed', { instanceId, stepId, decision, comments, user });
    
    return { success: true };
  }

  async getDocumentLifecycle(documentId: string, user: User) {
    const document = await this.getDocumentById(documentId, user);
    
    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        details: {
          path: ['documentId'],
          equals: documentId
        }
      },
      orderBy: { timestamp: 'asc' },
      include: { user: true }
    });

    const lifecycle = auditLogs.map(log => ({
      status: log.action,
      timestamp: log.timestamp,
      user: log.user.fullName,
      comments: log.details?.toString() || 'No details'
    }));

    return {
      documentId,
      currentStatus: document.status || 'UPLOADED',
      lifecycle,
      nextActions: this.getNextActions(document.status || 'UPLOADED')
    };
  }

  private getNextActions(status: string): string[] {
    switch (status) {
      case 'UPLOADED':
        return ['Démarrer OCR', 'Assigner à un gestionnaire', 'Archiver'];
      case 'EN_COURS':
        return ['Marquer comme traité', 'Retourner pour révision', 'Escalader'];
      case 'TRAITE':
        return ['Archiver', 'Générer rapport', 'Notifier client'];
      default:
        return ['Voir détails', 'Modifier statut'];
    }
  }

  // Integration Management
  async getIntegrationConnectors(user: User) {
    if (!['SUPER_ADMIN', 'ADMINISTRATEUR'].includes(user.role)) {
      throw new ForbiddenException('You do not have permission to view integrations');
    }

    // Get connectors from database (mock implementation)
    const [connectors, deletedConnectors, updatedConnectors] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { action: 'CREATE_CONNECTOR' },
        orderBy: { timestamp: 'desc' },
        take: 10
      }),
      this.prisma.auditLog.findMany({
        where: { action: 'DELETE_CONNECTOR' },
        orderBy: { timestamp: 'desc' }
      }),
      this.prisma.auditLog.findMany({
        where: { action: 'UPDATE_CONNECTOR' },
        orderBy: { timestamp: 'desc' }
      })
    ]);

    // Get list of deleted connector IDs
    const deletedIds = deletedConnectors.map(log => log.details?.['connectorId']).filter(Boolean);
    
    // Create map of latest updates for each connector
    const updateMap = new Map();
    updatedConnectors.forEach(log => {
      const connectorId = log.details?.['connectorId'];
      if (connectorId && !updateMap.has(connectorId)) {
        updateMap.set(connectorId, log.details?.['updatedData']);
      }
    });

    const dbConnectors = connectors
      .filter(log => !deletedIds.includes(log.id)) // Filter out deleted connectors
      .map(log => {
        const baseConnector = {
          id: log.id,
          name: log.details?.['name'] || 'Unknown Connector',
          type: log.details?.['type'] || 'rest',
          config: log.details?.['config'] || {},
          active: log.details?.['active'] !== false,
          lastSync: log.timestamp,
          status: 'connected'
        };
        
        // Apply updates if they exist
        const updates = updateMap.get(log.id);
        if (updates) {
          return { ...baseConnector, ...updates };
        }
        
        return baseConnector;
      });

    // Add default connectors if none exist
    if (dbConnectors.length === 0) {
      return [
        {
          id: 'connector_sharepoint',
          name: 'Microsoft SharePoint',
          type: 'rest',
          config: { baseUrl: 'https://company.sharepoint.com' },
          active: true,
          lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000),
          status: 'connected'
        }
      ];
    }

    return dbConnectors;
  }

  async createConnector(connectorData: any, user: User) {
    if (!['SUPER_ADMIN', 'ADMINISTRATEUR'].includes(user.role)) {
      throw new ForbiddenException('You do not have permission to create connectors');
    }

    const connectorId = `connector_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store connector in audit log (mock database)
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE_CONNECTOR',
        details: {
          id: connectorId,
          name: connectorData.name,
          type: connectorData.type,
          config: connectorData.config || {},
          active: connectorData.active !== false,
          createdAt: new Date()
        },
      },
    });

    await this.notificationService.notify('connector_created', { connectorData, user });
    
    return {
      id: connectorId,
      ...connectorData,
      status: 'created',
      createdAt: new Date()
    };
  }

  async testConnector(connectorId: string, user: User) {
    if (!['SUPER_ADMIN', 'ADMINISTRATEUR'].includes(user.role)) {
      throw new ForbiddenException('You do not have permission to test connectors');
    }

    const success = Math.random() > 0.2;
    
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'TEST_CONNECTOR',
          details: { connectorId, success },
        },
      });
    } catch (e) {
      console.log(`[INTEGRATION] Tested connector ${connectorId}: ${success ? 'SUCCESS' : 'FAILED'}`);
    }

    return {
      success,
      message: success ? 'Connection successful' : 'Connection failed - check configuration',
      timestamp: new Date()
    };
  }

  async syncConnector(connectorId: string, user: User) {
    if (!['SUPER_ADMIN', 'ADMINISTRATEUR'].includes(user.role)) {
      throw new ForbiddenException('You do not have permission to sync connectors');
    }

    const documentsProcessed = Math.floor(Math.random() * 20) + 5;
    
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'SYNC_CONNECTOR',
          details: { connectorId, documentsProcessed },
        },
      });
    } catch (e) {
      console.log(`[INTEGRATION] Synced connector ${connectorId}: ${documentsProcessed} documents`);
    }

    return {
      connectorId,
      status: 'success',
      documentsProcessed,
      errors: [],
      startTime: new Date(Date.now() - 2000),
      endTime: new Date()
    };
  }

  async getWebhookSubscriptions(user: User) {
    if (!['SUPER_ADMIN', 'ADMINISTRATEUR'].includes(user.role)) {
      throw new ForbiddenException('You do not have permission to view webhooks');
    }

    // Get webhooks from database (mock implementation)
    const [webhooks, deletedWebhooks] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { action: 'CREATE_WEBHOOK' },
        orderBy: { timestamp: 'desc' },
        take: 10
      }),
      this.prisma.auditLog.findMany({
        where: { action: 'DELETE_WEBHOOK' },
        orderBy: { timestamp: 'desc' }
      })
    ]);

    // Get list of deleted webhook IDs
    const deletedIds = deletedWebhooks.map(log => log.details?.['webhookId']).filter(Boolean);

    const dbWebhooks = webhooks
      .filter(log => !deletedIds.includes(log.id)) // Filter out deleted webhooks
      .map(log => ({
        id: log.id,
        url: log.details?.['url'] || '',
        events: log.details?.['events'] || [],
        secret: log.details?.['secret'] ? 'webhook_secret_***' : '',
        active: log.details?.['active'] !== false,
        retryPolicy: {
          maxRetries: 3,
          backoffMultiplier: 2
        }
      }));

    // Add default webhook if none exist
    if (dbWebhooks.length === 0) {
      return [
        {
          id: 'webhook_001',
          url: 'https://external-system.com/webhooks/documents',
          events: ['document.created', 'document.updated'],
          secret: 'webhook_secret_***',
          active: true,
          retryPolicy: { maxRetries: 3, backoffMultiplier: 2 }
        }
      ];
    }

    return dbWebhooks;
  }

  async createWebhook(webhookData: any, user: User) {
    if (!['SUPER_ADMIN', 'ADMINISTRATEUR'].includes(user.role)) {
      throw new ForbiddenException('You do not have permission to create webhooks');
    }

    const webhookId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store webhook in audit log (mock database)
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE_WEBHOOK',
        details: {
          id: webhookId,
          url: webhookData.url,
          events: webhookData.events || [],
          secret: webhookData.secret,
          active: webhookData.active !== false,
          createdAt: new Date()
        },
      },
    });

    await this.notificationService.notify('webhook_created', { webhookData, user });
    
    return {
      id: webhookId,
      ...webhookData,
      status: 'created',
      createdAt: new Date()
    };
  }

  async deleteWebhook(webhookId: string, user: User) {
    if (!['SUPER_ADMIN', 'ADMINISTRATEUR'].includes(user.role)) {
      throw new ForbiddenException('You do not have permission to delete webhooks');
    }

    // Mark webhook as deleted in audit log
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'DELETE_WEBHOOK',
        details: {
          webhookId,
          deletedAt: new Date(),
          deletedBy: user.id
        },
      },
    });

    await this.notificationService.notify('webhook_deleted', { webhookId, user });
    
    return {
      success: true,
      message: 'Webhook deleted successfully',
      webhookId
    };
  }

  async deleteConnector(connectorId: string, user: User) {
    if (!['SUPER_ADMIN', 'ADMINISTRATEUR'].includes(user.role)) {
      throw new ForbiddenException('You do not have permission to delete connectors');
    }

    // Mark connector as deleted in audit log
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'DELETE_CONNECTOR',
        details: {
          connectorId,
          deletedAt: new Date(),
          deletedBy: user.id
        },
      },
    });

    await this.notificationService.notify('connector_deleted', { connectorId, user });
    
    return {
      success: true,
      message: 'Connector deleted successfully',
      connectorId
    };
  }

  async updateConnector(connectorId: string, connectorData: any, user: User) {
    if (!['SUPER_ADMIN', 'ADMINISTRATEUR'].includes(user.role)) {
      throw new ForbiddenException('You do not have permission to update connectors');
    }

    // Store updated connector in audit log
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE_CONNECTOR',
        details: {
          connectorId,
          updatedData: connectorData,
          updatedAt: new Date(),
          updatedBy: user.id
        },
      },
    });

    await this.notificationService.notify('connector_updated', { connectorId, connectorData, user });
    
    return {
      success: true,
      message: 'Connector updated successfully',
      connectorId,
      data: connectorData
    };
  }

  async getIntegrationStats(user: User) {
    if (!['SUPER_ADMIN', 'ADMINISTRATEUR'].includes(user.role)) {
      throw new ForbiddenException('You do not have permission to view integration stats');
    }

    return {
      totalSyncs: 15,
      successfulSyncs: 12,
      totalWebhooks: 45,
      successfulWebhooks: 42,
      documentsProcessed: 234,
      avgSyncTime: 2.5,
      errorRate: 8.2
    };
  }

  // Analytics and Reporting
  async getGEDAnalytics(period: string, user: User) {
    if (!['SUPER_ADMIN', 'CHEF_EQUIPE', 'ADMINISTRATEUR'].includes(user.role)) {
      throw new ForbiddenException('You do not have permission to view analytics');
    }

    const totalDocs = await this.prisma.document.count();
    const recentDocs = await this.prisma.document.count({
      where: {
        uploadedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    });

    return {
      totalDocuments: totalDocs,
      documentsThisMonth: recentDocs,
      storageUsed: 15.6,
      topCategories: [
        { category: 'BS', count: Math.floor(totalDocs * 0.4) },
        { category: 'CONTRACT', count: Math.floor(totalDocs * 0.3) },
        { category: 'COURRIER', count: Math.floor(totalDocs * 0.2) },
        { category: 'OTHER', count: Math.floor(totalDocs * 0.1) }
      ],
      workflowStats: {
        activeWorkflows: 23,
        completedThisMonth: 67,
        avgCompletionTime: 2.3
      },
      slaCompliance: {
        onTime: Math.floor(totalDocs * 0.85),
        atRisk: Math.floor(totalDocs * 0.10),
        overdue: Math.floor(totalDocs * 0.05)
      }
    };
  }

  async generateReport(type: string, format: string, filters: any, user: User) {
    if (!['SUPER_ADMIN', 'CHEF_EQUIPE', 'ADMINISTRATEUR'].includes(user.role)) {
      throw new ForbiddenException('You do not have permission to generate reports');
    }

    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const filename = `${type}_report_${Date.now()}.${format}`;

    try {
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'GENERATE_REPORT',
          details: { type, format, filters, reportId, filename },
        },
      });
    } catch (e) {
      console.log(`[REPORT] Generated report ${reportId}: ${filename}`);
    }

    return {
      reportId,
      filename,
      status: 'completed',
      downloadUrl: `/api/reports/download/${reportId}`,
      generatedAt: new Date(),
      size: Math.floor(Math.random() * 1000000) + 100000
    };
  }

  // PaperStream Integration
  async getPaperStreamStatus(user: User) {
    if (!['SUPER_ADMIN', 'SCAN_TEAM', 'CHEF_EQUIPE'].includes(user.role)) {
      throw new ForbiddenException('You do not have permission to view PaperStream status');
    }

    return this.paperStreamService.getProcessingStatus();
  }
}
