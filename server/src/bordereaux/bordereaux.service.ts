import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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
  constructor(private readonly prisma: PrismaService, private readonly alertsService: AlertsService) {}


  async create(createBordereauDto: CreateBordereauDto): Promise<BordereauResponseDto> {
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
    } = createBordereauDto;

    // Validate clientId
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new BadRequestException('Invalid clientId');

    // Validate contractId if provided
    if (contractId) {
      const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
      if (!contract) throw new BadRequestException('Invalid contractId');
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
        // Optionally, use contract's delaiReglement if not provided
        if (!delaiReglement && typeof activeContract.delaiReglement === 'number') {
          delaiReglement = activeContract.delaiReglement;
        }
      }
    }
    // -------------------------------------------------------------

    // Business rule: unique reference per client
    const existing = await this.prisma.bordereau.findFirst({ where: { reference, clientId } });
    if (existing) {
      throw new BadRequestException('A bordereau with this reference already exists for this client.');
    }

    const data: any = {
      reference,
      dateReception,
      clientId,
      contractId,
      delaiReglement,
      nombreBS,
    };
    if (statut !== undefined) data.statut = statut;
    if (dateDebutScan) data.dateDebutScan = dateDebutScan;
    if (dateFinScan) data.dateFinScan = dateFinScan;
    if (dateReceptionSante) data.dateReceptionSante = dateReceptionSante;
    if (dateCloture) data.dateCloture = dateCloture;
    if (dateDepotVirement) data.dateDepotVirement = dateDepotVirement;
    if (dateExecutionVirement) data.dateExecutionVirement = dateExecutionVirement;

    const bordereau = await this.prisma.bordereau.create({
      data,
      include: {
        client: true,
        contract: true,
      },
    });
    await this.autoAssignBordereau(bordereau.id);
    await this.logAction(bordereau.id, 'CREATE_BORDEREAU');
    return BordereauResponseDto.fromEntity(bordereau);
  }
  
  async findAll(): Promise<BordereauResponseDto[]> {
    const bordereaux = await this.prisma.bordereau.findMany({
      include: {
        client: true,
        contract: true,
      },
    });
    
    return bordereaux.map(bordereau => BordereauResponseDto.fromEntity(bordereau));
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
    const data: any = {};
    if (reference !== undefined) data.reference = reference;
    if (dateReception !== undefined) data.dateReception = dateReception;
    if (clientId !== undefined) data.clientId = clientId;
    if (contractId !== undefined) data.contractId = contractId;
    if (dateDebutScan !== undefined) data.dateDebutScan = dateDebutScan;
    if (dateFinScan !== undefined) data.dateFinScan = dateFinScan;
    if (dateReceptionSante !== undefined) data.dateReceptionSante = dateReceptionSante;
    if (dateCloture !== undefined) data.dateCloture = dateCloture;
    if (dateDepotVirement !== undefined) data.dateDepotVirement = dateDepotVirement;
    if (dateExecutionVirement !== undefined) data.dateExecutionVirement = dateExecutionVirement;
    if (delaiReglement !== undefined) data.delaiReglement = delaiReglement;
    if (statut !== undefined) data.statut = { set: statut };
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
    const updatedBordereau = await this.prisma.bordereau.update({
      where: { id: bordereauId },
      data: {
        statut: { set: Statut.ASSIGNE },

        
        // In a real implementation, you would store the assignedToUserId
        // and teamId in the bordereau or in a separate assignments table
      },
      include: {
        client: true,
        contract: true,
      },
    });
    
    return BordereauResponseDto.fromEntity(updatedBordereau);
  }
  
  /**
   * Auto-assign a bordereau based on workload and availability
   */
  private async autoAssignBordereau(bordereauId: string): Promise<void> {
    try {
      // 1. Get all available users with role 'GESTIONNAIRE'
      const availableUsers = await this.prisma.user.findMany({
        where: {
          role: 'GESTIONNAIRE',
          active: true,
        },
      });
      if (availableUsers.length === 0) {
        this.logger.warn('No available users found for auto-assignment');
        return;
      }
      // 2. Find the user with the lowest current workload (open bordereaux assigned)
      const workloads = await Promise.all(availableUsers.map(async user => {
        const count = await this.prisma.bordereau.count({
          where: { assignedToUserId: user.id, statut: { not: 'CLOTURE' } },
        });
        return { user, count };
      }));
      workloads.sort((a, b) => a.count - b.count);
      const selectedUser = workloads[0].user;
      // 3. Assign the bordereau to the selected user
      await this.assignBordereau({
        bordereauId,
        assignedToUserId: selectedUser.id,
        notes: 'Auto-assigned based on lowest workload',
      });
      this.logger.log(`Auto-assigned bordereau ${bordereauId} to user ${selectedUser.id}`);
    } catch (error) {
      this.logger.error(`Error auto-assigning bordereau ${bordereauId}: ${error.message}`);
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
    const bordereaux = await this.findAll();
    const fields = ['id', 'reference', 'statut', 'dateReception', 'dateCloture', 'delaiReglement', 'nombreBS'];
    const csvRows = [fields.join(',')];
    for (const b of bordereaux) {
      csvRows.push(fields.map(f => (b[f] !== undefined ? '"' + String(b[f]).replace(/"/g, '""') + '"' : '')).join(','));
    }
    return csvRows.join('\n');
  }

  async exportExcel() {
    // Minimal implementation, returns a Buffer
    const bordereaux = await this.findAll();
    const fields = ['id', 'reference', 'statut', 'dateReception', 'dateCloture', 'delaiReglement', 'nombreBS'];
    const rows = [fields];
    for (const b of bordereaux) {
      rows.push(fields.map(f => b[f] !== undefined ? b[f] : ''));
    }
    // Simple buffer output (CSV as Excel)
    const content = rows.map(r => r.join('\t')).join('\n');
    return Buffer.from(content, 'utf-8');
  }

  async exportPDF() {
    // Minimal implementation, returns a Buffer (plain text PDF)
    const bordereaux = await this.findAll();
    let content = 'Bordereaux List\n\n';
    for (const b of bordereaux) {
      content += `ID: ${b.id} | Ref: ${b.reference} | Statut: ${b.statut} | Date Reception: ${b.dateReception}\n`;
    }
    // Return as a Buffer (simulate PDF)
    return Buffer.from(content, 'utf-8');
  }
  /**
   * Update bordereau status when scan starts
   */
  async startScan(id: string): Promise<BordereauResponseDto> {
    const bordereau = await this.prisma.bordereau.update({
      where: { id },
      data: {
        statut: { set: Statut.SCAN_EN_COURS },
        dateDebutScan: new Date(),
      },
      include: {
        client: true,
        contract: true,
      },
    });
    
    return BordereauResponseDto.fromEntity(bordereau);
  }
  
  /**
   * Update bordereau status when scan completes
   */
  async completeScan(id: string): Promise<BordereauResponseDto> {
    const bordereau = await this.prisma.bordereau.update({
      where: { id },
      data: {
        statut: { set: Statut.SCAN_TERMINE },
        dateFinScan: new Date(),
      },
      include: {
        client: true,
        contract: true,
      },
    });
    
    return BordereauResponseDto.fromEntity(bordereau);
  }
  
  /**
   * Mark a bordereau as processed
   */
  async markAsProcessed(id: string): Promise<BordereauResponseDto> {
    const bordereau = await this.prisma.bordereau.update({
      where: { id },
      data: {
        statut: { set: Statut.TRAITE },
      },
      include: {
        client: true,
        contract: true,
      },
    });
    
    return BordereauResponseDto.fromEntity(bordereau);
  }
  
  /**
   * Close a bordereau (final state)
   */
  async closeBordereau(id: string): Promise<BordereauResponseDto> {
    const bordereau = await this.prisma.bordereau.update({
      where: { id },
      data: {
        statut: { set: Statut.CLOTURE },
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

    let newStatus: Statut = Statut.EN_ATTENTE;
    if (validated === 0 && total > 0) {
      newStatus = Statut.EN_ATTENTE as Statut; // Use an existing status, or replace with the appropriate one
    } else if (validated < total) {
      newStatus = Statut.EN_DIFFICULTE as Statut; // Use an existing status, e.g., EN_DIFFICULTE
    } else if (validated === total && total > 0) {
      newStatus = Statut.CLOTURE as Statut;
    }
    
    await this.prisma.bordereau.update({
      where: { id: bordereauId },
      data: { statut: { set: newStatus } },
    });
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
// Call Python AI microservice for recurrent complaint detection
async analyzeReclamationsAI(): Promise<any> {
  const complaints = await this.prisma.reclamation.findMany();
  const { data } = await axios.post('http://localhost:8001/analyze', complaints);
  return data;
}

// Get AI-  generated response suggestions for a specific complaint
async getReclamationSuggestions(id: string): Promise<any> {
  const complaint = await this.prisma.reclamation.findUnique({ where: { id } });
  const { data } = await axios.post('http://localhost:8001/suggestions', { complaint });
  return data;
}

// Get resource allocation recommendations
async getTeamRecommendations(): Promise<any> {
try {
const teams: any[] = []; // No Team model, so empty array
const workload = await this.prisma.bordereau.groupBy({ by: ['teamId'], _count: { id: true } });
const { data } = await axios.post('http://localhost:8001/recommendations', { teams, workload });
return data;
} catch (error) {
this.logger.error('AI microservice error (getTeamRecommendations):', error.message);
return { message: 'AI microservice unavailable', error: error.message };
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
  // Set status to EN_DIFFICULTE or similar
  const bordereau = await this.prisma.bordereau.update({
    where: { id },
    data: {
      statut: { set: Statut.EN_DIFFICULTE },
      // Optionally, clear assignedToUserId to return to team leader
      assignedToUserId: null,
    },
    include: { client: true, contract: true },
  });

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

// --- AI Integration (stubs) ---
/**
 * Predict required resources using AI microservice
 */
async getPredictResourcesAI(payload: any): Promise<any> {
  try {
    const { data } = await axios.post('http://localhost:8001/predict_resources', payload);
    return data;
  } catch (error) {
    return { message: 'AI microservice unavailable', error: error.message };
  }
}

/**
 * Analyze complaints using AI (stub)
 */
async analyzeComplaintsAI(): Promise<{ message: string; analysis?: any }> {
  // Placeholder for future AI integration
  return { message: 'AI complaint analysis not implemented yet.' };
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
// Example: Prioritize bordereaux by risk (SLA breach, overdue, high montant, etc.)
const bordereaux = await this.prisma.bordereau.findMany({
where: { statut: { not: 'CLOTURE' } },
include: { client: true, contract: true },
});
// Simple scoring: overdue +2, close to SLA +1, montant > 10k +1
const now = new Date();
const recommendations = bordereaux.map(b => {
let score = 0;
const daysSinceReception = b.dateReception ? (now.getTime() - new Date(b.dateReception).getTime()) / (1000 * 60 * 60 * 24) : 0;
let slaThreshold = 5;
if (b.contract && typeof b.contract.delaiReglement === 'number') slaThreshold = b.contract.delaiReglement;
else if (b.client && typeof b.client.reglementDelay === 'number') slaThreshold = b.client.reglementDelay;
if (daysSinceReception > slaThreshold) score += 2;
else if (daysSinceReception > slaThreshold - 2) score += 1;
const bWithMontant = b as any as { montant?: number };
if (bWithMontant.montant && bWithMontant.montant > 10000) score += 1;
return { id: b.id, reference: b.reference, score, daysSinceReception, slaThreshold };
});
recommendations.sort((a, b) => b.score - a.score);
return { message: 'AI prioritization complete.', recommendations };
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
}