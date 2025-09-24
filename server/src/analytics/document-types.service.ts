import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentType } from '@prisma/client';

interface FilterParams {
  fromDate?: string;
  toDate?: string;
  clientId?: string;
  departmentId?: string;
}

interface AssignmentFilterParams {
  type?: string;
  status?: string;
  assigned?: boolean;
}

@Injectable()
export class DocumentTypesService {
  constructor(private prisma: PrismaService) {}

  // SLA-applicable document types (as per requirements)
  private readonly SLA_APPLICABLE_TYPES = [
    'BULLETIN_SOIN',
    'COMPLEMENT_INFORMATION', 
    'ADHESION',
    'RECLAMATION'
  ];

  // Non-SLA document types (as per requirements)
  private readonly NON_SLA_TYPES = [
    'CONTRAT_AVENANT',
    'DEMANDE_RESILIATION',
    'CONVENTION_TIERS_PAYANT'
  ];

  async getAllDocumentTypesStats(filters: FilterParams) {
    const whereClause: any = {};

    if (filters.fromDate && filters.toDate) {
      whereClause.uploadedAt = {
        gte: new Date(filters.fromDate),
        lte: new Date(filters.toDate)
      };
    }

    if (filters.clientId) {
      whereClause.bordereau = {
        clientId: filters.clientId
      };
    }

    // Get counts for each document type
    const documentCounts = await this.prisma.document.groupBy({
      by: ['type'],
      where: whereClause,
      _count: {
        id: true
      }
    });

    // Transform to expected format
    const result: Record<string, number> = {};
    
    // Initialize all types with 0
    Object.values(DocumentType).forEach(type => {
      result[type] = 0;
    });

    // Fill with actual counts
    documentCounts.forEach(item => {
      result[item.type] = item._count.id;
    });

    return result;
  }

  async getDocumentTypesBreakdown(filters: FilterParams) {
    const whereClause: any = {};

    if (filters.fromDate && filters.toDate) {
      whereClause.uploadedAt = {
        gte: new Date(filters.fromDate),
        lte: new Date(filters.toDate)
      };
    }

    if (filters.clientId) {
      whereClause.bordereau = {
        clientId: filters.clientId
      };
    }

    const breakdown = await this.prisma.document.groupBy({
      by: ['type'],
      where: whereClause,
      _count: {
        id: true
      }
    });

    const result: Record<string, number> = {};
    breakdown.forEach(item => {
      result[item.type] = item._count.id;
    });

    return result;
  }

  async getStatusByType(filters: FilterParams) {
    const whereClause: any = {};

    if (filters.fromDate && filters.toDate) {
      whereClause.uploadedAt = {
        gte: new Date(filters.fromDate),
        lte: new Date(filters.toDate)
      };
    }

    if (filters.clientId) {
      whereClause.bordereau = {
        clientId: filters.clientId
      };
    }

    const statusByType = await this.prisma.document.groupBy({
      by: ['type', 'status'],
      where: whereClause,
      _count: {
        id: true
      }
    });

    // Transform to nested structure: { TYPE: { STATUS: count } }
    const result: Record<string, Record<string, number>> = {};
    
    statusByType.forEach(item => {
      if (!result[item.type]) {
        result[item.type] = {};
      }
      result[item.type][item.status || 'UPLOADED'] = item._count.id;
    });

    return result;
  }

  async getSLAComplianceByType(filters: FilterParams) {
    const whereClause: any = {
      // Only include SLA-applicable types
      type: {
        in: this.SLA_APPLICABLE_TYPES as DocumentType[]
      },
      slaApplicable: true
    };

    if (filters.fromDate && filters.toDate) {
      whereClause.uploadedAt = {
        gte: new Date(filters.fromDate),
        lte: new Date(filters.toDate)
      };
    }

    if (filters.clientId) {
      whereClause.bordereau = {
        clientId: filters.clientId
      };
    }

    // Get all SLA-applicable documents
    const documents = await this.prisma.document.findMany({
      where: whereClause,
      include: {
        bordereau: {
          include: {
            client: true
          }
        }
      }
    });

    // Calculate SLA compliance for each type
    const result: Record<string, { total: number; compliant: number; rate: number }> = {};

    this.SLA_APPLICABLE_TYPES.forEach(type => {
      const typeDocuments = documents.filter(doc => doc.type === type);
      const total = typeDocuments.length;
      
      // Calculate compliance based on processing time vs SLA thresholds
      const compliant = typeDocuments.filter(doc => {
        if (!doc.bordereau) return false;
        
        const processingTime = this.calculateProcessingTime(doc.uploadedAt, doc.bordereau.dateCloture);
        const slaThreshold = doc.bordereau.client?.reglementDelay || 30; // Default 30 days
        
        return processingTime <= slaThreshold;
      }).length;

      const rate = total > 0 ? Math.round((compliant / total) * 100) : 0;

      result[type] = {
        total,
        compliant,
        rate
      };
    });

    return result;
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

  private calculateProcessingTime(uploadedAt: Date, closedAt: Date | null): number {
    if (!closedAt) {
      // If not closed, calculate time since upload
      const now = new Date();
      return Math.ceil((now.getTime() - uploadedAt.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    return Math.ceil((closedAt.getTime() - uploadedAt.getTime()) / (1000 * 60 * 60 * 24));
  }
}