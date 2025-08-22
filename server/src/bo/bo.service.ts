import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Express } from 'express';

export interface CreateBOEntryDto {
  reference?: string;
  clientId?: string;
  contractId?: string;
  documentType?: string;
  nombreDocuments?: number;
  delaiReglement?: number;
  dateReception?: string;
  startTime?: number;
}

export interface DocumentTypeDto {
  type: string;
  category: string;
  priority: string;
  extension: string;
  confidence: number;
}

export interface BOPerformanceDto {
  period: string;
  totalEntries: number;
  avgProcessingTime: number;
  errorRate: number;
  entrySpeed: number;
  activities: any[];
}

@Injectable()
export class BOService {
  constructor(private prisma: PrismaService) {}

  async generateReference(type: string, clientId?: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    try {
      const today = new Date(year, now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Use transaction to prevent race conditions in reference generation
      const result = await this.prisma.$transaction(async (tx) => {
        const count = await tx.bordereau.count({
          where: {
            createdAt: {
              gte: today,
              lt: tomorrow
            }
          }
        });
        
        const sequence = String(count + 1).padStart(4, '0');
        
        switch (type) {
          case 'BS':
            return `BS-${year}${month}${day}-${sequence}`;
          case 'RECLAMATION':
            return `REC-${year}${month}${day}-${sequence}`;
          case 'CONTRAT':
            return `CTR-${year}${month}${day}-${sequence}`;
          default:
            return `DOC-${year}${month}${day}-${sequence}`;
        }
      });
      
      return result;
    } catch (error) {
      // Fallback to timestamp-based reference if database fails
      const timestamp = Date.now().toString().slice(-6);
      const prefix = type === 'BS' ? 'BS' : type === 'RECLAMATION' ? 'REC' : type === 'CONTRAT' ? 'CTR' : 'DOC';
      return `${prefix}-${year}${month}${day}-${timestamp}`;
    }
  }

  async classifyDocument(fileName: string, content?: string): Promise<DocumentTypeDto> {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const lowerFileName = fileName.toLowerCase();
    let type = 'AUTRE';
    let category = 'GENERAL';
    let priority = 'NORMAL';
    let confidence = 0.6; // Base confidence
    
    if (lowerFileName.includes('bs') || lowerFileName.includes('bulletin')) {
      type = 'BS';
      category = 'MEDICAL';
      priority = 'HIGH';
      confidence = 0.9;
    } else if (lowerFileName.includes('contrat') || lowerFileName.includes('contract')) {
      type = 'CONTRAT';
      category = 'LEGAL';
      priority = 'HIGH';
      confidence = 0.85;
    } else if (lowerFileName.includes('reclamation') || lowerFileName.includes('complaint')) {
      type = 'RECLAMATION';
      category = 'CUSTOMER_SERVICE';
      priority = 'URGENT';
      confidence = 0.88;
    } else if (lowerFileName.includes('facture') || lowerFileName.includes('invoice')) {
      type = 'FACTURE';
      category = 'FINANCE';
      priority = 'HIGH';
      confidence = 0.82;
    }
    
    return {
      type,
      category,
      priority,
      extension: extension || 'unknown',
      confidence
    };
  }

  async createBatchEntry(entries: CreateBOEntryDto[], userId: string) {
    // Process entries in parallel for better performance
    const results = await Promise.allSettled(
      entries.map(async (entry, index) => {
        try {
          if (!entry.reference) {
            entry.reference = await this.generateReference(entry.documentType || 'DOC', entry.clientId);
          }
          
          // Set defaults for missing fields
          if (!entry.clientId) {
            // Create or find a default client
            const defaultClient = await this.prisma.client.findFirst() || 
              await this.prisma.client.create({
                data: {
                  name: 'Client par défaut',
                  reglementDelay: 30,
                  reclamationDelay: 7
                }
              });
            entry.clientId = defaultClient.id;
          }
          
          if (!entry.documentType) {
            entry.documentType = 'AUTRE';
          }
          
          if (!entry.nombreDocuments) {
            entry.nombreDocuments = 1;
          }
          
          // First, get or create a default contract if none provided
          let contractId = entry.contractId;
          if (!contractId) {
            // Find the first contract for this client or create a default one
            const existingContract = await this.prisma.contract.findFirst({
              where: { clientId: entry.clientId }
            });
            
            if (existingContract) {
              contractId = existingContract.id;
            } else {
              // Skip contract creation if no existing contract - just use undefined
              contractId = undefined;
            }
          }
          
          const bordereauData: any = {
            reference: entry.reference,
            clientId: entry.clientId,
            dateReception: entry.dateReception ? new Date(entry.dateReception) : new Date(),
            delaiReglement: entry.delaiReglement || 30,
            nombreBS: entry.nombreDocuments,
            statut: 'EN_ATTENTE',
          };
          
          if (contractId) {
            bordereauData.contractId = contractId;
          }
          
          const bordereau = await this.prisma.bordereau.create({
            data: bordereauData,
            include: {
              client: true,
              contract: contractId ? true : false
            }
          });
          
          await this.logBOActivity(userId, 'CREATE_ENTRY', {
            bordereauId: bordereau.id,
            documentType: entry.documentType,
            processingTime: Date.now() - (entry.startTime || Date.now())
          });
          
          return {
            index,
            success: true,
            bordereau,
            reference: bordereau.reference
          };
          
        } catch (error) {
          return {
            index,
            success: false,
            error: error.message,
            entry
          };
        }
      })
    );
    
    const successResults = results
      .filter(result => result.status === 'fulfilled' && result.value.success)
      .map(result => (result as PromiseFulfilledResult<any>).value);
    
    const errorResults = results
      .filter(result => result.status === 'fulfilled' && !result.value.success)
      .map(result => (result as PromiseFulfilledResult<any>).value);
    
    const rejectedResults = results
      .filter(result => result.status === 'rejected')
      .map((result, index) => ({
        index,
        error: (result as PromiseRejectedResult).reason?.message || 'Unknown error',
        entry: entries[index]
      }));
    
    const allErrors = [...errorResults, ...rejectedResults];
    
    // For single entry, return the result directly
    if (entries.length === 1) {
      if (successResults.length > 0) {
        return successResults[0];
      } else if (allErrors.length > 0) {
        return allErrors[0];
      }
    }
    
    return {
      success: successResults,
      errors: allErrors,
      total: entries.length,
      successCount: successResults.length,
      errorCount: allErrors.length
    };
  }

  async validateDocumentQuality(file: Express.Multer.File): Promise<{
    isValid: boolean;
    issues: string[];
    score: number;
  }> {
    const issues: string[] = [];
    let score = 100;
    
    if (file.size > 10 * 1024 * 1024) {
      issues.push('File size exceeds 10MB limit');
      score -= 20;
    }
    
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'];
    if (!allowedTypes.includes(file.mimetype)) {
      issues.push('Unsupported file type');
      score -= 30;
    }
    
    if (file.originalname.length < 3) {
      issues.push('Filename too short');
      score -= 10;
    }
    
    if (!/^[a-zA-Z0-9._-]+$/.test(file.originalname.replace(/\.[^/.]+$/, ""))) {
      issues.push('Filename contains invalid characters');
      score -= 15;
    }
    
    return {
      isValid: score >= 70,
      issues,
      score: Math.max(0, score)
    };
  }

  async logBOActivity(userId: string, action: string, details: any) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: `BO_${action}`,
        details: {
          ...details,
          timestamp: new Date().toISOString()
        }
      }
    });
  }

  async getBOPerformance(userId?: string, period: string = 'daily'): Promise<BOPerformanceDto> {
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'daily':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'weekly':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(now.getMonth() - 1);
        break;
    }
    
    const whereClause = userId ? 
      { userId, timestamp: { gte: startDate } } : 
      { timestamp: { gte: startDate } };
    
    const activities = await this.prisma.auditLog.findMany({
      where: {
        action: { startsWith: 'BO_' },
        ...whereClause
      },
      include: { user: { select: { fullName: true } } }
    });
    
    const totalEntries = activities.filter(a => a.action === 'BO_CREATE_ENTRY').length;
    const processingTimes = activities
      .filter(a => a.details?.processingTime)
      .map(a => a.details.processingTime as number);
    
    const avgProcessingTime = processingTimes.length > 0 ? 
      processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length : 0;
    
    const errors = activities.filter(a => a.action === 'BO_ERROR').length;
    const errorRate = totalEntries > 0 ? (errors / totalEntries) : 0;
    
    const hoursInPeriod = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    const entrySpeed = hoursInPeriod > 0 ? totalEntries / hoursInPeriod : 0;
    
    return {
      period,
      totalEntries,
      avgProcessingTime: Math.round(avgProcessingTime),
      errorRate: Math.round(errorRate * 10000) / 100,
      entrySpeed: Math.round(entrySpeed * 100) / 100,
      activities: activities.slice(0, 50)
    };
  }

  async getBODashboard(userId: string) {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const [todayEntries, pendingEntries, recentEntries, documentTypes] = await Promise.all([
      this.prisma.bordereau.count({
        where: {
          createdAt: { gte: startOfDay }
        }
      }),
      
      this.prisma.bordereau.count({
        where: { statut: 'EN_ATTENTE' }
      }),
      
      this.prisma.bordereau.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { name: true } },
          contract: { select: { clientName: true } }
        }
      }),
      
      this.prisma.bordereau.groupBy({
        by: ['statut'],
        _count: { id: true },
        where: {
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      })
    ]);
    
    const performance = await this.getBOPerformance(userId, 'daily');
    
    return {
      todayEntries,
      pendingEntries,
      recentEntries,
      statusCounts: documentTypes,
      performance,
      lastUpdated: new Date().toISOString()
    };
  }

  async getClientInfoForBO(clientId: string) {
    try {
      const client = await this.prisma.client.findUnique({
        where: { id: clientId },
        include: {
          contracts: {
            where: {
              startDate: { lte: new Date() },
              endDate: { gte: new Date() }
            },
            orderBy: { startDate: 'desc' },
            take: 1
          },
          gestionnaires: { select: { id: true, fullName: true, role: true } }
        }
      });
      
      if (!client) return { error: 'Client not found' };
      
      return {
        client: {
          id: client.id,
          name: client.name,
          reglementDelay: client.reglementDelay,
          reclamationDelay: client.reclamationDelay
        },
        activeContract: client.contracts[0] || null,
        gestionnaires: client.gestionnaires
      };
    } catch (error) {
      return { error: 'Failed to retrieve client info' };
    }
  }

  async searchClientsForBO(query: string) {
    try {
      const clients = await this.prisma.client.findMany({
        where: {
          name: { contains: query, mode: 'insensitive' }
        },
        select: {
          id: true,
          name: true,
          reglementDelay: true,
          reclamationDelay: true
        },
        take: 10
      });
      return { clients };
    } catch (error) {
      return { clients: [] };
    }
  }

  async trackPhysicalDocument(trackingData: {
    reference: string;
    location: string;
    status: string;
    notes?: string;
  }, userId: string = 'SYSTEM') {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { reference: trackingData.reference }
    });
    
    if (!bordereau) {
      throw new BadRequestException('Bordereau not found');
    }
    
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'PHYSICAL_DOCUMENT_TRACKING',
          details: {
            bordereauId: bordereau.id,
            reference: trackingData.reference,
            location: trackingData.location,
            status: trackingData.status,
            notes: trackingData.notes,
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
      throw new BadRequestException('Failed to update document tracking');
    }
    
    return { success: true, message: 'Document tracking updated' };
  }

  async enhancedCreateEntry(entry: CreateBOEntryDto & { autoRetrieveClient?: boolean }, userId: string) {
    // Enhanced entry creation with auto client retrieval
    if (entry.autoRetrieveClient && entry.clientId) {
      const clientInfo = await this.getClientInfoForBO(entry.clientId);
      if (clientInfo.client) {
        entry.delaiReglement = entry.delaiReglement || clientInfo.client.reglementDelay;
        entry.contractId = entry.contractId || clientInfo.activeContract?.id;
      }
    }
    
    return this.createBatchEntry([entry], userId);
  }

  async getBOWorkflowStatus() {
    const statuses = await this.prisma.bordereau.groupBy({
      by: ['statut'],
      _count: { id: true }
    });
    
    return {
      workflow: statuses.map(s => ({
        status: s.statut,
        count: s._count.id
      })),
      totalActive: statuses.reduce((sum, s) => 
        s.statut !== 'CLOTURE' ? sum + s._count.id : sum, 0
      )
    };
  }
}