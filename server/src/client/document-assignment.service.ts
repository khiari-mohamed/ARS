import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentType } from '@prisma/client';

interface AssignmentFilterParams {
  type?: string;
  status?: string;
  assigned?: boolean;
}

@Injectable()
export class DocumentAssignmentService {
  constructor(private prisma: PrismaService) {}

  async assignDocumentsBulk(documentIds: string[], assignedToUserId: string, reason?: string) {
    const currentUserId = 'system'; // TODO: Get from auth context

    // Update documents
    await this.prisma.document.updateMany({
      where: {
        id: { in: documentIds }
      },
      data: {
        assignedToUserId,
        assignedByUserId: currentUserId,
        assignedAt: new Date()
      }
    });

    // Create assignment history records
    const historyRecords = documentIds.map(documentId => ({
      documentId,
      assignedToUserId,
      assignedByUserId: currentUserId,
      action: 'ASSIGNED',
      reason: reason || 'Assignation en lot par Super Admin'
    }));

    await this.prisma.documentAssignmentHistory.createMany({
      data: historyRecords
    });

    return { success: true, assignedCount: documentIds.length };
  }

  async assignDocument(documentId: string, assignedToUserId: string, reason?: string) {
    const currentUserId = 'system'; // TODO: Get from auth context

    // Update document
    const document = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        assignedToUserId,
        assignedByUserId: currentUserId,
        assignedAt: new Date()
      },
      include: {
        assignedTo: {
          select: { fullName: true }
        }
      }
    });

    // Create assignment history
    await this.prisma.documentAssignmentHistory.create({
      data: {
        documentId,
        assignedToUserId,
        assignedByUserId: currentUserId,
        action: 'ASSIGNED',
        reason: reason || 'Assignation individuelle'
      }
    });

    return document;
  }

  async reassignDocument(documentId: string, newAssignedToUserId: string, reason?: string) {
    const currentUserId = 'system'; // TODO: Get from auth context

    // Get current assignment
    const currentDocument = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { assignedToUserId: true }
    });

    // Update document
    const document = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        assignedToUserId: newAssignedToUserId,
        assignedByUserId: currentUserId,
        assignedAt: new Date()
      },
      include: {
        assignedTo: {
          select: { fullName: true }
        }
      }
    });

    // Create reassignment history
    await this.prisma.documentAssignmentHistory.create({
      data: {
        documentId,
        assignedToUserId: newAssignedToUserId,
        assignedByUserId: currentUserId,
        fromUserId: currentDocument?.assignedToUserId,
        action: 'REASSIGNED',
        reason: reason || 'Réassignation'
      }
    });

    return document;
  }

  async getDocumentsForAssignment(filters: AssignmentFilterParams) {
    const whereClause: any = {};

    if (filters.type && filters.type !== 'ALL') {
      whereClause.type = filters.type;
    }

    if (filters.status && filters.status !== 'ALL') {
      whereClause.status = filters.status;
    }

    if (filters.assigned !== undefined) {
      if (filters.assigned) {
        whereClause.assignedToUserId = { not: null };
      } else {
        whereClause.assignedToUserId = null;
      }
    }

    const documents = await this.prisma.document.findMany({
      where: whereClause,
      include: {
        assignedTo: {
          select: {
            id: true,
            fullName: true,
            role: true
          }
        },
        assignedBy: {
          select: {
            id: true,
            fullName: true
          }
        },
        bordereau: {
          include: {
            client: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { uploadedAt: 'desc' }
      ]
    });

    return documents.map(doc => ({
      id: doc.id,
      name: doc.name,
      type: doc.type,
      status: doc.status,
      uploadedAt: doc.uploadedAt,
      assignedTo: doc.assignedTo,
      assignedBy: doc.assignedBy,
      assignedAt: doc.assignedAt,
      priority: doc.priority,
      slaApplicable: doc.slaApplicable,
      bordereau: doc.bordereau ? {
        reference: doc.bordereau.reference,
        client: doc.bordereau.client
      } : null
    }));
  }

  async getDocumentAssignmentHistory(documentId: string) {
    const history = await this.prisma.documentAssignmentHistory.findMany({
      where: { documentId },
      include: {
        assignedTo: {
          select: { fullName: true }
        },
        assignedBy: {
          select: { fullName: true }
        },
        fromUser: {
          select: { fullName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return history;
  }

  async getAssignmentStats() {
    const [total, assigned, unassigned, overdue] = await Promise.all([
      this.prisma.document.count(),
      this.prisma.document.count({
        where: { assignedToUserId: { not: null } }
      }),
      this.prisma.document.count({
        where: { assignedToUserId: null }
      }),
      this.prisma.document.count({
        where: {
          assignedToUserId: null,
          slaApplicable: true,
          uploadedAt: {
            lt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
          }
        }
      })
    ]);

    return {
      total,
      assigned,
      unassigned,
      overdue
    };
  }
}