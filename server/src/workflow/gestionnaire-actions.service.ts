import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowNotificationsService } from './workflow-notifications.service';

export interface ProcessBordereauDto {
  bordereauId: string;
  gestionnaireId: string;
  action: 'TRAITE' | 'REJETE' | 'RETOURNE_CHEF' | 'MIS_EN_INSTANCE';
  notes?: string;
  reason?: string;
}

export interface UpdateBSStatusDto {
  bsId: string;
  status: 'TRAITE' | 'REJETE' | 'EN_COURS';
  notes?: string;
  gestionnaireId: string;
}

@Injectable()
export class GestionnaireActionsService {
  private readonly logger = new Logger(GestionnaireActionsService.name);

  constructor(
    private prisma: PrismaService,
    private workflowNotifications: WorkflowNotificationsService
  ) {}

  async getGestionnaireCorbeille(gestionnaireId: string) {
    // Verify user is gestionnaire
    const gestionnaire = await this.prisma.user.findUnique({
      where: { id: gestionnaireId }
    });

    if (!gestionnaire || gestionnaire.role !== 'GESTIONNAIRE') {
      throw new BadRequestException('User is not a gestionnaire');
    }

    // Get assigned bordereaux
    const assignedBordereaux = await this.prisma.bordereau.findMany({
      where: {
        assignedToUserId: gestionnaireId,
        statut: { in: ['ASSIGNE', 'EN_COURS'] }
      },
      include: {
        client: { select: { name: true } },
        contract: { 
          select: { 
            delaiReglement: true,
            delaiReclamation: true 
          } 
        },
        documents: {
          select: { 
            id: true,
            name: true, 
            type: true,
            status: true 
          }
        },
        BulletinSoin: {
          select: {
            id: true,
            numBs: true,
            etat: true,
            montant: true,
            nomAssure: true,
            nomBeneficiaire: true
          }
        }
      },
      orderBy: { dateReception: 'asc' }
    });

    // Process items with SLA and priority information
    const processedItems = assignedBordereaux.map(bordereau => {
      const slaInfo = this.calculateSLAStatus(bordereau);
      const bsStats = this.calculateBSStats(bordereau.BulletinSoin);
      
      return {
        id: bordereau.id,
        reference: bordereau.reference,
        clientName: bordereau.client?.name || 'Unknown',
        nombreBS: bordereau.nombreBS,
        dateReception: bordereau.dateReception,
        statut: bordereau.statut,
        documentsCount: bordereau.documents?.length || 0,
        bsStats,
        ...slaInfo,
        canProcess: ['ASSIGNE', 'EN_COURS'].includes(bordereau.statut),
        actions: this.getAvailableActions(bordereau.statut),
        gedRef: bordereau.documents[0]?.name || null,
        compagnie: bordereau.client?.name || null,
        societe: bordereau.client?.name || null
      };
    });

    // Get recently processed items (last 7 days)
    const recentlyProcessed = await this.prisma.bordereau.findMany({
      where: {
        assignedToUserId: gestionnaireId,
        statut: { in: ['TRAITE', 'REJETE', 'CLOTURE'] },
        updatedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      include: {
        client: { select: { name: true } }
      },
      orderBy: { updatedAt: 'desc' },
      take: 10
    });

    // Calculate statistics
    const stats = {
      assigned: processedItems.filter(item => item.statut === 'ASSIGNE').length,
      inProgress: processedItems.filter(item => item.statut === 'EN_COURS').length,
      total: processedItems.length,
      overdue: processedItems.filter(item => item.slaStatus === 'OVERDUE').length,
      critical: processedItems.filter(item => item.slaStatus === 'CRITICAL').length,
      completedThisWeek: recentlyProcessed.length
    };

    // Get processed items
    const processedBordereaux = await this.prisma.bordereau.findMany({
      where: {
        assignedToUserId: gestionnaireId,
        statut: { in: ['TRAITE', 'CLOTURE'] }
      },
      include: {
        client: { select: { name: true } },
        BulletinSoin: {
          select: {
            montant: true
          }
        }
      },
      orderBy: { dateReceptionSante: 'desc' }
    });

    // Get returned items
    const returnedItems = await this.prisma.bordereau.findMany({
      where: {
        statut: 'EN_DIFFICULTE',
        currentHandlerId: gestionnaireId
      },
      include: {
        client: { select: { name: true } },
        BulletinSoin: {
          select: {
            montant: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return {
      assignedItems: assignedBordereaux.map(b => ({
        id: b.id,
        reference: b.reference,
        gedRef: `GED-${b.reference}`,
        clientName: b.client?.name,
        compagnie: b.client?.name,
        societe: b.client?.name,
        etat: b.statut,
        dateCreation: b.dateReception,
        totalPec: b.BulletinSoin.reduce((sum, bs) => sum + (bs.montant || 0), 0)
      })),
      processedItems: processedBordereaux.map(b => ({
        id: b.id,
        reference: b.reference,
        gedRef: `GED-${b.reference}`,
        clientName: b.client?.name,
        compagnie: b.client?.name,
        societe: b.client?.name,
        etat: b.statut,
        dateCreation: b.dateReceptionSante || b.dateReception,
        totalPec: b.BulletinSoin.reduce((sum, bs) => sum + (bs.montant || 0), 0)
      })),
      returnedItems: returnedItems.map(b => ({
        id: b.id,
        reference: b.reference,
        gedRef: `GED-${b.reference}`,
        clientName: b.client?.name,
        compagnie: b.client?.name,
        societe: b.client?.name,
        etat: b.statut,
        dateCreation: b.dateReception,
        totalPec: b.BulletinSoin.reduce((sum, bs) => sum + (bs.montant || 0), 0)
      })),
      stats: {
        assigned: assignedBordereaux.length,
        processed: processedBordereaux.length,
        returned: returnedItems.length
      }
    };
  }

  async getGestionnaireGlobalBasket(gestionnaireId: string) {
    // Get all bordereaux assigned to gestionnaire (including completed ones)
    const allBordereaux = await this.prisma.bordereau.findMany({
      where: {
        assignedToUserId: gestionnaireId
      },
      include: {
        client: { select: { name: true } },
        documents: {
          select: { 
            id: true,
            name: true, 
            type: true 
          }
        }
      },
      orderBy: { dateReception: 'desc' }
    });

    // Calculate type breakdown
    const typeBreakdown = {
      prestation: allBordereaux.filter(b => 
        b.documents.some(d => d.type === 'BULLETIN_SOIN' || d.type === 'PRESTATION')
      ).length,
      reclamation: allBordereaux.filter(b => 
        b.documents.some(d => d.type === 'RECLAMATION')
      ).length,
      complement: allBordereaux.filter(b => 
        b.documents.some(d => d.type === 'COMPLEMENT_DOSSIER')
      ).length
    };

    const recentDossiersWithBSData = await Promise.all(
      allBordereaux.slice(0, 10).map(async (b) => {
        const bsData = await this.extractBSData(b.id);
        return {
          id: b.id,
          reference: b.reference,
          gedRef: b.documents[0]?.name || null,
          societe: b.client?.name || null,
          compagnie: b.client?.name || null,
          type: this.getDossierType(b.documents),
          statut: b.statut,
          dateDepot: b.dateReception,
          nom: bsData.nomAssure,
          prenom: bsData.nomBeneficiaire
        };
      })
    );

    return {
      totalDossiers: allBordereaux.length,
      typeBreakdown,
      recentDossiers: recentDossiersWithBSData
    };
  }

  async searchGestionnaireDossiers(gestionnaireId: string, query: string, filters?: any) {
    const whereClause: any = {
      assignedToUserId: gestionnaireId,
      OR: [
        { reference: { contains: query, mode: 'insensitive' } },
        { client: { name: { contains: query, mode: 'insensitive' } } },
        { documents: { some: { name: { contains: query, mode: 'insensitive' } } } },
        { BulletinSoin: { some: { nomAssure: { contains: query, mode: 'insensitive' } } } },
        { BulletinSoin: { some: { nomBeneficiaire: { contains: query, mode: 'insensitive' } } } }
      ]
    };

    if (filters?.societe) {
      whereClause.client = { name: filters.societe };
    }

    const results = await this.prisma.bordereau.findMany({
      where: whereClause,
      include: {
        client: { select: { name: true } },
        documents: {
          select: { 
            id: true,
            name: true, 
            type: true 
          }
        }
      },
      orderBy: { dateReception: 'desc' },
      take: 50
    });

    const resultsWithBSData = await Promise.all(
      results.map(async (b) => {
        const bsData = await this.extractBSData(b.id);
        return {
          id: b.id,
          reference: b.reference,
          gedRef: b.documents[0]?.name || null,
          societe: b.client?.name || null,
          compagnie: b.client?.name || null,
          type: this.getDossierType(b.documents),
          statut: b.statut,
          dateDepot: b.dateReception,
          nom: bsData.nomAssure,
          prenom: bsData.nomBeneficiaire
        };
      })
    );

    return resultsWithBSData;
  }

  async getGestionnaireAIPriorities(gestionnaireId: string) {
    try {
      // Get assigned bordereaux for AI analysis
      const assignedBordereaux = await this.prisma.bordereau.findMany({
        where: {
          assignedToUserId: gestionnaireId,
          statut: { in: ['ASSIGNE', 'EN_COURS'] }
        },
        include: {
          client: { select: { name: true } },
          BulletinSoin: {
            select: {
              id: true,
              numBs: true,
              etat: true,
              montant: true,
              nomAssure: true,
              nomBeneficiaire: true,
              dateCreation: true
            }
          }
        },
        orderBy: { dateReception: 'asc' }
      });

      if (assignedBordereaux.length === 0) {
        return [];
      }

      // Prepare data for AI microservice
      const aiRequestData = assignedBordereaux.map(bordereau => {
        const slaInfo = this.calculateSLAStatus(bordereau);
        const totalAmount = bordereau.BulletinSoin.reduce((sum, bs) => sum + (bs.montant || 0), 0);
        const clientVolume = assignedBordereaux.filter(b => b.clientId === bordereau.clientId).length;
        
        return {
          id: bordereau.id,
          sla_urgency: slaInfo.slaStatus === 'OVERDUE' ? 10 : slaInfo.slaStatus === 'CRITICAL' ? 8 : slaInfo.slaStatus === 'AT_RISK' ? 6 : 3,
          volume: bordereau.nombreBS,
          client_importance: clientVolume >= 5 ? 3 : clientVolume >= 3 ? 2 : 1,
          deadline: new Date(bordereau.dateReception.getTime() + bordereau.delaiReglement * 24 * 60 * 60 * 1000).toISOString(),
          amount: totalAmount,
          complexity: bordereau.nombreBS > 5 ? 3 : bordereau.nombreBS > 2 ? 2 : 1
        };
      });

      // Call AI microservice
      const aiServiceUrl = process.env.AI_MICROSERVICE_URL?.replace(/"/g, '') || 'http://localhost:8002';
      
      // First get auth token
      const authResponse = await fetch(`${aiServiceUrl}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `username=${process.env.AI_SERVICE_USER?.replace(/"/g, '') || 'admin'}&password=${process.env.AI_SERVICE_PASSWORD?.replace(/"/g, '') || 'secret'}`
      });

      if (!authResponse.ok) {
        this.logger.error(`AI auth failed: ${authResponse.status}`);
        throw new Error(`AI authentication failed: ${authResponse.status}`);
      }

      const authResult = await authResponse.json();
      const token = authResult.access_token;

      // Call priorities endpoint with token
      const aiResponse = await fetch(`${aiServiceUrl}/priorities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(aiRequestData)
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        this.logger.error(`AI service error: ${aiResponse.status} - ${errorText}`);
        throw new Error(`AI service returned ${aiResponse.status}`);
      }

      const aiResult = await aiResponse.json();
      const aiPriorities = aiResult.priorities || [];

      if (aiPriorities.length === 0) {
        this.logger.warn('AI service returned no priorities');
        throw new Error('No priorities returned from AI service');
      }

      // Map AI results back to bordereau data
      const prioritizedBordereaux = aiPriorities.map((aiPriority: any) => {
        const bordereau = assignedBordereaux.find(b => b.id === aiPriority.id);
        if (!bordereau) return null;

        const slaInfo = this.calculateSLAStatus(bordereau);
        const totalAmount = bordereau.BulletinSoin.reduce((sum, bs) => sum + (bs.montant || 0), 0);
        const clientVolume = assignedBordereaux.filter(b => b.clientId === bordereau.clientId).length;
        const bsStats = this.calculateBSStats(bordereau.BulletinSoin);
        const completionRate = bsStats.total > 0 ? (bsStats.traites / bsStats.total) * 100 : 0;

        return {
          id: bordereau.id,
          reference: bordereau.reference,
          numBs: bordereau.reference,
          nomAssure: bordereau.BulletinSoin[0]?.nomAssure || 'N/A',
          nomBeneficiaire: bordereau.BulletinSoin[0]?.nomBeneficiaire || 'N/A',
          etat: bordereau.statut,
          dueDate: new Date(bordereau.dateReception.getTime() + bordereau.delaiReglement * 24 * 60 * 60 * 1000),
          dateCreation: bordereau.dateReception,
          totalPec: totalAmount,
          priority_score: aiPriority.priority_score,
          slaStatus: slaInfo.slaStatus,
          clientName: bordereau.client?.name,
          aiReason: this.generateAIReason(slaInfo.slaStatus, clientVolume, totalAmount, completionRate)
        };
      }).filter(Boolean);

      this.logger.log(`✅ AI priorities generated: ${prioritizedBordereaux.length} items`);
      return prioritizedBordereaux;

    } catch (error) {
      this.logger.error(`❌ AI priorities failed: ${error.message}`);
      throw new Error(`AI priorities service unavailable: ${error.message}`);
    }
  }



  private generateAIReason(slaStatus: string, clientVolume: number, amount: number, completionRate: number): string {
    const reasons: string[] = [];
    
    if (slaStatus === 'OVERDUE') reasons.push('SLA dépassé');
    else if (slaStatus === 'CRITICAL') reasons.push('SLA critique');
    else if (slaStatus === 'AT_RISK') reasons.push('SLA à risque');
    
    if (clientVolume >= 5) reasons.push('Client prioritaire');
    if (amount > 1000) reasons.push('Montant élevé');
    if (completionRate > 50) reasons.push('Partiellement traité');
    
    return reasons.length > 0 ? reasons.join(', ') : 'Traitement standard';
  }

  private getDossierType(documents: any[]): string {
    if (documents.some(d => d.type === 'RECLAMATION')) return 'Réclamation';
    if (documents.some(d => d.type === 'COMPLEMENT_DOSSIER')) return 'Complément Dossier';
    return 'Prestation';
  }

  private async extractBSData(bordereauId: string) {
    const bulletinSoins = await this.prisma.bulletinSoin.findMany({
      where: { bordereauId },
      select: {
        nomAssure: true,
        nomBeneficiaire: true
      },
      take: 1
    });
    
    return bulletinSoins[0] || { nomAssure: null, nomBeneficiaire: null };
  }

  async viewBordereauDetails(bordereauId: string, gestionnaireId: string) {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: {
        client: { select: { name: true } },
        BulletinSoin: {
          select: {
            id: true,
            numBs: true,
            etat: true,
            montant: true,
            nomAssure: true,
            nomBeneficiaire: true
          }
        },
        documents: {
          select: {
            id: true,
            name: true,
            type: true,
            path: true
          }
        }
      }
    });

    if (!bordereau) {
      throw new BadRequestException('Bordereau not found');
    }

    // Check if gestionnaire has access
    const hasAccess = bordereau.assignedToUserId === gestionnaireId || 
                     (bordereau.statut === 'EN_DIFFICULTE' && bordereau.currentHandlerId === gestionnaireId);
    
    if (!hasAccess) {
      throw new BadRequestException('Access denied to this bordereau');
    }

    return {
      ...bordereau,
      bsStats: this.calculateBSStats(bordereau.BulletinSoin),
      slaInfo: this.calculateSLAStatus(bordereau)
    };
  }

  async editBordereau(bordereauId: string, gestionnaireId: string, updateData: any) {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId }
    });

    if (!bordereau) {
      throw new BadRequestException('Bordereau not found');
    }

    // Check if gestionnaire has access
    const hasAccess = bordereau.assignedToUserId === gestionnaireId || 
                     (bordereau.statut === 'EN_DIFFICULTE' && bordereau.currentHandlerId === gestionnaireId);
    
    if (!hasAccess) {
      throw new BadRequestException('Access denied to edit this bordereau');
    }

    // Only allow editing certain fields
    const allowedFields = ['notes', 'priority', 'delaiReglement'];
    const filteredData = Object.keys(updateData)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updateData[key];
        return obj;
      }, {});

    const updatedBordereau = await this.prisma.bordereau.update({
      where: { id: bordereauId },
      data: {
        ...filteredData,
        updatedAt: new Date()
      }
    });

    // Log the edit action
    await this.prisma.auditLog.create({
      data: {
        userId: gestionnaireId,
        action: 'BORDEREAU_EDITED',
        details: {
          bordereauId,
          reference: bordereau.reference,
          changes: filteredData
        }
      }
    });

    this.logger.log(`✅ Bordereau ${bordereau.reference} edited by gestionnaire ${gestionnaireId}`);
    
    return {
      success: true,
      bordereau: updatedBordereau,
      message: `Bordereau ${bordereau.reference} mis à jour avec succès`
    };
  }

