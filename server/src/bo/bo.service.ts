import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowNotificationsService } from '../workflow/workflow-notifications.service';
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
  constructor(
    private prisma: PrismaService,
    private workflowNotifications: WorkflowNotificationsService
  ) {}

  async generateReference(type: string, clientId?: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const prefix = type === 'BS' ? 'BS' : type === 'RECLAMATION' ? 'REC' : type === 'CONTRAT' ? 'CTR' : 'DOC';
    
    // Try multiple times to generate unique reference
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        const timestamp = Date.now().toString().slice(-6);
        const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const reference = `${prefix}-${year}${month}${day}-${timestamp}-${randomSuffix}`;
        
        // Check if reference exists
        const existing = await this.prisma.bordereau.findUnique({
          where: { reference }
        });
        
        if (!existing) {
          return reference;
        }
        
        // Wait a bit before retry
        await new Promise(resolve => setTimeout(resolve, 10));
      } catch (error) {
        console.warn(`Reference generation attempt ${attempt + 1} failed:`, error);
      }
    }
    
    // Final fallback with UUID
    const uuid = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${year}${month}${day}-${uuid}`;
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
          
          // Auto-notify SCAN service
          await this.workflowNotifications.notifyWorkflowTransition(
            bordereau.id, 
            'CREATED', 
            'A_SCANNER'
          );
          
          // Audit logging removed to prevent foreign key constraint errors
          // await this.logBOActivity(userId, 'CREATE_ENTRY', {
          //   bordereauId: bordereau.id,
          //   documentType: entry.documentType,
          //   processingTime: Date.now() - (entry.startTime || Date.now())
          // });
          
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
    try {
      // Verify user exists before creating audit log
      const userExists = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true }
      });
      
      if (userExists) {
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
    } catch (error) {
      console.warn('Failed to create audit log:', error);
      // Don't throw error - audit logging is not critical for BO operations
    }
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
    
    // Use actual bordereau data instead of audit logs
    const bordereauxInPeriod = await this.prisma.bordereau.findMany({
      where: {
        createdAt: { gte: startDate }
      },
      include: {
        documents: true
      }
    });
    
    const totalEntries = bordereauxInPeriod.length;
    
    // Calculate processing times based on creation to update time
    const processingTimes = bordereauxInPeriod
      .map(b => b.updatedAt.getTime() - b.createdAt.getTime())
      .filter(time => time > 0);
    
    const avgProcessingTime = processingTimes.length > 0 ? 
      processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length : 0;
    
    // Calculate error rate based on status
    const errorStatuses = ['EN_DIFFICULTE', 'VIREMENT_REJETE'];
    const errors = bordereauxInPeriod.filter(b => errorStatuses.includes(b.statut)).length;
    const errorRate = totalEntries > 0 ? (errors / totalEntries) : 0;
    
    // Calculate entry speed (entries per hour)
    const hoursInPeriod = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    const entrySpeed = hoursInPeriod > 0 ? totalEntries / hoursInPeriod : 0;
    
    // Get recent activities for display
    const activities = bordereauxInPeriod.slice(0, 50).map(b => ({
      id: b.id,
      reference: b.reference,
      statut: b.statut,
      createdAt: b.createdAt,
      client: { name: 'Client' } // Simplified for performance
    }));
    
    return {
      period,
      totalEntries,
      avgProcessingTime: Math.round(avgProcessingTime / 1000), // Convert to seconds
      errorRate: Math.round(errorRate * 10000) / 100,
      entrySpeed: Math.round(entrySpeed * 100) / 100,
      activities
    };
  }

  async getBODashboard(userId: string) {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfHour = new Date(today.getFullYear(), today.getMonth(), today.getDate(), today.getHours());
    
    const [todayEntries, pendingEntries, recentEntries, documentTypes, hourlyEntries] = await Promise.all([
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
      }),
      
      // Get entries from current hour for speed calculation
      this.prisma.bordereau.count({
        where: {
          createdAt: { gte: startOfHour }
        }
      })
    ]);
    
    const performance = await this.getBOPerformance(userId, 'daily');
    
    // Calculate current hour speed
    const currentHourSpeed = hourlyEntries; // entries in current hour
    
    return {
      todayEntries,
      pendingEntries,
      recentEntries,
      statusCounts: documentTypes,
      performance: {
        ...performance,
        entrySpeed: currentHourSpeed // Override with current hour speed
      },
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
      
      // AUTO-POPULATE: Get chargé de compte information
      const chargeDeCompte = client.gestionnaires.length > 0 ? client.gestionnaires[0] : null;
      
      return {
        client: {
          id: client.id,
          name: client.name,
          reglementDelay: client.reglementDelay,
          reclamationDelay: client.reclamationDelay
        },
        activeContract: client.contracts[0] || null,
        gestionnaires: client.gestionnaires,
        chargeDeCompte: chargeDeCompte ? {
          id: chargeDeCompte.id,
          name: chargeDeCompte.fullName,
          role: chargeDeCompte.role
        } : null,
        // AUTO-POPULATE: Contract parameters for BO form
        autoFillData: {
          delaiReglement: client.contracts[0]?.delaiReglement || client.reglementDelay,
          delaiReclamation: client.contracts[0]?.delaiReclamation || client.reclamationDelay,
          contractId: client.contracts[0]?.id || null
        }
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

  async createBatchEntryWithFiles(entries: CreateBOEntryDto[], files: Express.Multer.File[], userId: string) {
    const results: Array<{
      success: boolean;
      bordereau?: any;
      document?: any;
      error?: string;
      fileName: string;
    }> = [];
    
    for (let i = 0; i < entries.length && i < files.length; i++) {
      const entry = entries[i];
      const file = files[i];
      
      try {
        // Create bordereau entry
        const bordereauResult = await this.createBatchEntry([entry], userId);
        
        if (bordereauResult.success || bordereauResult.bordereau) {
          const bordereau = bordereauResult.bordereau || bordereauResult;
          
          // Create document record
          const document = await this.prisma.document.create({
            data: {
              name: file.originalname,
              type: entry.documentType || 'AUTRE',
              path: `/uploads/${file.originalname}`, // In production, use proper file storage
              uploadedById: userId,
              bordereauId: bordereau.id,
              hash: Buffer.from(file.buffer || '').toString('base64').slice(0, 32)
            }
          });
          
          results.push({
            success: true,
            bordereau,
            document,
            fileName: file.originalname
          });
        } else {
          results.push({
            success: false,
            error: 'Failed to create bordereau',
            fileName: file.originalname
          });
        }
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          fileName: file.originalname
        });
      }
    }
    
    return {
      results,
      total: entries.length,
      successCount: results.filter(r => r.success).length,
      errorCount: results.filter(r => !r.success).length
    };
  }

  // Workflow progression methods following cahier de charge
  async progressBordereauWorkflow(bordereauId: string, newStatus: string, userId: string) {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId }
    });
    
    if (!bordereau) {
      throw new Error('Bordereau not found');
    }
    
    // Update bordereau status and relevant dates
    const updateData: any = { statut: newStatus };
    
    switch (newStatus) {
      case 'A_SCANNER':
        // BO → SCAN transition
        break;
      case 'SCAN_EN_COURS':
        updateData.dateDebutScan = new Date();
        break;
      case 'SCANNE':
        updateData.dateFinScan = new Date();
        break;
      case 'A_AFFECTER':
        // Ready for chef d'équipe assignment
        break;
      case 'ASSIGNE':
        updateData.assignedToUserId = userId;
        break;
      case 'EN_COURS':
        // Gestionnaire processing
        break;
      case 'TRAITE':
        updateData.dateReceptionSante = new Date();
        break;
      case 'PRET_VIREMENT':
        // Ready for financial processing
        break;
      case 'VIREMENT_EN_COURS':
        updateData.dateDepotVirement = new Date();
        break;
      case 'VIREMENT_EXECUTE':
        updateData.dateExecutionVirement = new Date();
        break;
      case 'CLOTURE':
        updateData.dateCloture = new Date();
        break;
    }
    
    const updatedBordereau = await this.prisma.bordereau.update({
      where: { id: bordereauId },
      data: updateData
    });
    
    return updatedBordereau;
  }

  // Simulate workflow progression for demo purposes
  async simulateWorkflowProgression() {
    const bordereauxToProgress = await this.prisma.bordereau.findMany({
      where: {
        statut: 'EN_ATTENTE',
        createdAt: {
          lt: new Date(Date.now() - 5 * 60 * 1000) // Older than 5 minutes
        }
      },
      take: 5
    });
    
    const statuses = ['A_SCANNER', 'SCAN_EN_COURS', 'SCANNE', 'A_AFFECTER', 'ASSIGNE', 'EN_COURS', 'TRAITE', 'PRET_VIREMENT'];
    
    for (const bordereau of bordereauxToProgress) {
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      await this.progressBordereauWorkflow(bordereau.id, randomStatus, 'system-user');
    }
    
    return { progressedCount: bordereauxToProgress.length };
  }
}