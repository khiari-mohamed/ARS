import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowNotificationsService } from '../workflow/workflow-notifications.service';
import { TeamRoutingService } from '../workflow/team-routing.service';
import { CreateBordereauDto } from './dto/create-bordereau.dto';
import { UpdateBordereauDto } from './dto/update-bordereau.dto';
import { AssignBordereauDto } from './dto/assign-bordereau.dto';
import { Statut } from '@prisma/client';
import { Bordereau, User } from '@prisma/client';
import { Document as PrismaDocument } from '@prisma/client';
import { BordereauResponseDto, StatusColor } from './dto/bordereau-response.dto';
import { BordereauKPI, TeamKPI, UserKPI } from './interfaces/kpi.interface';
import { CreateBSDto, UpdateBSDto, BSStatus } from './dto/bs.dto';
import { AlertsService } from 'src/alerts/alerts.service';
import { Prisma } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';
import { UpdateBulletinSoinDto } from 'src/bulletin-soin/dto/update-bulletin-soin.dto';


type BordereauWithMontant = { montant?: number } & any;

@Injectable()
export class BordereauxService {
  // --- Missing Features Implementation ---
  
  // Workflow progression with notifications
  async progressToNextStage(bordereauId: string): Promise<BordereauResponseDto> {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: { client: true, contract: true }
    });
    
    if (!bordereau) throw new NotFoundException('Bordereau not found');
    
    let nextStatus: Statut;
    const updateData: any = {};
    
    switch (bordereau.statut) {
      case 'A_SCANNER':
        nextStatus = Statut.SCAN_EN_COURS;
        updateData.dateDebutScan = new Date();
        break;
      case 'SCAN_EN_COURS':
        nextStatus = Statut.SCANNE;
        updateData.dateFinScan = new Date();
        break;
      case 'SCANNE':
        nextStatus = Statut.A_AFFECTER;
        break;
      case 'A_AFFECTER':
        nextStatus = Statut.ASSIGNE;
        updateData.dateReceptionSante = new Date();
        break;
      case 'ASSIGNE':
        nextStatus = Statut.EN_COURS;
        break;
      case 'EN_COURS':
        nextStatus = Statut.TRAITE;
        break;
      case 'TRAITE':
        nextStatus = Statut.PRET_VIREMENT;
        break;
      case 'PRET_VIREMENT':
        nextStatus = Statut.VIREMENT_EN_COURS;
        updateData.dateDepotVirement = new Date();
        break;
      case 'VIREMENT_EN_COURS':
        nextStatus = Statut.VIREMENT_EXECUTE;
        updateData.dateExecutionVirement = new Date();
        break;
      case 'VIREMENT_EXECUTE':
        nextStatus = Statut.CLOTURE;
        updateData.dateCloture = new Date();
        break;
      default:
        throw new BadRequestException('Cannot progress from current status');
    }
    
    const updated = await this.prisma.bordereau.update({
      where: { id: bordereauId },
      data: { statut: nextStatus, ...updateData },
      include: { client: true, contract: true }
    });
    
    await this.progressWorkflow(bordereauId, 'STATUS_CHANGED');
    await this.logAction(bordereauId, `PROGRESS_TO_${nextStatus}`);
    
    return BordereauResponseDto.fromEntity(updated);
  }
  
  // Enhanced document management
  async linkDocumentToBordereau(bordereauId: string, documentId: string): Promise<void> {
    await this.prisma.document.update({
      where: { id: documentId },
      data: { bordereauId }
    });
    await this.logAction(bordereauId, 'LINK_DOCUMENT');
  }
  
  // Performance analytics
  async getPerformanceAnalytics(filters: any = {}): Promise<any> {
    const whereClause: any = {};
    if (filters.dateStart) whereClause.dateReception = { gte: new Date(filters.dateStart) };
    if (filters.dateEnd) whereClause.dateReception = { ...whereClause.dateReception, lte: new Date(filters.dateEnd) };
    if (filters.clientId) whereClause.clientId = filters.clientId;
    
    const bordereaux = await this.prisma.bordereau.findMany({
      where: whereClause,
      include: { client: true, contract: true }
    });
    
    const analytics = {
      totalProcessed: bordereaux.length,
      averageProcessingTime: 0,
      slaCompliance: 0,
      statusDistribution: {},
      clientPerformance: {},
      monthlyTrends: []
    };
    
    // Calculate metrics
    let totalDays = 0;
    let slaCompliant = 0;
    
    bordereaux.forEach(b => {
      // Status distribution
      analytics.statusDistribution[b.statut] = (analytics.statusDistribution[b.statut] || 0) + 1;
      
      // Processing time
      if (b.dateCloture) {
        const days = Math.floor((new Date(b.dateCloture).getTime() - new Date(b.dateReception).getTime()) / (1000 * 60 * 60 * 24));
        totalDays += days;
        
        // SLA compliance
        if (days <= b.delaiReglement) slaCompliant++;
      }
      
      // Client performance
      const clientName = b.client?.name || 'Unknown';
      if (!analytics.clientPerformance[clientName]) {
        analytics.clientPerformance[clientName] = { total: 0, completed: 0, avgDays: 0 };
      }
      analytics.clientPerformance[clientName].total++;
      if (b.statut === 'CLOTURE') analytics.clientPerformance[clientName].completed++;
    });
    
    analytics.averageProcessingTime = bordereaux.length > 0 ? Math.round(totalDays / bordereaux.length) : 0;
    analytics.slaCompliance = bordereaux.length > 0 ? Math.round((slaCompliant / bordereaux.length) * 100) : 0;
    
    return analytics;
  }
  
  // Advanced search with OCR content
  async advancedSearch(query: string, filters: any = {}): Promise<any[]> {
    const searchTerms = query.toLowerCase().split(' ');
    
    const bordereaux = await this.prisma.bordereau.findMany({
      where: {
        OR: [
          { reference: { contains: query, mode: 'insensitive' } },
          { client: { name: { contains: query, mode: 'insensitive' } } },
          { documents: { some: {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { ocrText: { contains: query, mode: 'insensitive' } }
            ]
          } } }
        ],
        ...filters
      },
      include: {
        client: true,
        contract: true,
        documents: true,
        BulletinSoin: true
      }
    });
    
    return bordereaux.map(b => ({
      ...BordereauResponseDto.fromEntity(b),
      relevanceScore: this.calculateRelevanceScore(b, searchTerms)
    })).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
  
  private calculateRelevanceScore(bordereau: any, searchTerms: string[]): number {
    let score = 0;
    const text = `${bordereau.reference} ${bordereau.client?.name || ''} ${bordereau.documents?.map(d => d.name).join(' ') || ''}`;
    
    searchTerms.forEach(term => {
      if (text.toLowerCase().includes(term)) score += 1;
    });
    
    return score;
  }
  
  // Batch operations
  async batchUpdateStatus(bordereauIds: string[], newStatus: Statut): Promise<any> {
    type BatchUpdateResult = { id: string; success: boolean; result?: BordereauResponseDto; error?: string };
    const results: BatchUpdateResult[] = [];
    for (const id of bordereauIds) {
      try {
        const updated = await this.update(id, { statut: newStatus as any });
        results.push({ id, success: true, result: updated });
      } catch (error: any) {
        results.push({ id, success: false, error: error.message });
      }
    }
    return {
      successCount: results.filter(r => r.success).length,
      errorCount: results.filter(r => !r.success).length,
      results
    };
  }
  
  // Enhanced notifications
  async sendCustomNotification(bordereauId: string, message: string, recipients: string[]): Promise<void> {
    console.log('📧 Sending custom notification');
    console.log('Bordereau ID:', bordereauId);
    console.log('Message:', message);
    console.log('Recipients:', recipients);
    
    try {
      // Get bordereau details
      const bordereau = await this.prisma.bordereau.findUnique({
        where: { id: bordereauId },
        include: { client: true }
      });
      
      if (!bordereau) {
        throw new Error('Bordereau not found');
      }
      
      // Send notification to each recipient
      for (const recipientId of recipients) {
        if (recipientId) {
          const user = await this.prisma.user.findUnique({ where: { id: recipientId } });
          if (user) {
            // Create in-app notification
            await this.prisma.notification.create({
              data: {
                userId: recipientId,
                type: 'CUSTOM_NOTIFICATION',
                title: 'Notification personnalisée',
                message: message,
                data: {
                  bordereauId,
                  reference: bordereau.reference,
                  clientName: bordereau.client?.name
                },
                read: false
              }
            }).catch(() => console.log('Failed to create notification record'));
            
            console.log(`✅ Notification sent to user ${user.fullName}`);
          }
        }
      }
      
      // Trigger alert for system tracking
      try {
        await this.alertsService.triggerAlert({
          type: 'CUSTOM_NOTIFICATION',
          bsId: bordereauId
        });
      } catch (err) {
        console.log('Alert service not available');
      }
      
      // Log the action
      await this.logAction(bordereauId, 'SEND_NOTIFICATION');
      
      console.log('✅ Custom notification sent successfully');
    } catch (error) {
      console.error('❌ Error sending custom notification:', error);
      throw error;
    }
  }
  
  // --- Seed complaints for AI demo ---
  async seedComplaints(): Promise<any> {
    // Fetch a valid client and user for foreign keys
    const client = await this.prisma.client.findFirst();
    const user = await this.prisma.user.findFirst();
    if (!client || !user) {
      throw new Error('No client or user found. Seed clients and users first.');
    }
    const complaints = [
      { description: "Problème de remboursement pour la facture 12345" },
      { description: "Erreur de montant sur la facture 67890" },
      { description: "Délai de traitement trop long pour la réclamation 54321" },
      { description: "Problème de communication avec le service client" },
      { description: "Erreur de saisie sur mon nom" }
    ];
    const results = [];
    for (const c of complaints) {
      const data: Prisma.ReclamationCreateInput = {
        description: c.description,
        type: 'SERVICE',
        severity: 'MOYENNE',
        status: 'OUVERTE',
        client: { connect: { id: client.id } },
        createdBy: { connect: { id: user.id } },
      };
      // Debug: log the data being sent to Prisma
      console.log('Creating reclamation with data:', data);
      try {
        const result = await this.prisma.reclamation.create({ data });
        results.push();
      } catch (error) {
        console.error('Error creating reclamation:', error);
      }
    }
    return results;
  }

  // AUTO-NOTIFICATION METHODS
  
  /**
   * Notify SCAN team when new bordereau is created by BO
   */
  private async notifyScanTeam(bordereauId: string, reference: string): Promise<void> {
    try {
      const scanUsers = await this.prisma.user.findMany({
        where: { role: 'SCAN_TEAM', active: true }
      });
      
      for (const user of scanUsers) {
        await this.prisma.notification.create({
          data: {
            userId: user.id,
            type: 'NEW_BORDEREAU_SCAN',
            title: 'Nouveau bordereau à scanner',
            message: `Bordereau ${reference} prêt pour numérisation`,
            data: { bordereauId, reference },
            read: false
          }
        }).catch(() => console.log('Failed to create SCAN notification'));
      }
      
      console.log(`📨 Notified ${scanUsers.length} SCAN team members about new bordereau ${reference}`);
    } catch (error) {
      console.error('Error notifying SCAN team:', error);
    }
  }
  
  /**
   * Notify Chef when scan is completed and bordereau needs assignment
   */
  private async notifyChefForAssignment(bordereauId: string, reference: string, clientId: string): Promise<void> {
    try {
      // Get client with gestionnaires (chargé de compte)
      const client = await this.prisma.client.findUnique({
        where: { id: clientId },
        include: { gestionnaires: true }
      });
      
      // Find chef responsible for this client's "chargé de compte"
      let targetChefs: any[] = [];
      
      if (client?.gestionnaires && client.gestionnaires.length > 0) {
        // Find chefs who manage these gestionnaires
        targetChefs = await this.prisma.user.findMany({
          where: { 
            role: 'CHEF_EQUIPE', 
            active: true 
          }
        });
      } else {
        // Fallback: notify all chefs
        targetChefs = await this.prisma.user.findMany({
          where: { role: 'CHEF_EQUIPE', active: true }
        });
      }
      
      for (const chef of targetChefs) {
        await this.prisma.notification.create({
          data: {
            userId: chef.id,
            type: 'BORDEREAU_READY_ASSIGNMENT',
            title: 'Bordereau prêt pour affectation',
            message: `Bordereau ${reference} (${client?.name}) scanné et prêt pour affectation`,
            data: { bordereauId, reference, clientName: client?.name },
            read: false
          }
        }).catch(() => console.log('Failed to create Chef notification'));
      }
      
      console.log(`📨 Notified ${targetChefs.length} Chef(s) about scanned bordereau ${reference}`);
    } catch (error) {
      console.error('Error notifying Chef for assignment:', error);
    }
  }
  
  /**
   * Notify Chef when gestionnaire returns a bordereau
   */
  private async notifyChefOfReturn(bordereauId: string, reference: string, reason: string, gestionnaireNom?: string): Promise<void> {
    try {
      const chefs = await this.prisma.user.findMany({
        where: { role: 'CHEF_EQUIPE', active: true }
      });
      
      for (const chef of chefs) {
        await this.prisma.notification.create({
          data: {
            userId: chef.id,
            type: 'BORDEREAU_RETURNED',
            title: 'Bordereau retourné',
            message: `Bordereau ${reference} retourné par ${gestionnaireNom || 'gestionnaire'}: ${reason}`,
            data: { bordereauId, reference, reason, returnedBy: gestionnaireNom },
            read: false
          }
        }).catch(() => console.log('Failed to create return notification'));
      }
      
      console.log(`📨 Notified ${chefs.length} Chef(s) about returned bordereau ${reference}`);
    } catch (error) {
      console.error('Error notifying Chef of return:', error);
    }
  }
  
  /**
   * Notify Super Admin when auto-assignment fails
   */
  private async notifySuperAdminAssignmentFailure(bordereauId: string, reference: string): Promise<void> {
    try {
      const superAdmins = await this.prisma.user.findMany({
        where: { role: 'SUPER_ADMIN', active: true }
      });
      
      for (const admin of superAdmins) {
        await this.prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'ASSIGNMENT_FAILURE',
            title: 'Échec d\'affectation automatique',
            message: `Impossible d\'affecter automatiquement le bordereau ${reference} - aucun gestionnaire disponible`,
            data: { bordereauId, reference },
            read: false
          }
        }).catch(() => console.log('Failed to create assignment failure notification'));
      }
      
      console.log(`🚨 Notified Super Admins about assignment failure for bordereau ${reference}`);
    } catch (error) {
      console.error('Error notifying Super Admin of assignment failure:', error);
    }
  }
  
  /**
   * Check for team overload and notify Super Admin
   */
  async checkAndNotifyOverload(): Promise<void> {
    try {
      const teams = await this.prisma.user.findMany({
        where: { role: 'CHEF_EQUIPE', active: true },
        include: {
          bordereauxTeam: {
            where: { statut: { notIn: ['CLOTURE', 'TRAITE'] } }
          }
        }
      });
      
      const overloadThreshold = 50; // Configurable threshold
      const overloadedTeams = teams.filter(team => team.bordereauxTeam.length > overloadThreshold);
      
      if (overloadedTeams.length > 0) {
        const superAdmins = await this.prisma.user.findMany({
          where: { role: 'SUPER_ADMIN', active: true }
        });
        
        for (const admin of superAdmins) {
          await this.prisma.notification.create({
            data: {
              userId: admin.id,
              type: 'TEAM_OVERLOAD_ALERT',
              title: 'Alerte surcharge équipe',
              message: `${overloadedTeams.length} équipe(s) en surcharge détectée(s)`,
              data: { 
                overloadedTeams: overloadedTeams.map(t => ({ 
                  id: t.id, 
                  name: t.fullName, 
                  workload: t.bordereauxTeam.length 
                }))
              },
              read: false
            }
          }).catch(() => console.log('Failed to create overload notification'));
        }
        
        console.log(`⚠️ Notified Super Admins about ${overloadedTeams.length} overloaded team(s)`);
      }
    } catch (error) {
      console.error('Error checking team overload:', error);
    }
  }
  
  // --- Seed test data for development/demo ---
  async seedTestData(): Promise<any> {
    // 1. Ensure test users exist
    let user1 = await this.prisma.user.findUnique({ where: { id: 'manager1' } });
    if (!user1) {
      user1 = await this.prisma.user.create({
        data: {
          id: 'manager1',
          email: 'manager1@example.com',
          password: 'password123',
          fullName: 'Manager 1',
          role: 'MANAGER',
        }
      });
    }
    let user2 = await this.prisma.user.findUnique({ where: { id: 'manager2' } });
    if (!user2) {
      user2 = await this.prisma.user.create({
        data: {
          id: 'manager2',
          email: 'manager2@example.com',
          password: 'password123',
          fullName: 'Manager 2',
          role: 'MANAGER',
        }
      });
    }

    // 2. Create test clients
    let client1 = await this.prisma.client.findUnique({ where: { name: 'Test Client 1' } });
    if (!client1) {
    client1 = await this.prisma.client.create({
    data: {
    name: 'Test Client 1',
    reglementDelay: 30,
    reclamationDelay: 15,
    gestionnaires: { connect: [{ id: 'manager1' }] }
    }
    });
    }
    let client2 = await this.prisma.client.findUnique({ where: { name: 'Test Client 2' } });
    if (!client2) {
    client2 = await this.prisma.client.create({
    data: {
    name: 'Test Client 2',
    reglementDelay: 45,
    reclamationDelay: 20,
    gestionnaires: { connect: [{ id: 'manager2' }] }
    }
    });
    }

    // 2. Create test contracts
    const contract1 = await this.prisma.contract.create({
      data: {
        clientId: client1.id,
        clientName: client1.name,
        startDate: new Date('2023-01-01').toISOString(),
        endDate: new Date('2024-12-31').toISOString(),
        delaiReglement: 30,
        delaiReclamation: 15,
        documentPath: '/tmp/doc1.pdf',
        assignedManagerId: 'manager1'
      }
    });
    const contract2 = await this.prisma.contract.create({
      data: {
        clientId: client2.id,
        clientName: client2.name,
        startDate: new Date('2023-01-01').toISOString(),
        endDate: new Date('2024-12-31').toISOString(),
        delaiReglement: 45,
        delaiReclamation: 20,
        documentPath: '/tmp/doc2.pdf',
        assignedManagerId: 'manager2'
      }
    });

    // 3. Create test bordereaux
    const testBordereaux = [
      {
        reference: 'BORD-2023-001',
        dateReception: new Date('2023-01-15').toISOString(),
        clientId: client1.id,
        contractId: contract1.id,
        delaiReglement: 30,
        nombreBS: 10
      },
      {
        reference: 'BORD-2023-002',
        dateReception: new Date('2023-02-01').toISOString(),
        clientId: client2.id,
        contractId: contract2.id,
        delaiReglement: 45,
        nombreBS: 15
      }
    ];
    const results: any[] = [];
    for (const tb of testBordereaux) {
      const existing = await this.prisma.bordereau.findUnique({ where: { reference: tb.reference } });
      if (existing) {
        results.push({ message: 'Already exists', data: tb });
        continue;
      }
      const data: CreateBordereauDto = {
        reference: tb.reference,
        dateReception: tb.dateReception,
        clientId: tb.clientId,
        contractId: tb.contractId,
        delaiReglement: tb.delaiReglement,
        nombreBS: tb.nombreBS
      };
      try {
        results.push(await this.create(data));
      } catch (e) {
        results.push({ error: e.message, data });
      }
    }
    return results;
  }
  private readonly logger = new Logger(BordereauxService.name);
  auditLogService: any;
  constructor(
    private readonly prisma: PrismaService, 
    private readonly alertsService: AlertsService,
    private readonly workflowNotifications: WorkflowNotificationsService,
    private readonly teamRouting: TeamRoutingService
  ) {}


  async create(createBordereauDto: CreateBordereauDto): Promise<BordereauResponseDto> {
    console.log('📝 CREATE BORDEREAU - Received payload:', JSON.stringify(createBordereauDto, null, 2));
    
    // Build data object, only include fields if defined
    let {
      reference,
      dateReception,
      clientId,
      contractId,
      dateDebutScan,
      dateFinScan,
      dateReceptionSante,
      dateCloture,
      dateDepotVirement,
      dateExecutionVirement,
      delaiReglement,
      statut,
      nombreBS,
      createdBy, // This field doesn't exist in schema, will be ignored
    } = createBordereauDto;

    // Validate clientId and get client with gestionnaires
    console.log('🔍 Validating client:', clientId);
    const client = await this.prisma.client.findUnique({ 
      where: { id: clientId },
      include: { gestionnaires: true }
    });
    if (!client) {
      console.error('❌ Client not found:', clientId);
      throw new BadRequestException('Invalid clientId');
    }
    console.log('✅ Client found:', client.name);

    // Validate contractId if provided
    if (contractId) {
      console.log('🔍 Validating contract:', contractId);
      const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
      if (!contract) {
        console.error('❌ Contract not found:', contractId);
        throw new BadRequestException('Invalid contractId');
      }
      console.log('✅ Contract found:', contract.clientName);
    }

    // --- AUTO-LINK TO ACTIVE CONTRACT IF contractId NOT PROVIDED ---
    if (!contractId) {
      // Find the active contract for the client (startDate <= today <= endDate)
      const today = new Date();
      const activeContract = await this.prisma.contract.findFirst({
        where: {
          clientId,
          startDate: { lte: today },
          endDate: { gte: today },
        },
        orderBy: { startDate: 'desc' },
      });
      if (activeContract) {
        contractId = activeContract.id;
        // AUTO-POPULATE CLIENT PARAMETERS: Use contract's delaiReglement if not provided
        if (!delaiReglement && typeof activeContract.delaiReglement === 'number') {
          delaiReglement = activeContract.delaiReglement;
        }
      }
    }
    
    // AUTO-POPULATE CLIENT PARAMETERS: Use client's reglementDelay if still not set
    if (!delaiReglement && client.reglementDelay) {
      delaiReglement = client.reglementDelay;
    }
    // -------------------------------------------------------------

    // Business rule: unique reference per client
    console.log('🔍 Checking for existing bordereau with reference:', reference, 'for client:', clientId);
    const existing = await this.prisma.bordereau.findFirst({ where: { reference, clientId } });
    if (existing) {
      console.error('❌ Duplicate reference found:', reference);
      throw new BadRequestException('A bordereau with this reference already exists for this client.');
    }
    console.log('✅ Reference is unique');

    // DYNAMIC STATUS: Start with A_SCANNER (ready for scan) instead of EN_ATTENTE
    const initialStatus = statut || Statut.A_SCANNER;

    // Helper function to safely convert date strings to Date objects
    const parseDate = (dateStr: string): Date => {
      if (!dateStr) throw new BadRequestException('Date is required');
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        throw new BadRequestException(`Invalid date format: ${dateStr}`);
      }
      return date;
    };

    const data: any = {
      reference,
      dateReception: parseDate(dateReception),
      clientId,
      contractId,
      delaiReglement,
      nombreBS,
      statut: initialStatus,
    };
    // Note: createdBy is not a field in the schema, skip it
    if (dateDebutScan) data.dateDebutScan = parseDate(dateDebutScan);
    if (dateFinScan) data.dateFinScan = parseDate(dateFinScan);
    if (dateReceptionSante) data.dateReceptionSante = parseDate(dateReceptionSante);
    if (dateCloture) data.dateCloture = parseDate(dateCloture);
    if (dateDepotVirement) data.dateDepotVirement = parseDate(dateDepotVirement);
    if (dateExecutionVirement) data.dateExecutionVirement = parseDate(dateExecutionVirement);
    
    console.log('💾 Creating bordereau with data:', JSON.stringify(data, null, 2));

    try {
      const bordereau = await this.prisma.bordereau.create({
        data,
        include: {
          client: true,
          contract: true,
        },
      });
      console.log('✅ Bordereau created successfully:', bordereau.reference);
    
      // AUTO-NOTIFICATION: BO → SCAN team notification
      await this.notifyScanTeam(bordereau.id, bordereau.reference);
      
      // Trigger workflow progression
      await this.progressWorkflow(bordereau.id, 'CREATED');
      
      await this.logAction(bordereau.id, 'CREATE_BORDEREAU');
      console.log('🎉 Bordereau creation completed successfully');
      return BordereauResponseDto.fromEntity(bordereau);
    } catch (error) {
      console.error('❌ Error creating bordereau:', error);
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  }
  
  async findAll(filters: any = {}): Promise<BordereauResponseDto[] | { items: BordereauResponseDto[]; total: number }> {
    console.log('📡 Backend: Received filters:', JSON.stringify(filters, null, 2));
    // Build Prisma where clause based on filters
    const where: any = {};
    if (filters.teamId) where.teamId = filters.teamId;
    if (filters.type) where.type = filters.type;
    if (filters.performance) where.performance = filters.performance;
    if (filters.clientId) where.clientId = filters.clientId;
    if (filters.contractId) where.contractId = filters.contractId;
    // Handle statut filter (can be statut or statut[])
    const statutFilter = filters.statut || filters['statut[]'];
    if (statutFilter) {
      console.log('🔍 Backend: Filtering by statut:', statutFilter);
      if (Array.isArray(statutFilter)) {
        where.statut = { in: statutFilter };
        console.log('🔍 Backend: Applied statut IN filter:', statutFilter);
      } else {
        where.statut = statutFilter;
        console.log('🔍 Backend: Applied statut equals filter:', statutFilter);
      }
    }
    if (filters.sla) where.statusColor = filters.sla;
    if (filters.reference) where.reference = { contains: filters.reference, mode: 'insensitive' };
    if (filters.search) {
      where.OR = [
        { reference: { contains: filters.search, mode: 'insensitive' } },
        { client: { name: { contains: filters.search, mode: 'insensitive' } } }
      ];
    }
    if (filters.dateStart || filters.dateEnd) {
      where.dateReception = {};
      if (filters.dateStart) where.dateReception.gte = new Date(filters.dateStart);
      if (filters.dateEnd) where.dateReception.lte = new Date(filters.dateEnd);
    }
    if (typeof filters.archived === 'boolean') {
      where.archived = filters.archived;
      console.log('🗄️ Backend: Filtering by archived:', filters.archived);
    } else if (filters.archived === 'false') {
      where.archived = false;
      console.log('🗄️ Backend: Filtering by archived (string):', false);
    } else if (filters.archived === 'true') {
      where.archived = true;
      console.log('🗄️ Backend: Filtering by archived (string):', true);
    }
    if (filters.assigned === false) where.assignedToUserId = null;
    if (filters.overdue === true) {
      // Calculate overdue bordereaux
      const today = new Date();
      // This is a simplified approach - in production you might want to use raw SQL
      where.dateReception = {
        ...where.dateReception,
        lt: new Date(today.getTime() - (filters.delaiReglement || 30) * 24 * 60 * 60 * 1000)
      };
    }
    
    // Handle pagination
    const page = filters.page ? parseInt(filters.page) : 1;
    const pageSize = filters.pageSize ? parseInt(filters.pageSize) : 25;
    const skip = (page - 1) * pageSize;
    
    // Handle sorting
    const orderBy: any = {};
    if (filters.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder || 'asc';
    } else {
      orderBy.dateReception = 'desc'; // Default sort
    }
    
    // If pagination is requested, return paginated results
    if (filters.page || filters.pageSize) {
      const [bordereaux, total] = await Promise.all([
        this.prisma.bordereau.findMany({
          where,
          include: {
            client: true,
            contract: true,
          },
          orderBy,
          skip,
          take: pageSize,
        }),
        this.prisma.bordereau.count({ where })
      ]);
      
      return {
        items: bordereaux.map(bordereau => BordereauResponseDto.fromEntity(bordereau)),
        total
      };
    }
    
    // Otherwise return all results
    console.log('📡 Backend: Final where clause:', JSON.stringify(where, null, 2));
    const bordereaux = await this.prisma.bordereau.findMany({
      where,
      include: {
        client: true,
        contract: true,
      },
      orderBy,
    });
    console.log('📊 Backend: Found', bordereaux.length, 'bordereaux');
    console.log('📊 Backend: Sample results:', bordereaux.slice(0, 2).map(b => `${b.reference}: ${b.statut} (archived: ${b.archived})`));
    return bordereaux.map(bordereau => BordereauResponseDto.fromEntity(bordereau));
  }

  // Archive (soft-delete) a bordereau
  async archiveBordereau(id: string): Promise<BordereauResponseDto> {
    console.log('🗄️ ARCHIVING BORDEREAU:', id);
    
    const bordereau = await this.prisma.bordereau.update({
      where: { id },
      data: { archived: true },
      include: { client: true, contract: true },
    });
    
    console.log('✅ BORDEREAU ARCHIVED SUCCESSFULLY:', bordereau.reference);
    console.log('Archived status:', bordereau.archived);
    
    await this.logAction(id, 'ARCHIVE_BORDEREAU');
    return BordereauResponseDto.fromEntity(bordereau);
  }

  // Restore a bordereau from archive
  async restoreBordereau(id: string): Promise<BordereauResponseDto> {
    const bordereau = await this.prisma.bordereau.update({
      where: { id },
      data: { archived: false },
      include: { client: true, contract: true },
    });
    await this.logAction(id, 'RESTORE_BORDEREAU');
    return BordereauResponseDto.fromEntity(bordereau);
  }

 // Ensure alerts are triggered in the updateBordereauStatus method