  async uploadBordereauDocuments(bordereauId: string, gestionnaireId: string, files: Express.Multer.File[]) {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId }
    });

    if (!bordereau) {
      throw new BadRequestException('Bordereau not found');
    }

    // Check if gestionnaire has access
    const hasAccess = bordereau.assignedToUserId === gestionnaireId || 
                     (bordereau.statut === 'EN_DIFFICULTE' && bordereau.currentHandlerId === gestionnaireId);
    
    if (!hasAccess) {
      throw new BadRequestException('Access denied to upload documents for this bordereau');
    }

    const uploadedDocuments: Array<{id: string; name: string; type: string; path: string}> = [];
    const uploadPath = `uploads/bordereaux/${bordereauId}`;
    
    // Ensure upload directory exists
    const fs = require('fs');
    const path = require('path');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    for (const file of files) {
      const fileName = `${Date.now()}-${file.originalname}`;
      const filePath = path.join(uploadPath, fileName);
      
      // Save file to disk
      fs.writeFileSync(filePath, file.buffer);
      
      // Create document record
      const document = await this.prisma.document.create({
        data: {
          name: file.originalname,
          type: this.getDocumentType(file.originalname),
          path: filePath,
          uploadedById: gestionnaireId,
          bordereauId: bordereauId,
          status: 'UPLOADED'
        }
      });
      
      uploadedDocuments.push({
        id: document.id,
        name: document.name,
        type: document.type,
        path: document.path
      });
    }

    // Log the upload action
    await this.prisma.auditLog.create({
      data: {
        userId: gestionnaireId,
        action: 'DOCUMENTS_UPLOADED',
        details: {
          bordereauId,
          reference: bordereau.reference,
          documentsCount: files.length,
          documentNames: files.map(f => f.originalname || 'unknown')
        }
      }
    });

    this.logger.log(`✅ ${files.length} documents uploaded for bordereau ${bordereau.reference}`);
    
    return {
      success: true,
      documents: uploadedDocuments,
      message: `${files.length} document(s) téléchargé(s) avec succès`
    };
  }

  private getDocumentType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    if (ext && ['pdf'].includes(ext)) return 'BULLETIN_SOIN';
    if (ext && ['jpg', 'jpeg', 'png'].includes(ext)) return 'JUSTIFICATIF';
    if (ext && ['doc', 'docx'].includes(ext)) return 'COURRIER';
    return 'AUTRE';
  }

  async processBordereau(dto: ProcessBordereauDto) {
    const { bordereauId, gestionnaireId, action, notes, reason } = dto;
    this.logger.log(`🔄 PROCESS BORDEREAU: ${bordereauId} action ${action} by ${gestionnaireId}`);
    if (reason) this.logger.log(`📝 Reason: ${reason}`);

    // Validate bordereau
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: {
        client: true,
        team: true,
        BulletinSoin: true
      }
    });

    if (!bordereau) {
      this.logger.error(`❌ Bordereau not found: ${bordereauId}`);
      throw new BadRequestException('Bordereau not found');
    }

    this.logger.log(`✅ Bordereau found: ${bordereau.reference} status ${bordereau.statut}`);
    
    // Allow processing if:
    // 1. Assigned to this gestionnaire, OR
    // 2. Returned bordereau (EN_DIFFICULTE) that this gestionnaire can access
    const canProcess = bordereau.assignedToUserId === gestionnaireId || 
                      (bordereau.statut === 'EN_DIFFICULTE' && 
                       (bordereau.currentHandlerId === gestionnaireId || bordereau.currentHandlerId === bordereau.teamId));
    
    if (!canProcess) {
      this.logger.error(`❌ Bordereau not accessible to gestionnaire: ${bordereauId}`);
      this.logger.error(`❌ Details: assignedTo=${bordereau.assignedToUserId}, currentHandler=${bordereau.currentHandlerId}, status=${bordereau.statut}`);
      throw new BadRequestException('Bordereau is not accessible to this gestionnaire');
    }

    if (!['ASSIGNE', 'EN_COURS', 'EN_DIFFICULTE'].includes(bordereau.statut)) {
      this.logger.error(`❌ Invalid status for processing: ${bordereau.statut}`);
      throw new BadRequestException(`Cannot process bordereau with status ${bordereau.statut}`);
    }

    let newStatus: string;
    let notificationData: any = {};

    switch (action) {
      case 'TRAITE':
        this.logger.log(`✅ TRAITE: Processing all BS for ${bordereau.reference}`);
        newStatus = 'TRAITE';
        
        // Auto-process all unprocessed BS
        const unprocessedBS = bordereau.BulletinSoin.filter(bs => bs.etat !== 'TRAITE');
        this.logger.log(`📊 BS Status: ${bordereau.BulletinSoin.length} total, ${unprocessedBS.length} unprocessed`);
        
        if (unprocessedBS.length > 0) {
          this.logger.log(`🔄 Auto-processing ${unprocessedBS.length} unprocessed BS`);
          
          // Mark all unprocessed BS as TRAITE
          await this.prisma.bulletinSoin.updateMany({
            where: {
              id: { in: unprocessedBS.map(bs => bs.id) }
            },
            data: {
              etat: 'TRAITE',
              processedById: gestionnaireId,
              processedAt: new Date()
            }
          });
          
          this.logger.log(`✅ Auto-processed ${unprocessedBS.length} BS`);
        }
        break;

      case 'REJETE':
        this.logger.log(`❌ REJETE: Rejecting ${bordereau.reference}`);
        newStatus = 'REJETE';
        if (!reason) {
          this.logger.error(`❌ No reason provided for rejection`);
          throw new BadRequestException('Reason is required for rejection');
        }
        break;

      case 'RETOURNE_CHEF':
        this.logger.log(`↩️ RETOURNE_CHEF: Returning ${bordereau.reference} to chef`);
        newStatus = 'EN_DIFFICULTE';
        if (!reason) {
          this.logger.error(`❌ No reason provided for return to chef`);
          throw new BadRequestException('Reason is required for returning to chef');
        }
        notificationData = {
          returnReason: reason,
          needsAttention: true
        };
        break;

      case 'MIS_EN_INSTANCE':
        newStatus = 'MIS_EN_INSTANCE';
        break;

      default:
        throw new BadRequestException('Invalid action');
    }

    // Update bordereau
    this.logger.log(`🔄 Updating bordereau ${bordereau.reference} to status ${newStatus}`);
    const updateData: any = {
      statut: newStatus as any
    };

    if (action === 'TRAITE') {
      updateData.dateReceptionSante = new Date();
      updateData.completionRate = 100;
      // If processing a returned bordereau, reassign it to the gestionnaire
      if (bordereau.statut === 'EN_DIFFICULTE') {
        updateData.assignedToUserId = gestionnaireId;
        updateData.currentHandlerId = null;
        this.logger.log(`🔄 Reassigning returned bordereau to gestionnaire ${gestionnaireId}`);
      }
      this.logger.log(`📅 Setting dateReceptionSante and completionRate to 100%`);
    }

    if (action === 'RETOURNE_CHEF') {
      updateData.assignedToUserId = null;
      updateData.currentHandlerId = bordereau.teamId;
      this.logger.log(`🔄 Reassigning to team ${bordereau.teamId}`);
    }

    const updatedBordereau = await this.prisma.bordereau.update({
      where: { id: bordereauId },
      data: updateData
    });
    this.logger.log(`✅ Bordereau ${bordereau.reference} updated successfully`);

    // Create treatment history
    await this.prisma.traitementHistory.create({
      data: {
        bordereauId,
        userId: gestionnaireId,
        action: action,
        fromStatus: bordereau.statut,
        toStatus: newStatus,
        assignedToId: action === 'RETOURNE_CHEF' ? bordereau.teamId : gestionnaireId
      }
    });

    // Send notifications based on action
    await this.sendActionNotifications(bordereau, action, gestionnaireId, { reason, notes, ...notificationData });

    // Trigger workflow notifications
    if (action === 'TRAITE') {
      await this.workflowNotifications.notifyWorkflowTransition(
        bordereauId,
        bordereau.statut,
        'TRAITE',
        gestionnaireId
      );
    }

    // Log action
    await this.prisma.auditLog.create({
      data: {
        userId: gestionnaireId,
        action: `GESTIONNAIRE_${action}`,
        details: {
          bordereauId,
          reference: bordereau.reference,
          action,
          reason,
          notes,
          newStatus
        }
      }
    });

    const result = {
      success: true,
      bordereau: updatedBordereau,
      action,
      newStatus,
      message: this.getActionMessage(action, bordereau.reference)
    };
    this.logger.log(`🎯 PROCESS COMPLETE: ${bordereau.reference} - ${result.message}`);
    return result;
  }

  async updateBSStatus(dto: UpdateBSStatusDto) {
    const { bsId, status, notes, gestionnaireId } = dto;
    this.logger.log(`🔄 UPDATE BS STATUS: ${bsId} to ${status} by ${gestionnaireId}`);

    // Validate BS
    const bs = await this.prisma.bulletinSoin.findUnique({
      where: { id: bsId },
      include: {
        bordereau: {
          include: { client: true }
        }
      }
    });

    if (!bs) {
      this.logger.error(`❌ BS not found: ${bsId}`);
      throw new BadRequestException('Bulletin de soin not found');
    }

    this.logger.log(`✅ BS found: ${bs.numBs} in bordereau ${bs.bordereau.reference}`);
    if (bs.bordereau.assignedToUserId !== gestionnaireId) {
      this.logger.error(`❌ BS not assigned to gestionnaire: ${bsId}`);
      throw new BadRequestException('BS is not assigned to this gestionnaire');
    }

    // Update BS status
    this.logger.log(`🔄 Updating BS ${bs.numBs} from ${bs.etat} to ${status}`);
    const updatedBS = await this.prisma.bulletinSoin.update({
      where: { id: bsId },
      data: {
        etat: status,
        processedById: gestionnaireId,
        processedAt: new Date()
      }
    });
    this.logger.log(`✅ BS ${bs.numBs} updated successfully to ${status}`);

    // Update bordereau progress after BS status change
    await this.updateBordereauProgress(bs.bordereau.id);
    this.logger.log(`📊 Updated bordereau ${bs.bordereau.reference} progress`);

    // Create BS log
    await this.prisma.bSLog.create({
      data: {
        userId: gestionnaireId,
        bsId,
        action: `BS_${status}`,
        timestamp: new Date()
      }
    });

    // Update bordereau progress
    await this.updateBordereauProgress(bs.bordereau.id);

    // Log action
    await this.prisma.auditLog.create({
      data: {
        userId: gestionnaireId,
        action: `BS_${status}`,
        details: {
          bsId,
          numBs: bs.numBs,
          bordereauId: bs.bordereau.id,
          reference: bs.bordereau.reference,
          notes
        }
      }
    });

    const result = {
      success: true,
      bs: updatedBS,
      status,
      message: `BS ${bs.numBs} marked as ${status}`
    };
    this.logger.log(`🎯 BS UPDATE COMPLETE: ${bs.numBs} - ${result.message}`);
    return result;
  }

  async startProcessing(bordereauId: string, gestionnaireId: string) {
    // Validate bordereau
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId }
    });

    if (!bordereau) {
      throw new BadRequestException('Bordereau not found');
    }

    if (bordereau.assignedToUserId !== gestionnaireId) {
      throw new BadRequestException('Bordereau is not assigned to this gestionnaire');
    }

    if (bordereau.statut !== 'ASSIGNE') {
      throw new BadRequestException(`Cannot start processing. Bordereau status is ${bordereau.statut}`);
    }

    // Update status to EN_COURS
    const updatedBordereau = await this.prisma.bordereau.update({
      where: { id: bordereauId },
      data: {
        statut: 'EN_COURS',
        currentHandlerId: gestionnaireId
      }
    });

    // Create history entry
    await this.prisma.traitementHistory.create({
      data: {
        bordereauId,
        userId: gestionnaireId,
        action: 'START_PROCESSING',
        fromStatus: 'ASSIGNE',
        toStatus: 'EN_COURS'
      }
    });

    return {
      success: true,
      bordereau: updatedBordereau,
      message: 'Processing started'
    };
  }

  async getBordereauDetails(bordereauId: string, gestionnaireId: string) {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: {
        client: {
          select: {
            name: true,
            reglementDelay: true,
            reclamationDelay: true
          }
        },
        contract: {
          select: {
            delaiReglement: true,
            delaiReclamation: true,
            escalationThreshold: true
          }
        },
        documents: {
          select: {
            id: true,
            name: true,
            type: true,
            path: true,
            status: true,
            ocrText: true
          }
        },
        BulletinSoin: {
          include: {
            items: true,
            expertises: true
          }
        },
        traitementHistory: {
          include: {
            user: {
              select: { fullName: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!bordereau) {
      throw new BadRequestException('Bordereau not found');
    }

    if (bordereau.assignedToUserId !== gestionnaireId) {
      throw new BadRequestException('Bordereau is not assigned to this gestionnaire');
    }

    // Calculate processing statistics
    const bsStats = this.calculateBSStats(bordereau.BulletinSoin);
    const slaInfo = this.calculateSLAStatus(bordereau);

    return {
      ...bordereau,
      bsStats,
      ...slaInfo,
      processingInstructions: this.getProcessingInstructions(bordereau),
      availableActions: this.getAvailableActions(bordereau.statut)
    };
  }

  async getGestionnaireDashboardStats(gestionnaireId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalAssigned,
      inProgress,
      completedToday,
      completedThisWeek,
      overdue,
      avgProcessingTime
    ] = await Promise.all([
      this.prisma.bordereau.count({
        where: {
          assignedToUserId: gestionnaireId,
          statut: { in: ['ASSIGNE', 'EN_COURS'] }
        }
      }),
      this.prisma.bordereau.count({
        where: {
          assignedToUserId: gestionnaireId,
          statut: 'EN_COURS'
        }
      }),
      this.prisma.bordereau.count({
        where: {
          assignedToUserId: gestionnaireId,
          statut: 'TRAITE',
          updatedAt: { gte: today }
        }
      }),
      this.prisma.bordereau.count({
        where: {
          assignedToUserId: gestionnaireId,
          statut: 'TRAITE',
          updatedAt: { gte: thisWeek }
        }
      }),
      this.prisma.bordereau.count({
        where: {
          assignedToUserId: gestionnaireId,
          statut: { in: ['ASSIGNE', 'EN_COURS'] },
          dateReception: {
            lte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      this.calculateAverageProcessingTime(gestionnaireId)
    ]);

    return {
      totalAssigned,
      inProgress,
      completedToday,
      completedThisWeek,
      overdue,
      avgProcessingTime,
      efficiency: totalAssigned > 0 ? Math.round((completedThisWeek / totalAssigned) * 100) : 0,
      productivity: completedThisWeek
    };
  }

  private calculateBSStats(bulletinSoins: any[]) {
    const total = bulletinSoins.length;
    const traites = bulletinSoins.filter(bs => bs.etat === 'TRAITE').length;
    const rejetes = bulletinSoins.filter(bs => bs.etat === 'REJETE').length;
    const enCours = bulletinSoins.filter(bs => bs.etat === 'EN_COURS').length;
    const nonTraites = total - traites - rejetes - enCours;

    return {
      total,
      traites,
      rejetes,
      enCours,
      nonTraites,
      completionRate: total > 0 ? Math.round((traites / total) * 100) : 0
    };
  }

  private calculateSLAStatus(bordereau: any): {
    slaStatus: 'ON_TIME' | 'AT_RISK' | 'OVERDUE' | 'CRITICAL';
    remainingTime: number;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  } {
    const now = new Date();
    const daysSinceReception = Math.floor(
      (now.getTime() - new Date(bordereau.dateReception).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    const slaLimit = bordereau.delaiReglement || bordereau.contract?.delaiReglement || 30;
    const remainingTime = Math.max(0, (slaLimit - daysSinceReception) * 24);

    let slaStatus: 'ON_TIME' | 'AT_RISK' | 'OVERDUE' | 'CRITICAL';
    let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

    if (daysSinceReception > slaLimit) {
      slaStatus = 'OVERDUE';
      priority = 'URGENT';
    } else if (remainingTime <= 24) {
      slaStatus = 'CRITICAL';
      priority = 'URGENT';
    } else if (remainingTime <= 72) {
      slaStatus = 'AT_RISK';
      priority = 'HIGH';
    } else {
      slaStatus = 'ON_TIME';
      priority = daysSinceReception > slaLimit * 0.5 ? 'MEDIUM' : 'LOW';
    }

    return { slaStatus, remainingTime, priority };
  }

  private getAvailableActions(status: string): string[] {
    switch (status) {
      case 'ASSIGNE':
        return ['START_PROCESSING'];
      case 'EN_COURS':
        return ['TRAITE', 'REJETE', 'RETOURNE_CHEF', 'MIS_EN_INSTANCE'];
      default:
        return [];
    }
  }

  private getProcessingInstructions(bordereau: any): string[] {
    const instructions: string[] = [];
    
    if (bordereau.BulletinSoin.length > 0) {
      instructions.push(`Process ${bordereau.BulletinSoin.length} bulletin(s) de soins`);
    }
    
    if (bordereau.documents.length > 0) {
      instructions.push(`Review ${bordereau.documents.length} document(s)`);
    }
    
    const slaInfo = this.calculateSLAStatus(bordereau);
    if (slaInfo.slaStatus === 'CRITICAL') {
      instructions.push('⚠️ URGENT: SLA deadline approaching');
    } else if (slaInfo.slaStatus === 'OVERDUE') {
      instructions.push('🚨 OVERDUE: SLA deadline exceeded');
    }
    
    return instructions;
  }

  private async sendActionNotifications(bordereau: any, action: string, gestionnaireId: string, data: any) {
    const gestionnaire = await this.prisma.user.findUnique({
      where: { id: gestionnaireId },
      select: { fullName: true }
    });

    switch (action) {
      case 'RETOURNE_CHEF':
        // Notify chef d'équipe
        if (bordereau.teamId) {
          await this.prisma.notification.create({
            data: {
              userId: bordereau.teamId,
              type: 'BORDEREAU_RETURNED',
              title: 'Dossier retourné',
              message: `Le bordereau ${bordereau.reference} a été retourné par ${gestionnaire?.fullName}. Raison: ${data.reason}`,
              data: {
                bordereauId: bordereau.id,
                reference: bordereau.reference,
                returnedBy: gestionnaireId,
                reason: data.reason
              }
            }
          });
        }
        break;

      case 'TRAITE':
        // Notify chef d'équipe of completion
        if (bordereau.teamId) {
          await this.prisma.notification.create({
            data: {
              userId: bordereau.teamId,
              type: 'BORDEREAU_COMPLETED',
              title: 'Dossier traité',
              message: `Le bordereau ${bordereau.reference} a été traité avec succès par ${gestionnaire?.fullName}`,
              data: {
                bordereauId: bordereau.id,
                reference: bordereau.reference,
                completedBy: gestionnaireId
              }
            }
          });
        }
        break;
    }
  }

  private getActionMessage(action: string, reference: string): string {
    switch (action) {
      case 'TRAITE':
        return `Bordereau ${reference} marked as processed`;
      case 'REJETE':
        return `Bordereau ${reference} rejected`;
      case 'RETOURNE_CHEF':
        return `Bordereau ${reference} returned to chef d'équipe`;
      case 'MIS_EN_INSTANCE':
        return `Bordereau ${reference} put on hold`;
      default:
        return `Bordereau ${reference} updated`;
    }
  }

  private async updateBordereauProgress(bordereauId: string) {
    const bulletinSoins = await this.prisma.bulletinSoin.findMany({
      where: { bordereauId }
    });

    const total = bulletinSoins.length;
    const processed = bulletinSoins.filter(bs => ['TRAITE', 'REJETE'].includes(bs.etat)).length;
    const completionRate = total > 0 ? Math.round((processed / total) * 100) : 0;

    await this.prisma.bordereau.update({
      where: { id: bordereauId },
      data: { completionRate }
    });

    return completionRate;
  }

  private async calculateAverageProcessingTime(gestionnaireId: string): Promise<number> {
    const completedBordereaux = await this.prisma.bordereau.findMany({
      where: {
        assignedToUserId: gestionnaireId,
        statut: 'TRAITE',
        dateReceptionSante: { not: null }
      },
      select: {
        dateReception: true,
        dateReceptionSante: true
      }
    });

    if (completedBordereaux.length === 0) return 0;

    const totalTime = completedBordereaux.reduce((sum, bordereau) => {
      const processingTime = bordereau.dateReceptionSante!.getTime() - bordereau.dateReception.getTime();
      return sum + (processingTime / (1000 * 60 * 60 * 24)); // Convert to days
    }, 0);

    return Math.round((totalTime / completedBordereaux.length) * 10) / 10; // Round to 1 decimal
  }

  async bulkUpdateBordereaux(bordereauIds: string[], operation: string, gestionnaireId: string) {
    this.logger.log(`🔄 BULK OPERATION START: ${operation} by user ${gestionnaireId}`);
    this.logger.log(`📋 Bordereau IDs: ${bordereauIds.join(', ')}`);
    
    if (!bordereauIds || bordereauIds.length === 0) {
      this.logger.error('❌ No bordereaux selected');
      throw new BadRequestException('No bordereaux selected');
    }

    // Verify all bordereaux belong to this gestionnaire
    this.logger.log(`🔍 Verifying ${bordereauIds.length} bordereaux belong to gestionnaire`);
    const bordereaux = await this.prisma.bordereau.findMany({
      where: {
        id: { in: bordereauIds },
        OR: [
          { assignedToUserId: gestionnaireId },
          { statut: 'EN_DIFFICULTE', currentHandlerId: { not: null } }
        ]
      },
      include: {
        BulletinSoin: true,
        team: true,
        client: { select: { name: true } }
      }
    });

    this.logger.log(`✅ Found ${bordereaux.length} valid bordereaux`);
    if (bordereaux.length !== bordereauIds.length) {
      this.logger.error(`❌ Mismatch: requested ${bordereauIds.length}, found ${bordereaux.length}`);
      throw new BadRequestException('Some bordereaux are not accessible to you');
    }

    const results: any[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (const bordereau of bordereaux) {
      try {
        this.logger.log(`🔄 Processing bordereau ${bordereau.reference} with operation ${operation}`);
        switch (operation) {
          case 'MARK_PROCESSED':
            this.logger.log(`✅ MARK_PROCESSED: Processing all BS for ${bordereau.reference}`);
            
            // First, mark all unprocessed BS as TRAITE
            const unprocessedBS = bordereau.BulletinSoin.filter(bs => bs.etat !== 'TRAITE');
            this.logger.log(`📊 BS Status: ${bordereau.BulletinSoin.length} total, ${unprocessedBS.length} unprocessed`);
            
            if (unprocessedBS.length > 0) {
              this.logger.log(`🔄 Auto-processing ${unprocessedBS.length} unprocessed BS`);
              
              // Mark all unprocessed BS as TRAITE
              await this.prisma.bulletinSoin.updateMany({
                where: {
                  id: { in: unprocessedBS.map(bs => bs.id) }
                },
                data: {
                  etat: 'TRAITE',
                  processedById: gestionnaireId,
                  processedAt: new Date()
                }
              });
              
              this.logger.log(`✅ Auto-processed ${unprocessedBS.length} BS`);
            }

            // Now mark the bordereau as processed
            await this.prisma.bordereau.update({
              where: { id: bordereau.id },
              data: {
                statut: 'TRAITE',
                dateReceptionSante: new Date(),
                completionRate: 100
              }
            });
            this.logger.log(`✅ Marked ${bordereau.reference} as TRAITE with all BS processed`);
            break;

          case 'RETURN_TO_CHEF':
            this.logger.log(`↩️ RETURN_TO_CHEF: Returning ${bordereau.reference} to team ${bordereau.teamId}`);
            await this.prisma.bordereau.update({
              where: { id: bordereau.id },
              data: {
                statut: 'EN_DIFFICULTE',
                assignedToUserId: null,
                currentHandlerId: bordereau.teamId
              }
            });
            this.logger.log(`✅ Returned ${bordereau.reference} to chef`);
            break;

          case 'ASSIGN_TO_ME':
            this.logger.log(`👤 ASSIGN_TO_ME: Assigning ${bordereau.reference} to ${gestionnaireId}`);
            await this.prisma.bordereau.update({
              where: { id: bordereau.id },
              data: {
                assignedToUserId: gestionnaireId,
                statut: 'ASSIGNE'
              }
            });
            this.logger.log(`✅ Assigned ${bordereau.reference} to gestionnaire`);
            break;

          case 'EXPORT_SELECTED':
            this.logger.log(`📥 EXPORT_SELECTED: Collecting data for ${bordereau.reference}`);
            // For export, we collect the data for CSV generation
            const exportData = {
              reference: bordereau.reference,
              clientName: bordereau.client?.name,
              statut: bordereau.statut,
              dateReception: bordereau.dateReception,
              nombreBS: bordereau.nombreBS,
              assignedTo: bordereau.assignedToUserId,
              completionRate: bordereau.completionRate
            };
            
            results.push({
              bordereauId: bordereau.id,
              reference: bordereau.reference,
              success: true,
              exportData
            });
            successCount++;
            this.logger.log(`✅ Export data collected for ${bordereau.reference}`);
            continue;

          default:
            throw new BadRequestException(`Unknown operation: ${operation}`);
        }

        // Create history entry for non-export operations
        if (!['EXPORT_SELECTED'].includes(operation)) {
          await this.prisma.traitementHistory.create({
            data: {
              bordereauId: bordereau.id,
              userId: gestionnaireId,
              action: `BULK_${operation}`,
              fromStatus: bordereau.statut,
              toStatus: operation === 'MARK_PROCESSED' ? 'TRAITE' : 
                       operation === 'RETURN_TO_CHEF' ? 'EN_DIFFICULTE' : 'ASSIGNE'
            }
          });
        }

        results.push({
          bordereauId: bordereau.id,
          success: true
        });
        successCount++;
        this.logger.log(`✅ Successfully processed ${bordereau.reference}`);

      } catch (error) {
        this.logger.error(`❌ Error processing ${bordereau.reference}: ${error.message}`);
        results.push({
          bordereauId: bordereau.id,
          success: false,
          error: error.message
        });
        errorCount++;
      }
    }
    // Log bulk action
    await this.prisma.auditLog.create({
      data: {
        userId: gestionnaireId,
        action: `BULK_${operation}`,
        details: {
          operation,
          bordereauIds,
          successCount,
          errorCount,
          results
        }
      }
    });

    this.logger.log(`🎯 BULK OPERATION COMPLETE: ${operation}`);
    this.logger.log(`📊 Results: ${successCount} successful, ${errorCount} failed`);
    
    return {
      success: true,
      operation,
      totalProcessed: bordereauIds.length,
      successCount,
      errorCount,
      results,
      message: `Bulk operation completed: ${successCount} successful, ${errorCount} failed`
    };
  }
}