async updateBordereauStatus(bordereauId: string): Promise<void> {
  const bordereau = await this.prisma.bordereau.findUnique({
    where: { id: bordereauId },
    include: { contract: true },
  });
  if (!bordereau) {
    throw new NotFoundException(`Bordereau with ID ${bordereauId} not found`);
  }

  const today = new Date();
  const daysElapsed = Math.floor((today.getTime() - new Date(bordereau.dateReception).getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = bordereau.delaiReglement - daysElapsed;

  // Check for SLA breach
  if (daysRemaining <= 0) {
    await this.alertsService.triggerAlert({
      type: 'SLA_BREACH',
      bsId: bordereauId,
    });
  }

  // Check for team overload using contract escalationThreshold if available
  let overloadThreshold = 50;
  if (bordereau.contract && typeof bordereau.contract.escalationThreshold === 'number') {
    overloadThreshold = bordereau.contract.escalationThreshold;
  }
  const teamCount = await this.prisma.bordereau.count({ where: { teamId: bordereau.teamId, statut: { not: 'CLOTURE' } } });
  if (teamCount > overloadThreshold) {
    await this.alertsService.triggerAlert({
      type: 'TEAM_OVERLOAD',
      bsId: bordereauId,
    });
  }
}


  async findOne(id: string): Promise<BordereauResponseDto> {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id },
      include: {
        client: true,
        contract: true,
        virement: true,
        documents: true,
        team: true,
        currentHandler: true,
        traitementHistory: { include: { user: true, assignedTo: true } },
      },
    });
    
    if (!bordereau) throw new NotFoundException('Bordereau not found');
    return BordereauResponseDto.fromEntity(bordereau);
  }

  async update(id: string, updateBordereauDto: UpdateBordereauDto): Promise<BordereauResponseDto> {
    // Build data object, only include fields if defined
    const {
      reference,
      dateReception,
      clientId,
      contractId,
      dateDebutScan,
      dateFinScan,
      dateReceptionSante,
      dateCloture,
      dateDepotVirement,
      dateExecutionVirement,
      delaiReglement,
      statut,
      nombreBS,
    } = updateBordereauDto;
    // Helper function to safely convert date strings to Date objects
    const parseDate = (dateStr: string): Date => {
      if (!dateStr) throw new BadRequestException('Date is required');
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        throw new BadRequestException(`Invalid date format: ${dateStr}`);
      }
      return date;
    };

    const data: any = {};
    if (reference !== undefined) data.reference = reference;
    if (dateReception !== undefined) data.dateReception = parseDate(dateReception);
    if (clientId !== undefined) data.clientId = clientId;
    if (contractId !== undefined) data.contractId = contractId;
    if (dateDebutScan !== undefined) data.dateDebutScan = parseDate(dateDebutScan);
    if (dateFinScan !== undefined) data.dateFinScan = parseDate(dateFinScan);
    if (dateReceptionSante !== undefined) data.dateReceptionSante = parseDate(dateReceptionSante);
    if (dateCloture !== undefined) data.dateCloture = parseDate(dateCloture);
    if (dateDepotVirement !== undefined) data.dateDepotVirement = parseDate(dateDepotVirement);
    if (dateExecutionVirement !== undefined) data.dateExecutionVirement = parseDate(dateExecutionVirement);
    if (delaiReglement !== undefined) data.delaiReglement = delaiReglement;
    if (statut !== undefined) data.statut = statut;
    if (nombreBS !== undefined) data.nombreBS = nombreBS;
    
    const bordereau = await this.prisma.bordereau.update({
    where: { id },
    data,
    include: { client: true, contract: true },
  });
  await this.logAction(id, 'UPDATE_BORDEREAU');
  return BordereauResponseDto.fromEntity(bordereau);
}

  async remove(id: string): Promise<BordereauResponseDto> {
    const bordereau = await this.prisma.bordereau.delete({
      where: { id },
      include: {
        client: true,
        contract: true,
      },
    });
    
    return BordereauResponseDto.fromEntity(bordereau);
  }
 async assignBordereau(assignDto: AssignBordereauDto): Promise<BordereauResponseDto> {
    const { bordereauId, assignedToUserId, teamId, notes } = assignDto;
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
    });
    
    if (!bordereau) {
      throw new NotFoundException(`Bordereau with ID ${bordereauId} not found`);
    }
    if (assignedToUserId) {
      const user = await this.prisma.user.findUnique({
        where: { id: assignedToUserId },
      });
      
      if (!user) {
        throw new NotFoundException(`User with ID ${assignedToUserId} not found`);
      }
      
      this.logger.log(`Assigned bordereau ${bordereauId} to user ${assignedToUserId}`);
    }
    
    // Update the bordereau status to ASSIGNE
    const updateData: any = {
      statut: Statut.ASSIGNE,
    };
    if (assignedToUserId) updateData.assignedToUserId = assignedToUserId;
    if (teamId) updateData.teamId = teamId;

    const updatedBordereau = await this.prisma.bordereau.update({
      where: { id: bordereauId },
      data: updateData,
      include: {
        client: true,
        contract: true,
      },
    });
    
    await this.progressWorkflow(bordereauId, 'ASSIGNED');
    await this.logAction(bordereauId, 'ASSIGN_BORDEREAU');
    return BordereauResponseDto.fromEntity(updatedBordereau);
  }
  
  /**
   * Auto-assign a bordereau based on workload and availability
   */
  private async autoAssignBordereau(bordereauId: string): Promise<void> {
    try {
      // Don't auto-assign immediately - let it go through scan first
      this.logger.log(`Bordereau ${bordereauId} created, will be assigned after scan`);
    } catch (error) {
      this.logger.error(`Error in auto-assignment logic for bordereau ${bordereauId}: ${error.message}`);
    }
  }
  
  /**
   * Get bordereaux that are approaching their deadline
   */
  async getApproachingDeadlines(): Promise<BordereauResponseDto[]> {
  const bordereaux = await this.prisma.bordereau.findMany({
    where: {
      statut: {
        notIn: [Statut.CLOTURE, Statut.TRAITE],
      },
    },
    include: {
      client: true,
      contract: true,
    },
  });
  // Filter bordereaux that are approaching deadline (3 days or less)
  const today = new Date();
  return bordereaux.filter(bordereau => {
    const receptionDate = new Date(bordereau.dateReception);
    const daysElapsed = Math.floor((today.getTime() - receptionDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = bordereau.delaiReglement - daysElapsed;
    return daysRemaining <= 3 && daysRemaining > 0;
  }).map(bordereau => BordereauResponseDto.fromEntity(bordereau));
}
  


  /**
   * Get bordereaux that are overdue
   */
 async getOverdueBordereaux(): Promise<BordereauResponseDto[]> {
  const bordereaux = await this.prisma.bordereau.findMany({
    where: {
      statut: {
        notIn: [Statut.CLOTURE, Statut.TRAITE],
      },
    },
    include: {
      client: true,
      contract: true,
    },
  });
  // Filter bordereaux that are overdue
  const today = new Date();
  return bordereaux.filter(bordereau => {
    const receptionDate = new Date(bordereau.dateReception);
    const daysElapsed = Math.floor((today.getTime() - receptionDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = bordereau.delaiReglement - daysElapsed;
    return daysRemaining <= 0;
  }).map(bordereau => BordereauResponseDto.fromEntity(bordereau));
}
  
  /**
   * Get KPIs for all bordereaux
   */
 async getBordereauKPIs(): Promise<BordereauKPI[]> {
    const bordereaux = await this.prisma.bordereau.findMany();
    const today = new Date();

    // Calculate global KPIs
    const statusCounts: Record<string, number> = {};
    let overdueCount = 0;
    let totalScanDuration = 0;
    let scanCount = 0;
    let totalProcessingDuration = 0;
    let processingCount = 0;

    const kpis = bordereaux.map(bordereau => {
      const receptionDate = new Date(bordereau.dateReception);
      const daysElapsed = Math.floor((today.getTime() - receptionDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysRemaining = bordereau.delaiReglement - daysElapsed;

      let scanDuration: number | null = null;
      if (bordereau.dateDebutScan && bordereau.dateFinScan) {
        scanDuration = Math.floor(
          (new Date(bordereau.dateFinScan).getTime() - new Date(bordereau.dateDebutScan).getTime()) /
          (1000 * 60 * 60 * 24)
        );
        totalScanDuration += scanDuration;
        scanCount++;
      }

      let totalDuration: number | null = null;
      if (bordereau.dateCloture) {
        totalDuration = Math.floor(
          (new Date(bordereau.dateCloture).getTime() - receptionDate.getTime()) /
          (1000 * 60 * 60 * 24)
        );
        totalProcessingDuration += totalDuration;
        processingCount++;
      }

      let statusColor: 'GREEN' | 'ORANGE' | 'RED' = 'GREEN';
      if (daysRemaining <= 0) statusColor = 'RED';
      else if (daysRemaining <= 3) statusColor = 'ORANGE';

      statusCounts[bordereau.statut] = (statusCounts[bordereau.statut] || 0) + 1;
      if (daysRemaining <= 0) overdueCount++;

      return {
        id: bordereau.id,
        reference: bordereau.reference,
        statut: bordereau.statut,
        daysElapsed,
        daysRemaining,
        scanDuration,
        totalDuration,
        isOverdue: daysRemaining <= 0,
        statusColor,
      };
    });

    // Add a summary KPI object at the end (non-breaking, optional for consumers)
    kpis.push({
      id: 'SUMMARY',
      reference: 'SUMMARY',
      statut: 'ALL',
      daysElapsed: bordereaux.length,
      daysRemaining: overdueCount,
      scanDuration: scanCount ? Math.round(totalScanDuration / scanCount) : null,
      totalDuration: processingCount ? Math.round(totalProcessingDuration / processingCount) : null,
      isOverdue: overdueCount,
      statusColor: 'GREEN',
      byStatus: statusCounts,
    } as any);

    return kpis;
  }

  // --- Export Functionality ---
  async exportCSV() {
    const result = await this.findAll();
    const bordereaux = Array.isArray(result) ? result : result.items;
    const fields = ['id', 'reference', 'statut', 'dateReception', 'dateCloture', 'delaiReglement', 'nombreBS'];
    const csvRows = [fields.join(',')];
    for (const b of bordereaux) {
      csvRows.push(fields.map(f => (b[f] !== undefined ? '"' + String(b[f]).replace(/"/g, '""') + '"' : '')).join(','));
    }
    return csvRows.join('\n');
  }

  async exportExcel() {
    const result = await this.findAll();
    const bordereaux = Array.isArray(result) ? result : result.items;
    const fields = ['id', 'reference', 'statut', 'dateReception', 'dateCloture', 'delaiReglement', 'nombreBS'];
    const rows = [fields];
    for (const b of bordereaux) {
      rows.push(fields.map(f => b[f] !== undefined ? b[f] : ''));
    }
    const content = rows.map(r => r.join('\t')).join('\n');
    return Buffer.from(content, 'utf-8');
  }

  async exportPDF() {
    const result = await this.findAll();
    const bordereaux = Array.isArray(result) ? result : result.items;
    let content = 'Bordereaux List\n\n';
    for (const b of bordereaux) {
      content += `ID: ${b.id} | Ref: ${b.reference} | Statut: ${b.statut} | Date Reception: ${b.dateReception}\n`;
    }
    return Buffer.from(content, 'utf-8');
  }

  async exportBordereauPDF(bordereauId: string): Promise<Buffer> {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: {
        client: true,
        contract: true,
        documents: true,
        BulletinSoin: true
      }
    });

    if (!bordereau) {
      throw new NotFoundException('Bordereau not found');
    }

    // Generate PDF content
    const pdfContent = `
BORDEREAU DETAILS
=================

Référence: ${bordereau.reference}
Client: ${bordereau.client?.name || 'N/A'}
Statut: ${bordereau.statut}
Date de réception: ${new Date(bordereau.dateReception).toLocaleDateString('fr-FR')}
Délai de règlement: ${bordereau.delaiReglement} jours
Nombre de BS: ${bordereau.nombreBS}

CONTRAT
-------
Client: ${bordereau.contract?.clientName || 'N/A'}
Délai règlement: ${bordereau.contract?.delaiReglement || 'N/A'} jours
Délai réclamation: ${bordereau.contract?.delaiReclamation || 'N/A'} jours

DOCUMENTS
---------
${bordereau.documents?.map(doc => `- ${doc.name} (${doc.type})`).join('\n') || 'Aucun document'}

BULLETINS DE SOIN
-----------------
Nombre total: ${bordereau.BulletinSoin?.length || 0}
${bordereau.BulletinSoin?.slice(0, 5).map(bs => `- BS ${bs.numBs}: ${bs.etat} - ${bs.nomAssure}`).join('\n') || 'Aucun bulletin'}
${bordereau.BulletinSoin?.length > 5 ? `\n... et ${bordereau.BulletinSoin.length - 5} autres` : ''}

Généré le: ${new Date().toLocaleString('fr-FR')}
    `;

    return Buffer.from(pdfContent, 'utf-8');
  }
  /**
   * Update bordereau status when scan starts
   */
  async startScan(id: string): Promise<BordereauResponseDto> {
    const bordereau = await this.prisma.bordereau.update({
      where: { id },
      data: {
        statut: Statut.SCAN_EN_COURS,
        dateDebutScan: new Date(),
      },
      include: {
        client: true,
        contract: true,
      },
    });
    
    await this.progressWorkflow(id, 'SCAN_STARTED');
    await this.logAction(id, 'START_SCAN');
    return BordereauResponseDto.fromEntity(bordereau);
  }
  
  /**
   * Update bordereau status when scan completes
   */
  async completeScan(id: string): Promise<BordereauResponseDto> {
    const bordereau = await this.prisma.bordereau.update({
      where: { id },
      data: {
        statut: Statut.SCANNE,
        dateFinScan: new Date(),
      },
      include: {
        client: { include: { gestionnaires: true } },
        contract: true,
      },
    });
    
    // Auto-progress to assignment stage
    await this.progressWorkflow(id, 'SCAN_COMPLETED');
    
    // Notify chef d'équipe for assignment
    await this.notifyChefForAssignment(id, bordereau.reference, bordereau.client.id);
    
    await this.logAction(id, 'COMPLETE_SCAN');
    return BordereauResponseDto.fromEntity(bordereau);
  }
  
  /**
   * Mark a bordereau as processed
   */
  async markAsProcessed(id: string): Promise<BordereauResponseDto> {
    const bordereau = await this.prisma.bordereau.update({
      where: { id },
      data: {
        statut: Statut.TRAITE,
      },
      include: {
        client: true,
        contract: true,
      },
    });
    
    await this.progressWorkflow(id, 'PROCESSING_COMPLETED');
    await this.logAction(id, 'MARK_PROCESSED');
    return BordereauResponseDto.fromEntity(bordereau);
  }
  
  /**
   * Close a bordereau (final state)
   */
  async closeBordereau(id: string): Promise<BordereauResponseDto> {
    const bordereau = await this.prisma.bordereau.update({
      where: { id },
      data: {
        statut: Statut.CLOTURE,
        dateCloture: new Date(),
      },
      include: {
        client: true,
        contract: true,
      },
    });
    
    return BordereauResponseDto.fromEntity(bordereau);
  }

  // --- BS (BulletinSoin) Management ---
  async getBSList(bordereauId: string) {
    return this.prisma.bulletinSoin.findMany({
      where: { bordereauId },
      include: { owner: true },
    });
  }

  async createBS(bordereauId: string, dto: CreateBSDto) {
    const bs = await this.prisma.bulletinSoin.create({
      data: {
        bordereauId,
        numBs: dto.numBs,
        etat: dto.etat,
        ownerId: dto.ownerId,
        processedAt: dto.processedAt,
        // documentId: dto.documentId, // Removed because it's not a valid property
        codeAssure: dto.codeAssure,
        nomAssure: dto.nomAssure,
        nomBeneficiaire: dto.nomBeneficiaire,
        nomSociete: dto.nomSociete,
        matricule: dto.matricule,
        dateSoin: dto.dateSoin,
        montant: dto.montant,
        acte: dto.acte,
        nomPrestation: dto.nomPrestation,
        nomBordereau: dto.nomBordereau,
        lien: dto.lien,
        dateCreation: dto.dateCreation,
        dateMaladie: dto.dateMaladie,
        totalPec: dto.totalPec,
        observationGlobal: dto.observationGlobal,
      },
      include: { owner: true },
    });
    await this.updateBordereauStatusFromBS(bordereauId);
    return bs;
  }

  async updateBS(bsId: string, dto: UpdateBulletinSoinDto) {
  // Validate BS exists
  const existing = await this.prisma.bulletinSoin.findUnique({ where: { id: bsId } });
  if (!existing) throw new Error('BS not found.');
  // Only allow valid status transitions
  if (dto.etat && !['IN_PROGRESS', 'VALIDATED', 'REJECTED'].includes(dto.etat)) {
    throw new Error('Invalid BS status transition.');
  }
  // Only pass allowed fields to Prisma
  const updateData: any = {};
  if (dto.etat) updateData.etat = dto.etat;
  if (dto.ownerId) updateData.ownerId = dto.ownerId;
  if (dto.observationGlobal) updateData.observationGlobal = dto.observationGlobal;
  // Add other fields from your model as needed

  const bs = await this.prisma.bulletinSoin.update({
    where: { id: bsId },
    data: updateData,
    include: { owner: true },
  });

  // Audit log for status change
  if (dto.etat && dto.etat !== existing.etat) {
    await this.prisma.actionLog.create({
      data: {
        bordereauId: bs.bordereauId,
        action: 'BS_STATUS_CHANGE',
        timestamp: new Date(),
        details: { bsId, from: existing.etat, to: dto.etat },
      },
    });
  }
  await this.updateBordereauStatusFromBS(bs.bordereauId);
  return bs;
}

  // Calculate BS progress and update Bordereau status
  async updateBordereauStatusFromBS(bordereauId: string) {
    const bsList = await this.prisma.bulletinSoin.findMany({ where: { bordereauId } });
    const total = bsList.length;
    const validated = bsList.filter(bs => bs.etat === BSStatus.VALIDATED).length;

    // Fix for Statut assignment (error 2322) in updateBordereauStatusFromBS:
    let newStatus: Statut | undefined = undefined;
    if (validated === 0 && total > 0) {
      newStatus = Statut.EN_ATTENTE;
    } else if (validated < total) {
      newStatus = Statut.EN_DIFFICULTE;
    } else if (validated === total && total > 0) {
      newStatus = Statut.CLOTURE;
    }
    if (newStatus !== undefined) {
      await this.prisma.bordereau.update({
        where: { id: bordereauId },
        data: { statut: newStatus },
      });
    }
    return { total, validated, progress: total ? validated / total : 0 };
  }

  // Documents for a Bordereau
  async getDocuments(bordereauId: string) {
    return this.prisma.document.findMany({ where: { bordereauId } });
  }

  // Virement for a Bordereau
  async getVirement(bordereauId: string) {
    return this.prisma.virement.findUnique({ where: { bordereauId } });
  }

  // Alerts for a Bordereau
  async getAlerts(bordereauId: string) {
    return this.prisma.alertLog.findMany({ where: { bordereauId } });
  }


  // Add this method to handle document uploads


  async uploadDocument(bordereauId: string, documentData: any): Promise<PrismaDocument> {
    // documentData.file is the uploaded file (Express.Multer.File)
    const file = documentData.file;
    if (!file) throw new BadRequestException('No file uploaded');
    if (!documentData.uploadedById) throw new BadRequestException('uploadedById is required');

    // Validate bordereau and user exist
    const bordereau = await this.prisma.bordereau.findUnique({ where: { id: bordereauId } });
    if (!bordereau) throw new NotFoundException('Bordereau not found');
    const user = await this.prisma.user.findUnique({ where: { id: documentData.uploadedById } });
    if (!user) throw new NotFoundException('Uploader user not found');

    // Save file to disk with unique filename
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const uniqueFilename = `${base}-${uniqueSuffix}${ext}`;
    const filePath = path.join(uploadDir, uniqueFilename);
    fs.writeFileSync(filePath, file.buffer);
    // Store relative path in DB
    const relativePath = path.relative(path.join(__dirname, '../..'), filePath);

    // Create document in DB
    const document = await this.prisma.document.create({
      data: {
        name: documentData.name || file.originalname,
        type: documentData.type || file.mimetype || 'unknown',
        path: relativePath,
        uploadedById: documentData.uploadedById,
        bordereauId,
      },
    });
    // Log the upload action
    await this.logAction(bordereauId, 'UPLOAD_DOCUMENT');
    return document;
  }

// Add this method to get KPIs

// --- AI Microservice Integration ---
// Call AI microservice for recurrent complaint detection
async analyzeReclamationsAI(): Promise<any> {
  try {
    const complaints = await this.prisma.reclamation.findMany({
      include: { client: true },
      take: 100
    });
    
    const complaintsData = complaints.map(c => ({
      id: c.id,
      description: c.description || '',
      type: c.type || 'General',
      client: c.client?.name || 'Unknown',
      date: c.createdAt.toISOString()
    }));

    const { data } = await axios.post(`${process.env.AI_MICROSERVICE_URL || 'http://localhost:8002'}/analyze`, complaintsData, {
      headers: {
        'Authorization': `Bearer ${await this.getAIToken()}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    return data;
  } catch (error) {
    this.logger.error('AI reclamation analysis failed:', error.message);
    return { recurrent: [], summary: 'Service IA indisponible' };
  }
}

// Get AI-generated response suggestions for a specific complaint
async getReclamationSuggestions(id: string): Promise<any> {
  try {
    const complaint = await this.prisma.reclamation.findUnique({ 
      where: { id },
      include: { client: true }
    });
    
    if (!complaint) {
      throw new Error('Complaint not found');
    }

    const { data } = await axios.post(`${process.env.AI_MICROSERVICE_URL || 'http://localhost:8002'}/suggestions`, {
      complaint: {
        id: complaint.id,
        description: complaint.description,
        type: complaint.type,
        client: complaint.client?.name
      }
    }, {
      headers: {
        'Authorization': `Bearer ${await this.getAIToken()}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    return data;
  } catch (error) {
    this.logger.error('AI suggestion failed:', error.message);
    return { suggestion: 'Service IA indisponible pour les suggestions' };
  }
}

// Get resource allocation recommendations
async getTeamRecommendations(): Promise<any> {
  try {
    // Get workload data by team/user
    const workload = await this.prisma.bordereau.groupBy({ 
      by: ['assignedToUserId'], 
      _count: { id: true },
      where: {
        statut: { in: ['ASSIGNE', 'EN_COURS'] },
        archived: false
      }
    });

    // Get team/user information
    const teams = await this.prisma.user.findMany({
      where: { role: 'GESTIONNAIRE', active: true },
      select: { id: true, fullName: true }
    });

    const { data } = await axios.post(`${process.env.AI_MICROSERVICE_URL || 'http://localhost:8002'}/recommendations`, { 
      teams, 
      workload 
    }, {
      headers: {
        'Authorization': `Bearer ${await this.getAIToken()}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    return data;
  } catch (error) {
    this.logger.error('AI team recommendations failed:', error.message);
    return { 
      message: 'Service IA indisponible pour les recommandations d\'équipe', 
      recommendations: []
    };
  }
}

// Add this method to log actions
private async logAction(bordereauId: string, action: string): Promise<void> {
  await this.prisma.actionLog.create({
    data: {
      bordereauId,
      action,
      timestamp: new Date(),
    },
  });
}

/**
 * Dynamic workflow progression according to cahier de charge
 */
private async progressWorkflow(bordereauId: string, trigger: string): Promise<void> {
  try {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: { client: true, contract: true }
    });
    
    if (!bordereau) return;
    
    let newStatus: Statut | null = null;
    let updateData: any = {};
    
    switch (trigger) {
      case 'CREATED':
        // Bureau d'Ordre creates -> ready for scan
        newStatus = Statut.A_SCANNER;
        break;
        
      case 'SCAN_STARTED':
        // Scan service starts processing
        newStatus = Statut.SCAN_EN_COURS;
        updateData.dateDebutScan = new Date();
        break;
        
      case 'SCAN_COMPLETED':
        // Scan completed -> ready for assignment to health team
        newStatus = Statut.A_AFFECTER;
        updateData.dateFinScan = new Date();
        // Auto-assign to available gestionnaire
        setTimeout(() => this.autoAssignToGestionnaire(bordereauId), 1000);
        break;
        
      case 'ASSIGNED':
        // Assigned to gestionnaire -> in progress
        newStatus = Statut.EN_COURS;
        updateData.dateReceptionSante = new Date();
        // Check for team overload after assignment
        setTimeout(() => this.checkAndNotifyOverload(), 1000);
        break;
        
      case 'PROCESSING_STARTED':
        newStatus = Statut.EN_COURS;
        break;
        
      case 'PROCESSING_COMPLETED':
        // Gestionnaire completed -> ready for payment
        newStatus = Statut.PRET_VIREMENT;
        break;
        
      case 'PAYMENT_INITIATED':
        newStatus = Statut.VIREMENT_EN_COURS;
        updateData.dateDepotVirement = new Date();
        break;
        
      case 'PAYMENT_EXECUTED':
        newStatus = Statut.VIREMENT_EXECUTE;
        updateData.dateExecutionVirement = new Date();
        break;
        
      case 'CLOSED':
        newStatus = Statut.CLOTURE;
        updateData.dateCloture = new Date();
        break;
        
      case 'DIFFICULTY':
        newStatus = Statut.EN_DIFFICULTE;
        break;
    }
    
    if (newStatus && newStatus !== bordereau.statut) {
      await this.prisma.bordereau.update({
        where: { id: bordereauId },
        data: {
          statut: newStatus,
          ...updateData
        }
      });
      
      this.logger.log(`Workflow progression: ${bordereau.statut} -> ${newStatus} for bordereau ${bordereauId}`);
    }
  } catch (error) {
    this.logger.error(`Error in workflow progression for ${bordereauId}: ${error.message}`);
  }
}

/**
 * Auto-assign to available gestionnaire after scan (with chargé de compte integration)
 */
private async autoAssignToGestionnaire(bordereauId: string): Promise<void> {
  try {
    // Get bordereau with client and gestionnaires (chargé de compte)
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: {
        client: {
          include: { gestionnaires: true }
        }
      }
    });
    
    if (!bordereau) {
      this.logger.warn(`Bordereau ${bordereauId} not found for auto-assignment`);
      return;
    }
    
    let availableUsers: any[] = [];
    
    // CHARGÉ DE COMPTE INTEGRATION: Prefer client's gestionnaires
    if (bordereau.client.gestionnaires && bordereau.client.gestionnaires.length > 0) {
      availableUsers = bordereau.client.gestionnaires.filter(user => 
        user.role === 'GESTIONNAIRE' && user.active
      );
      this.logger.log(`Found ${availableUsers.length} gestionnaires assigned to client ${bordereau.client.name}`);
    }
    
    // Fallback: get all available gestionnaires
    if (availableUsers.length === 0) {
      availableUsers = await this.prisma.user.findMany({
        where: {
          role: 'GESTIONNAIRE',
          active: true,
        },
      });
      this.logger.log(`Using fallback: ${availableUsers.length} available gestionnaires`);
    }
    
    if (availableUsers.length === 0) {
      this.logger.warn('No available gestionnaires for auto-assignment');
      // Notify Super Admin of assignment failure
      await this.notifySuperAdminAssignmentFailure(bordereauId, bordereau.reference);
      return;
    }
    
    // Find user with lowest workload among available gestionnaires
    const workloads = await Promise.all(availableUsers.map(async user => {
      const count = await this.prisma.bordereau.count({
        where: { assignedToUserId: user.id, statut: { not: 'CLOTURE' } },
      });
      return { user, count };
    }));
    
    workloads.sort((a, b) => a.count - b.count);
    const selectedUser = workloads[0].user;
    
    await this.assignBordereau({
      bordereauId,
      assignedToUserId: selectedUser.id,
      notes: `Auto-assigned after scan completion (chargé de compte: ${bordereau.client.gestionnaires.length > 0 ? 'Yes' : 'No'})`,
    });
    
    this.logger.log(`Auto-assigned bordereau ${bordereauId} to gestionnaire ${selectedUser.fullName} (workload: ${workloads[0].count})`);
  } catch (error) {
    this.logger.error(`Error auto-assigning to gestionnaire: ${error.message}`);
  }
}

async findUnassigned(): Promise<BordereauResponseDto[]> {
  const bordereaux = await this.prisma.bordereau.findMany({
    where: {
      assignedToUserId: null,
      statut: { not: Statut.CLOTURE },
    },
    include: { client: true, contract: true },
  });
  return bordereaux.map((bordereau) => BordereauResponseDto.fromEntity(bordereau));
}

async findByTeam(teamId: string): Promise<BordereauResponseDto[]> {
  const bordereaux = await this.prisma.bordereau.findMany({
    where: {
      teamId,
      statut: { not: Statut.CLOTURE },
    },
    include: { client: true, contract: true },
  });
  return bordereaux.map(bordereau => BordereauResponseDto.fromEntity(bordereau));
}

async findByUser(userId: string): Promise<BordereauResponseDto[]> {
  const bordereaux = await this.prisma.bordereau.findMany({
    where: {
      assignedToUserId: userId,
      statut: { not: Statut.CLOTURE },
    },
    include: { client: true, contract: true },
  });
  return bordereaux.map(bordereau => BordereauResponseDto.fromEntity(bordereau));
}

async returnBordereau(id: string, reason: string) {
  // Get bordereau with current handler info
  const currentBordereau = await this.prisma.bordereau.findUnique({
    where: { id },
    include: { currentHandler: true, client: true, contract: true }
  });
  
  // Set status to EN_DIFFICULTE or similar
  const bordereau = await this.prisma.bordereau.update({
    where: { id },
    data: {
      statut: Statut.EN_DIFFICULTE,
      // Optionally, clear assignedToUserId to return to team leader
      assignedToUserId: null,
    },
    include: { client: true, contract: true },
  });

  // AUTO-NOTIFICATION: Gestionnaire → Chef return notification
  await this.notifyChefOfReturn(bordereau.id, bordereau.reference, reason, currentBordereau?.currentHandler?.fullName);

  // Log the event
  await this.auditLogService.logBordereauEvent(id, 'RETURNED', undefined, { reason });

  // Trigger alert
  await this.alertsService.triggerAlert({
  type: 'RECLAMATION',
  bsId: id,
  // details: reason, // Removed to match the expected type
  });

  return BordereauResponseDto.fromEntity(bordereau);
}

/**
 * Reassign a bordereau to a new user with comment logging
 */
async reassignBordereau(bordereauId: string, newUserId: string, comment?: string): Promise<BordereauResponseDto> {
  console.log('🔄 SERVICE: reassignBordereau called');
  console.log('Bordereau ID:', bordereauId);
  console.log('New User ID:', newUserId);
  console.log('Comment:', comment);
  
  // Validate bordereau exists
  const bordereau = await this.prisma.bordereau.findUnique({
    where: { id: bordereauId },
    include: { client: true, contract: true }
  });
  
  console.log('Found bordereau:', bordereau ? 'YES' : 'NO');
  if (bordereau) {
    console.log('Current assignment:', bordereau.assignedToUserId);
    console.log('Current status:', bordereau.statut);
  }
  
  if (!bordereau) {
    throw new NotFoundException(`Bordereau with ID ${bordereauId} not found`);
  }
  
  // Validate new user exists and has GESTIONNAIRE role
  const newUser = await this.prisma.user.findUnique({
    where: { id: newUserId }
  });
  
  console.log('Found new user:', newUser ? 'YES' : 'NO');
  if (newUser) {
    console.log('New user role:', newUser.role);
    console.log('New user name:', newUser.fullName);
  }
  
  if (!newUser) {
    throw new NotFoundException(`User with ID ${newUserId} not found`);
  }
  
  if (newUser.role !== 'GESTIONNAIRE') {
    throw new BadRequestException('User must have GESTIONNAIRE role');
  }
  
  // Store old assignment for logging
  const oldUserId = bordereau.assignedToUserId;
  
  console.log('🔄 Updating bordereau assignment...');
  console.log('From:', oldUserId);
  console.log('To:', newUserId);
  
  // Update the bordereau assignment
  const updatedBordereau = await this.prisma.bordereau.update({
    where: { id: bordereauId },
    data: {
      assignedToUserId: newUserId,
      statut: Statut.ASSIGNE // Ensure proper status
    },
    include: { client: true, contract: true }
  });
  
  console.log('✅ Database updated successfully');
  console.log('New assignment:', updatedBordereau.assignedToUserId);
  console.log('New status:', updatedBordereau.statut);
  
  // Log the reassignment action with comment
  await this.prisma.actionLog.create({
    data: {
      bordereauId,
      action: 'REASSIGN_BORDEREAU',
      timestamp: new Date(),
      details: {
        fromUserId: oldUserId,
        toUserId: newUserId,
        comment: comment || 'No comment provided',
        timestamp: new Date().toISOString()
      }
    }
  });
  
  console.log('📝 Action logged successfully');
  
  this.logger.log(`Reassigned bordereau ${bordereauId} from ${oldUserId} to ${newUserId}`);
  
  const result = BordereauResponseDto.fromEntity(updatedBordereau);
  console.log('🎉 SERVICE: reassignBordereau completed successfully');
  
  return result;
}

// --- Advanced Forecasting ---
/**
 * Forecast the number of bordereaux expected in the next N days based on historical averages.
 */
async forecastBordereaux(days: number = 7): Promise<{ forecast: number; dailyAverage: number; }> {
// Get all bordereaux from the last 90 days
const since = new Date();
since.setDate(since.getDate() - 90);
const bordereaux = await this.prisma.bordereau.findMany({
where: { dateReception: { gte: since } },
});
// Always return a valid object, never throw
if (!bordereaux || bordereaux.length === 0) return { forecast: 0, dailyAverage: 0 };
// Calculate daily average
const daysSpan = Math.max(1, (new Date().getTime() - since.getTime()) / (1000 * 60 * 60 * 24));
const dailyAverage = bordereaux.length / daysSpan;
return {
forecast: Math.round(dailyAverage * days),
dailyAverage: Number(dailyAverage.toFixed(2)),
};
}

/**
 * Estimate the number of staff needed for the forecasted workload.
 * @param days Number of days to forecast
 * @param avgPerStaffPerDay Average number of bordereaux processed per staff per day
 */
async estimateStaffing(days: number = 7, avgPerStaffPerDay: number = 5): Promise<{ forecast: number; staffNeeded: number; }> {
  const { forecast } = await this.forecastBordereaux(days);
  const staffNeeded = Math.ceil(forecast / avgPerStaffPerDay);
  return { forecast, staffNeeded };
}

// --- AI Integration ---
/**
 * Predict required resources using AI microservice
 */
async getPredictResourcesAI(payload: any): Promise<any> {
  try {
    const { data } = await axios.post(`${process.env.AI_MICROSERVICE_URL || 'http://localhost:8002'}/predict_resources`, payload, {
      headers: {
        'Authorization': `Bearer ${await this.getAIToken()}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    return data;
  } catch (error) {
    this.logger.error('AI resource prediction failed:', error.message);
    return { message: 'AI microservice unavailable', error: error.message };
  }
}

/**
 * Analyze complaints using AI
 */
async analyzeComplaintsAI(): Promise<{ message: string; analysis?: any }> {
  try {
    // Get recent complaints/reclamations
    const complaints = await this.prisma.reclamation.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      include: { client: true },
      take: 100
    });

    if (complaints.length < 3) {
      return { message: 'Pas assez de réclamations pour l\'analyse IA', analysis: null };
    }

    // Prepare data for AI pattern recognition
    const complaintsData = complaints.map(c => ({
      id: c.id,
      description: c.description || '',
      date: c.createdAt.toISOString(),
      client: c.client?.name || 'Unknown',
      type: c.type || 'General'
    }));

    // Call AI microservice for recurring issue detection
    const aiResponse = await axios.post(`${process.env.AI_MICROSERVICE_URL || 'http://localhost:8002'}/pattern_recognition/recurring_issues`, {
      complaints: complaintsData
    }, {
      headers: {
        'Authorization': `Bearer ${await this.getAIToken()}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    const analysis = aiResponse.data;
    
    return {
      message: `IA: ${analysis.total_groups} groupes de réclamations récurrentes détectés`,
      analysis: {
        recurring_groups: analysis.recurring_groups,
        total_complaints: complaints.length,
        recurrence_rate: analysis.recurrence_rate,
        summary: analysis.summary
      }
    };

  } catch (error) {
    this.logger.error('AI complaint analysis failed:', error.message);
    return { 
      message: 'Service IA indisponible pour l\'analyse des réclamations',
      analysis: null
    };
  }
}

async updateThresholds(id: string, thresholds: any) {
  return this.prisma.contract.update({
    where: { id },
    data: { thresholds },
  });
}
/**
 * Get AI recommendations (stub)
 */
async getAIRecommendations(): Promise<{ message: string; recommendations?: any[] }> {
  try {
    // Get active bordereaux for AI analysis
    const bordereaux = await this.prisma.bordereau.findMany({
      where: { statut: { not: 'CLOTURE' }, archived: false },
      include: { client: true, contract: true },
      orderBy: { dateReception: 'asc' },
      take: 50 // Limit for performance
    });

    if (bordereaux.length === 0) {
      return { message: 'Aucun bordereau actif trouvé', recommendations: [] };
    }

    // Prepare data for AI microservice
    const aiPayload = bordereaux.map(b => {
      const daysSinceReception = Math.floor((new Date().getTime() - new Date(b.dateReception).getTime()) / (1000 * 60 * 60 * 24));
      const slaThreshold = b.contract?.delaiReglement || b.client?.reglementDelay || 30;
      
      return {
        id: b.id,
        reference: b.reference,
        sla_urgency: Math.max(0, daysSinceReception - slaThreshold + 5),
        volume: b.nombreBS || 1,
        client_importance: b.client?.name?.includes('IMPORTANT') ? 3 : 1,
        deadline: new Date(new Date(b.dateReception).getTime() + slaThreshold * 24 * 60 * 60 * 1000).toISOString(),
        days_since_reception: daysSinceReception,
        sla_threshold: slaThreshold
      };
    });

    // Call AI microservice for prioritization
    const aiResponse = await axios.post(`${process.env.AI_MICROSERVICE_URL || 'http://localhost:8002'}/priorities`, aiPayload, {
      headers: {
        'Authorization': `Bearer ${await this.getAIToken()}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    const priorities = aiResponse.data.priorities || [];
    
    // Map AI results back to our format
    const recommendations = priorities.slice(0, 10).map((p: any) => {
      const bordereau = bordereaux.find(b => b.id === p.id);
      return {
        id: p.id,
        reference: bordereau?.reference || 'Unknown',
        score: Math.min(5, Math.max(1, Math.round(p.priority_score / 3))),
        daysSinceReception: aiPayload.find(a => a.id === p.id)?.days_since_reception || 0,
        slaThreshold: aiPayload.find(a => a.id === p.id)?.sla_threshold || 30,
        priority_score: p.priority_score
      };
    });

    return {
      message: `IA: ${recommendations.length} recommandations générées`,
      recommendations
    };

  } catch (error) {
    this.logger.error('AI recommendations failed:', error.message);
    
    // Fallback to basic scoring only if AI service is unavailable
    const bordereaux = await this.prisma.bordereau.findMany({
      where: { statut: { not: 'CLOTURE' }, archived: false },
      include: { client: true, contract: true },
      take: 10
    });

    const now = new Date();
    const recommendations = bordereaux.map(b => {
      const daysSinceReception = Math.floor((now.getTime() - new Date(b.dateReception).getTime()) / (1000 * 60 * 60 * 24));
      const slaThreshold = b.contract?.delaiReglement || b.client?.reglementDelay || 30;
      const score = daysSinceReception > slaThreshold ? 3 : daysSinceReception > slaThreshold - 3 ? 2 : 1;
      
      return {
        id: b.id,
        reference: b.reference,
        score,
        daysSinceReception,
        slaThreshold
      };
    }).sort((a, b) => b.score - a.score);

    return {
      message: 'Service IA indisponible - Analyse basique utilisée',
      recommendations
    };
  }
}

private async getAIToken(): Promise<string> {
  try {
    const response = await axios.post(`${process.env.AI_MICROSERVICE_URL || 'http://localhost:8002'}/token`, 
      new URLSearchParams({
        grant_type: 'password',
        username: 'admin',
        password: 'secret'
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 5000
      }
    );
    return response.data.access_token;
  } catch (error) {
    this.logger.warn('AI authentication failed, using fallback');
    throw new Error('AI service authentication failed');
  }
}

// --- Full-Text Search ---
/**
 * Full-text search for bordereaux and documents (basic implementation)
 */
async searchBordereauxAndDocuments(query: string): Promise<any[]> {
  // Search in bordereaux reference and documents name/type/path/ocrResult
  const bordereaux = await this.prisma.bordereau.findMany({
    where: {
      OR: [
        { reference: { contains: query, mode: 'insensitive' } },
        { documents: { some: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { type: { contains: query, mode: 'insensitive' } },
            { path: { contains: query, mode: 'insensitive' } },
            // Removed invalid contains on ocrResult JSON field
          ]
        } } },
      ],
    },
    include: { documents: true, client: true, contract: true },
  });
  return bordereaux;
}

  // AI Analysis Methods
  async getAISLAAnalysis(): Promise<any> {
    try {
      const bordereaux = await this.prisma.bordereau.findMany({
        where: { statut: { not: 'CLOTURE' }, archived: false },
        include: { client: true, contract: true },
        take: 50
      });

      if (bordereaux.length === 0) {
        return { risks: [], total_analyzed: 0 };
      }

      // Prepare data for AI SLA prediction
      const slaItems = bordereaux.map(b => {
        const daysSinceReception = Math.floor((new Date().getTime() - new Date(b.dateReception).getTime()) / (1000 * 60 * 60 * 24));
        const slaThreshold = b.contract?.delaiReglement || b.client?.reglementDelay || 30;
        
        return {
          id: b.id,
          start_date: b.dateReception.toISOString(),
          deadline: new Date(new Date(b.dateReception).getTime() + slaThreshold * 24 * 60 * 60 * 1000).toISOString(),
          current_progress: b.statut === 'TRAITE' ? 100 : b.statut === 'EN_COURS' ? 50 : 10,
          total_required: 100,
          sla_days: slaThreshold
        };
      });

      try {
        // Call AI SLA prediction service
        const aiResponse = await axios.post(`${process.env.AI_MICROSERVICE_URL || 'http://localhost:8002'}/sla_prediction`, slaItems, {
          params: { explain: false },
          headers: {
            'Authorization': `Bearer ${await this.getAIToken()}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        });

        const predictions = aiResponse.data.sla_predictions || [];
        
        // Map AI results back to our format
        const risks = predictions
          .filter((p: any) => p.score > 0.5)
          .map((p: any) => {
            const bordereau = bordereaux.find(b => b.id === p.id);
            return {
              id: p.id,
              reference: bordereau?.reference || 'Unknown',
              days_left: p.days_left,
              score: p.score,
              risk: p.risk,
              client: bordereau?.client?.name
            };
          });

        return { 
          risks, 
          total_analyzed: bordereaux.length,
          ai_powered: true
        };

      } catch (aiError) {
        this.logger.warn('AI SLA analysis failed, using fallback:', aiError.message);
        
        // Fallback to basic calculation
        const risks = bordereaux.map(b => {
          const daysSinceReception = Math.floor((new Date().getTime() - new Date(b.dateReception).getTime()) / (1000 * 60 * 60 * 24));
          const daysLeft = b.delaiReglement - daysSinceReception;
          const score = daysLeft <= 0 ? 1.0 : daysLeft <= 3 ? 0.8 : daysLeft <= 7 ? 0.5 : 0.2;
          
          return {
            id: b.id,
            reference: b.reference,
            days_left: daysLeft,
            score,
            client: b.client?.name
          };
        }).filter(r => r.score > 0.5);

        return { risks, total_analyzed: bordereaux.length };
      }
    } catch (error) {
      return { risks: [], error: error.message };
    }
  }

  async getAIResourceAnalysis(): Promise<any> {
    try {
      const activeBordereaux = await this.prisma.bordereau.count({
        where: { statut: { in: ['ASSIGNE', 'EN_COURS'] } }
      });
      
      const availableManagers = await this.prisma.user.count({
        where: { role: 'GESTIONNAIRE', active: true }
      });

      const avgProcessingRate = 5; // BS per day per manager
      const requiredManagers = Math.ceil(activeBordereaux / avgProcessingRate);
      const additionalNeeded = Math.max(0, requiredManagers - availableManagers);

      return {
        current_workload: activeBordereaux,
        available_managers: availableManagers,
        required_managers: requiredManagers,
        additional_managers_needed: additionalNeeded,
        utilization_rate: availableManagers > 0 ? (activeBordereaux / (availableManagers * avgProcessingRate)) * 100 : 0
      };
    } catch (error) {
      return { additional_managers_needed: 0, error: error.message };
    }
  }

  async getAIReassignmentAnalysis(): Promise<any> {
    try {
      const managers = await this.prisma.user.findMany({
        where: { role: 'GESTIONNAIRE', active: true },
        include: {
          bordereaux: {
            where: { statut: { in: ['ASSIGNE', 'EN_COURS'] } }
          }
        }
      });

      const suggestions = managers
        .filter(m => m.bordereaux.length > 10) // Overloaded threshold
        .map(m => ({
          manager_id: m.id,
          manager_name: m.fullName,
          current_workload: m.bordereaux.length,
          reason: `Surcharge détectée: ${m.bordereaux.length} dossiers actifs`,
          recommended_action: 'Réaffecter une partie des dossiers'
        }));

      return { suggestions, analyzed_managers: managers.length };
    } catch (error) {
      return { suggestions: [], error: error.message };
    }
  }

  async getAIAnomalyDetection(): Promise<any> {
    try {
      const recentBordereaux = await this.prisma.bordereau.findMany({
        where: {
          dateReception: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          },
          archived: false
        },
        include: { client: true, contract: true },
        take: 100
      });

      if (recentBordereaux.length < 10) {
        return { anomalies: [], analyzed_period: '30 days', total_bordereaux: recentBordereaux.length };
      }

      try {
        // Prepare data for AI anomaly detection
        const anomalyData = recentBordereaux.map(b => {
          const daysSinceReception = Math.floor((new Date().getTime() - new Date(b.dateReception).getTime()) / (1000 * 60 * 60 * 24));
          const slaThreshold = b.contract?.delaiReglement || b.client?.reglementDelay || 30;
          
          return {
            id: b.id,
            features: [
              daysSinceReception, // processing time
              b.nombreBS || 1, // volume
              slaThreshold, // expected processing time
              b.priority || 1, // priority level
              b.client?.reglementDelay || 30 // client SLA
            ]
          };
        });

        // Call AI anomaly detection service
        const aiResponse = await axios.post(`${process.env.AI_MICROSERVICE_URL || 'http://localhost:8002'}/anomaly_detection`, {
          data: anomalyData,
          method: 'isolation_forest',
          contamination: 0.1
        }, {
          headers: {
            'Authorization': `Bearer ${await this.getAIToken()}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        });

        const aiAnomalies = aiResponse.data.anomalies || [];
        
        // Map AI results to our format
        const anomalies = aiAnomalies.map((a: any) => {
          const bordereau = recentBordereaux.find(b => b.id === a.id);
          return {
            type: 'ai_detected_anomaly',
            severity: a.severity,
            description: `IA: Anomalie détectée (score: ${a.anomaly_score.toFixed(2)})`,
            bordereau_id: a.id,
            reference: bordereau?.reference,
            anomaly_score: a.anomaly_score,
            features: a.features
          };
        });

        return { 
          anomalies, 
          analyzed_period: '30 days', 
          total_bordereaux: recentBordereaux.length,
          ai_powered: true,
          method: 'isolation_forest'
        };

      } catch (aiError) {
        this.logger.warn('AI anomaly detection failed, using fallback:', aiError.message);
        
        // Fallback to basic anomaly detection
        const anomalies: any[] = [];
        const avgProcessingTime = 5;
        
        recentBordereaux.forEach(b => {
          const daysSinceReception = Math.floor((new Date().getTime() - new Date(b.dateReception).getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceReception > avgProcessingTime * 2 && b.statut !== 'CLOTURE') {
            anomalies.push({
              type: 'processing_delay',
              severity: 'high',
              description: `Délai de traitement anormalement long: ${daysSinceReception} jours`,
              bordereau_id: b.id,
              reference: b.reference
            });
          }
        });

        return { anomalies, analyzed_period: '30 days', total_bordereaux: recentBordereaux.length };
      }
    } catch (error) {
      return { anomalies: [], error: error.message };
    }
  }

  // AI Action Methods
  async aiAutoAssign(bordereauId: string): Promise<any> {
    try {
      const bordereau = await this.prisma.bordereau.findUnique({
        where: { id: bordereauId },
        include: { client: true, contract: true }
      });

      if (!bordereau) {
        throw new Error('Bordereau not found');
      }

      // Get available gestionnaires with workload
      const gestionnaires = await this.prisma.user.findMany({
        where: { role: 'GESTIONNAIRE', active: true },
        include: {
          bordereaux: {
            where: { statut: { in: ['ASSIGNE', 'EN_COURS'] } }
          }
        }
      });

      if (gestionnaires.length === 0) {
        throw new Error('No available gestionnaires');
      }

      // Prepare task data for AI smart routing
      const daysSinceReception = Math.floor((new Date().getTime() - new Date(bordereau.dateReception).getTime()) / (1000 * 60 * 60 * 24));
      const slaThreshold = bordereau.contract?.delaiReglement || bordereau.client?.reglementDelay || 30;
      
      const taskData = {
        id: bordereau.id,
        priority: Math.min(5, Math.max(1, daysSinceReception > slaThreshold ? 5 : 2)),
        complexity: Math.min(5, Math.max(1, Math.ceil(bordereau.nombreBS / 10))),
        estimated_time: Math.max(1, slaThreshold - daysSinceReception),
        client_importance: bordereau.client?.name?.includes('IMPORTANT') ? 5 : 3,
        sla_urgency: Math.max(1, Math.min(5, daysSinceReception - slaThreshold + 3)),
        document_count: bordereau.nombreBS,
        requires_expertise: bordereau.nombreBS > 50 ? 1 : 0,
        is_recurring: 0,
        type: 'bordereau_processing'
      };

      const availableTeams = gestionnaires.map(g => g.id);

      try {
        // Call AI smart routing service
        const aiResponse = await axios.post(`${process.env.AI_MICROSERVICE_URL || 'http://localhost:8002'}/smart_routing/suggest_assignment`, {
          task: taskData,
          available_teams: availableTeams
        }, {
          headers: {
            'Authorization': `Bearer ${await this.getAIToken()}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        const aiRecommendation = aiResponse.data;
        const recommendedGestionnaire = gestionnaires.find(g => g.id === aiRecommendation.recommended_assignee);

        if (recommendedGestionnaire) {
          // Assign using AI recommendation
          await this.prisma.bordereau.update({
            where: { id: bordereauId },
            data: {
              assignedToUserId: recommendedGestionnaire.id,
              statut: 'ASSIGNE'
            }
          });

          return {
            success: true,
            assignedTo: recommendedGestionnaire.fullName,
            reason: `IA: ${aiRecommendation.reasoning?.join(', ') || 'Assignation optimale'}`,
            confidence: aiRecommendation.confidence,
            score: aiRecommendation.score
          };
        }
      } catch (aiError) {
        this.logger.warn('AI routing failed, using fallback:', aiError.message);
      }

      // Fallback: Find gestionnaire with lowest workload
      const optimalGestionnaire = gestionnaires.reduce((best, current) => 
        current.bordereaux.length < best.bordereaux.length ? current : best
      );

      await this.prisma.bordereau.update({
        where: { id: bordereauId },
        data: {
          assignedToUserId: optimalGestionnaire.id,
          statut: 'ASSIGNE'
        }
      });

      return {
        success: true,
        assignedTo: optimalGestionnaire.fullName,
        reason: `Charge de travail optimale: ${optimalGestionnaire.bordereaux.length} dossiers actifs`,
        confidence: 'medium'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async aiPrioritize(bordereauId: string): Promise<any> {
    try {
      const bordereau = await this.prisma.bordereau.findUnique({
        where: { id: bordereauId },
        include: { client: true, contract: true }
      });

      if (!bordereau) {
        throw new Error('Bordereau not found');
      }

      const daysSinceReception = Math.floor((new Date().getTime() - new Date(bordereau.dateReception).getTime()) / (1000 * 60 * 60 * 24));
      const slaThreshold = bordereau.contract?.delaiReglement || bordereau.client?.reglementDelay || 30;
      const daysLeft = slaThreshold - daysSinceReception;

      try {
        // Prepare data for AI SLA breach prediction
        const slaData = {
          item_data: {
            id: bordereau.id,
            start_date: bordereau.dateReception.toISOString(),
            deadline: new Date(new Date(bordereau.dateReception).getTime() + slaThreshold * 24 * 60 * 60 * 1000).toISOString(),
            current_progress: bordereau.statut === 'TRAITE' ? 100 : bordereau.statut === 'EN_COURS' ? 50 : 10,
            total_required: 100,
            workload: bordereau.nombreBS || 1,
            complexity: Math.min(5, Math.max(1, Math.ceil(bordereau.nombreBS / 20))),
            team_efficiency: 1.0,
            historical_performance: 1.0,
            client_priority: bordereau.client?.name?.includes('IMPORTANT') ? 3 : 1
          }
        };

        // Call AI SLA breach prediction
        const aiResponse = await axios.post(`${process.env.AI_MICROSERVICE_URL || 'http://localhost:8002'}/sla_breach_prediction/predict`, slaData, {
          headers: {
            'Authorization': `Bearer ${await this.getAIToken()}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        const prediction = aiResponse.data.prediction;
        let priority = 1;
        let reason = 'Priorité normale';

        // Map AI risk levels to priority
        switch (prediction.risk_level) {
          case 'High':
            priority = 5;
            reason = `IA: Risque élevé (${Math.round(prediction.breach_probability * 100)}% de dépassement SLA)`;
            break;
          case 'Medium':
            priority = 3;
            reason = `IA: Risque modéré (${Math.round(prediction.breach_probability * 100)}% de dépassement SLA)`;
            break;
          case 'Low':
            priority = 1;
            reason = `IA: Risque faible (${Math.round(prediction.breach_probability * 100)}% de dépassement SLA)`;
            break;
        }

        // Update bordereau priority
        await this.prisma.bordereau.update({
          where: { id: bordereauId },
          data: { priority }
        });

        return {
          success: true,
          priority,
          reason,
          daysLeft,
          ai_confidence: prediction.confidence,
          breach_probability: prediction.breach_probability,
          risk_level: prediction.risk_level
        };

      } catch (aiError) {
        this.logger.warn('AI prioritization failed, using fallback:', aiError.message);
        
        // Fallback logic
        let priority = 1;
        let reason = 'Priorité normale';
        
        if (daysLeft <= 0) {
          priority = 5;
          reason = 'SLA dépassé - CRITIQUE';
        } else if (daysLeft <= 3) {
          priority = 4;
          reason = 'Risque SLA élevé - 3 jours restants';
        } else if (daysLeft <= 7) {
          priority = 3;
          reason = 'Attention SLA - 7 jours restants';
        }

        await this.prisma.bordereau.update({
          where: { id: bordereauId },
          data: { priority }
        });

        return {
          success: true,
          priority,
          reason,
          daysLeft
        };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async aiResourceAlert(): Promise<any> {
    try {
      const activeBordereaux = await this.prisma.bordereau.count({
        where: { statut: { in: ['ASSIGNE', 'EN_COURS'] }, archived: false }
      });
      
      const availableGestionnaires = await this.prisma.user.count({
        where: { role: 'GESTIONNAIRE', active: true }
      });

      try {
        // Call AI resource prediction
        const resourceData = {
          sla_days: 30,
          historical_rate: 5, // bordereaux per day per gestionnaire
          volume: activeBordereaux
        };

        const aiResponse = await axios.post(`${process.env.AI_MICROSERVICE_URL || 'http://localhost:8002'}/predict_resources`, resourceData, {
          headers: {
            'Authorization': `Bearer ${await this.getAIToken()}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        const requiredGestionnaires = aiResponse.data.required_managers || Math.ceil(activeBordereaux / 5);
        const shortage = Math.max(0, requiredGestionnaires - availableGestionnaires);

        // Send alert to admins if shortage detected
        if (shortage > 0) {
          const admins = await this.prisma.user.findMany({
            where: { role: { in: ['SUPER_ADMIN', 'CHEF_EQUIPE'] } }
          });

          for (const admin of admins) {
            await this.prisma.notification.create({
              data: {
                userId: admin.id,
                type: 'RESOURCE_ALERT',
                title: 'Alerte IA: Ressources insuffisantes',
                message: `IA prédit ${shortage} gestionnaire(s) supplémentaire(s) nécessaire(s) pour respecter les SLA`,
                data: {
                  current: availableGestionnaires,
                  needed: requiredGestionnaires,
                  shortage,
                  workload: activeBordereaux,
                  ai_prediction: true
                },
                read: false
              }
            }).catch(() => console.log('Failed to create notification'));
          }
        }

        return {
          success: true,
          current: availableGestionnaires,
          needed: requiredGestionnaires,
          shortage,
          alert_sent: shortage > 0,
          ai_prediction: true
        };

      } catch (aiError) {
        this.logger.warn('AI resource prediction failed, using fallback:', aiError.message);
        
        // Fallback calculation
        const avgProcessingRate = 5;
        const requiredGestionnaires = Math.ceil(activeBordereaux / avgProcessingRate);
        const shortage = Math.max(0, requiredGestionnaires - availableGestionnaires);

        if (shortage > 0) {
          const admins = await this.prisma.user.findMany({
            where: { role: { in: ['SUPER_ADMIN', 'CHEF_EQUIPE'] } }
          });

          for (const admin of admins) {
            await this.prisma.notification.create({
              data: {
                userId: admin.id,
                type: 'RESOURCE_ALERT',
                title: 'Alerte: Ressources insuffisantes',
                message: `${shortage} gestionnaire(s) supplémentaire(s) nécessaire(s) pour respecter les SLA`,
                data: {
                  current: availableGestionnaires,
                  needed: requiredGestionnaires,
                  shortage,
                  workload: activeBordereaux
                },
                read: false
              }
            }).catch(() => console.log('Failed to create notification'));
          }
        }

        return {
          success: true,
          current: availableGestionnaires,
          needed: requiredGestionnaires,
          shortage,
          alert_sent: shortage > 0
        };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
