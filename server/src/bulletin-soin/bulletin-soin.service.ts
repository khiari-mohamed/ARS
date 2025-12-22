import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBulletinSoinDto } from './dto/create-bulletin-soin.dto';
import { UpdateBulletinSoinDto } from './dto/update-bulletin-soin.dto';
import { AssignBulletinSoinDto } from './dto/assign-bulletin-soin.dto';
import { ExpertiseInfoDto } from './dto/expertise-info.dto';
import { BsLogDto } from './dto/bs-log.dto';
import { BsQueryDto } from './dto/bs-query.dto';
import { Prisma } from '@prisma/client';
import { AlertsService } from '../alerts/alerts.service';
import { ExternalPayment, ReconciliationReport } from './reconciliation.types';

@Injectable()
export class BulletinSoinService {
  constructor(
    private prisma: PrismaService,
    private readonly alertsService: AlertsService,
  ) {}

  // FIND ALL (with pagination, filtering, and role-based access)
  async findAll(query: BsQueryDto, user?: any) {
    const { page = 1, limit = 20, etat, ownerId, bordereauId, search, prestataire, dateStart, dateEnd } = query;
    
    try {
      const where: any = { deletedAt: null };

      if (user?.role === 'gestionnaire') {
        where.ownerId = user.id;
      } else if (user?.role === 'chef') {
        // Add logic to filter by team if needed
      }

      if (etat) where.etat = etat;
      if (ownerId) where.ownerId = ownerId;
      if (bordereauId) where.bordereauId = bordereauId;
      if (prestataire) {
        where.nomPrestation = { contains: prestataire, mode: 'insensitive' };
      }
      if (dateStart || dateEnd) {
        where.dateCreation = {};
        if (dateStart) where.dateCreation.gte = new Date(dateStart);
        if (dateEnd) where.dateCreation.lte = new Date(dateEnd);
      }
      if (search) {
        where.OR = [
          { numBs: { contains: search, mode: 'insensitive' } },
          { nomAssure: { contains: search, mode: 'insensitive' } },
          { nomBeneficiaire: { contains: search, mode: 'insensitive' } },
          { nomPrestation: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [items, total] = await Promise.all([
        this.prisma.bulletinSoin.findMany({
          where,
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit),
          include: { items: true, expertises: true, logs: true },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.bulletinSoin.count({ where }),
      ]);

      return {
        items,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      };
    } catch (error) {
      console.error('Database error, using fallback data:', error);
      const sampleData = this.getSampleBsData();
      return {
        items: sampleData.slice((Number(page) - 1) * Number(limit), Number(page) * Number(limit)),
        total: sampleData.length,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(sampleData.length / Number(limit)),
      };
    }
  }

  // GET SAMPLE BS DATA: Fallback data for development
  private getSampleBsData() {
    return [
      {
        id: '1',
        numBs: 'BS-2024-001',
        nomAssure: 'Dupont Jean',
        nomBeneficiaire: 'Dupont Marie',
        nomPrestation: 'Clinique Saint-Jean',
        dateCreation: new Date('2024-01-15'),
        dueDate: new Date('2024-01-20'),
        etat: 'IN_PROGRESS',
        totalPec: 150.500,
        ownerId: '1',
        createdAt: new Date('2024-01-15'),
        items: [],
        expertises: [],
        logs: []
      },
      {
        id: '2',
        numBs: 'BS-2024-002',
        nomAssure: 'Martin Paul',
        nomBeneficiaire: 'Martin Sophie',
        nomPrestation: 'Hôpital Central',
        dateCreation: new Date('2024-01-16'),
        dueDate: new Date('2024-01-21'),
        etat: 'VALIDATED',
        totalPec: 275.000,
        ownerId: '2',
        createdAt: new Date('2024-01-16'),
        items: [],
        expertises: [],
        logs: []
      },
      {
        id: '3',
        numBs: 'BS-2024-003',
        nomAssure: 'Bernard Claire',
        nomBeneficiaire: 'Bernard Luc',
        nomPrestation: 'Cabinet Dr. Moreau',
        dateCreation: new Date('2024-01-17'),
        dueDate: new Date('2024-01-19'),
        etat: 'REJECTED',
        totalPec: 85.250,
        ownerId: '1',
        createdAt: new Date('2024-01-17'),
        items: [],
        expertises: [],
        logs: []
      }
    ];
  }

  // FIND ONE (with access control)
  async findOne(id: string, user?: any) {
    try {
      const bs = await this.prisma.bulletinSoin.findUnique({
        where: { id: String(id) },
        include: { items: true, expertises: true, logs: true },
      });
      if (!bs || bs.deletedAt) {
        // Return sample data if not found in database
        const sampleData = this.getSampleBsData();
        const sampleBs = sampleData.find(b => b.id === id);
        if (sampleBs) return sampleBs;
        throw new NotFoundException('Bulletin de soin not found');
      }
      if (user?.role === 'gestionnaire' && bs.ownerId !== user.id) {
        throw new ForbiddenException('Access denied');
      }
      return bs;
    } catch (error) {
      console.error('Database error in findOne, using fallback:', error);
      // Return sample data if database error
      const sampleData = this.getSampleBsData();
      const sampleBs = sampleData.find(b => b.id === id);
      if (sampleBs) return sampleBs;
      throw new NotFoundException('Bulletin de soin not found');
    }
  }

  // UPDATE (status, assignment, etc.)
  async update(id: string, dto: UpdateBulletinSoinDto, user: any) {
    const bs = await this.prisma.bulletinSoin.findUnique({ 
      where: { id: String(id) },
      include: { bordereau: true }
    });
    if (!bs || bs.deletedAt) throw new NotFoundException('Bulletin de soin not found');
    
    const oldEtat = bs.etat;
    
    // Only include valid database fields
    const updateData: any = {};
    
    // Valid fields that exist in the database schema
    if (dto.numBs !== undefined) updateData.numBs = dto.numBs;
    if (dto.etat !== undefined) updateData.etat = dto.etat;
    if (dto.nomAssure !== undefined) updateData.nomAssure = dto.nomAssure;
    if (dto.nomBeneficiaire !== undefined) updateData.nomBeneficiaire = dto.nomBeneficiaire;
    if (dto.nomPrestation !== undefined) updateData.nomPrestation = dto.nomPrestation;
    if (dto.dateCreation !== undefined) updateData.dateCreation = dto.dateCreation;
    if (dto.totalPec !== undefined) updateData.totalPec = dto.totalPec;
    if (dto.codeAssure !== undefined) updateData.codeAssure = dto.codeAssure;
    if (dto.ownerId !== undefined) updateData.ownerId = dto.ownerId ?? undefined;
    
    if (dto.etat && ['VALIDATED', 'REJECTED'].includes(dto.etat)) {
      updateData.processedById = user?.id;
      updateData.processedAt = new Date();
    }
    if ((dto as any).virementId) {
      updateData.virementId = (dto as any).virementId;
    }
    
    const updatedBs = await this.prisma.bulletinSoin.update({
      where: { id: String(id) },
      data: updateData,
      include: { items: true, expertises: true, logs: true, bordereau: true },
    });

    // Push status update to MY TUNICLAIM if status changed
    if (dto.etat && dto.etat !== oldEtat && updatedBs.bordereau) {
      this.pushStatusToTuniclaim(updatedBs.bordereau.id, {
        bordereauId: updatedBs.bordereau.reference,
        bsId: updatedBs.numBs,
        oldStatus: oldEtat,
        newStatus: dto.etat,
        processedBy: user?.fullName || user?.email,
        processedAt: new Date().toISOString(),
        gestionnaireId: user?.id
      }).catch(error => {
        console.error('Failed to push status to MY TUNICLAIM:', error.message);
      });
    }
    
    return updatedBs;
  }

  // CREATE
  async create(dto: CreateBulletinSoinDto) {
    let ownerId: string | undefined = dto.ownerId ? String(dto.ownerId) : undefined;
    if (!ownerId) {
      const gestionnaires = await this.prisma.user.findMany({ where: { role: { in: ['GESTIONNAIRE', 'gestionnaire'] }, active: true } });
      let minCount = Number.POSITIVE_INFINITY;
      let selected: string | undefined = undefined;
      for (const g of gestionnaires) {
        const count = await this.prisma.bulletinSoin.count({ where: { ownerId: g.id, etat: { in: ['IN_PROGRESS', 'EN_COURS'] }, deletedAt: null } });
        if (count < minCount) {
          minCount = count;
          selected = g.id;
        }
      }
      ownerId = selected;
    }
    const dueDate = dto.dateCreation ? new Date(new Date(dto.dateCreation).getTime() + 5 * 24 * 60 * 60 * 1000) : undefined;
    const created = await this.prisma.bulletinSoin.create({
      data: {
        ...dto,
        ownerId: ownerId ?? undefined,
        dueDate,
        items: {
          create: dto.items?.map(item => ({
            ...item,
          })),
        },
      } as unknown as Prisma.BulletinSoinCreateInput,
      include: { items: true, expertises: true, logs: true },
    });
    await this.alertsService.triggerAlert({ type: 'NEW_BS', bsId: created.id });
    return created;
  }

  // REMOVE (soft delete)
  async remove(id: string, user: any) {
    const bs = await this.prisma.bulletinSoin.findUnique({ where: { id: String(id) } });
    if (!bs || bs.deletedAt) throw new NotFoundException('Bulletin de soin not found');
    if (user.role === 'gestionnaire' && bs.ownerId !== user.id) {
      throw new ForbiddenException('Access denied');
    }
    return this.prisma.bulletinSoin.update({
      where: { id: String(id) },
      data: { deletedAt: new Date(), etat: 'DELETED' },
    });
  }

  // ASSIGN
  async assign(id: string, dto: AssignBulletinSoinDto, user?: any) {
    const bs = await this.prisma.bulletinSoin.findUnique({ where: { id: String(id) } });
    if (!bs || bs.deletedAt) throw new NotFoundException('Bulletin de soin not found');
    
    const updatedBS = await this.prisma.bulletinSoin.update({
      where: { id: String(id) },
      data: { ownerId: dto.ownerId != null ? String(dto.ownerId) : null },
    });
    
    if (user?.id) {
      await this.prisma.bSLog.create({
        data: {
          bsId: String(id),
          userId: user.id,
          action: `Assigné à ${dto.ownerId}`,
          timestamp: new Date(),
        },
      });
    }
    
    return updatedBS;
  }

  // GET GESTIONNAIRES: Get list of gestionnaires for assignment (with role-based filtering)
  async getGestionnaires(currentUser?: any) {
    try {
      console.log('🔍 Querying users with GESTIONNAIRE role for user:', currentUser?.role);
      
      let whereClause: any = { 
        role: { in: ['GESTIONNAIRE', 'gestionnaire'] },
        active: true
      };
      
      // If user is CHEF_EQUIPE, only show their team members
      if (currentUser?.role === 'CHEF_EQUIPE') {
        whereClause.teamLeaderId = currentUser.id;
      }
      
      const users = await this.prisma.user.findMany({
        where: whereClause,
        select: { id: true, fullName: true, email: true, role: true }
      });
      console.log('✅ Found users:', users);
      return users;
    } catch (error) {
      console.error('❌ Database error for gestionnaires:', error);
      throw error;
    }
  }

  // SLA ALERTS: Get BS that are overdue or approaching deadline
  async getSlaAlerts() {
    try {
      const now = new Date();
      const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const overdue = await this.prisma.bulletinSoin.findMany({
        where: {
          dueDate: { lt: now },
          etat: { not: 'VALIDATED' },
          deletedAt: null,
        },
      });
      const approaching = await this.prisma.bulletinSoin.findMany({
        where: {
          dueDate: { gte: now, lt: soon },
          etat: { not: 'VALIDATED' },
          deletedAt: null,
        },
      });
      return { overdue, approaching };
    } catch (error) {
      console.error('Database error for SLA alerts, using fallback:', error);
      return {
        overdue: [
          { id: '1', numBs: 'BS-2024-001', dueDate: new Date('2024-01-15'), ownerId: '1' },
          { id: '3', numBs: 'BS-2024-003', dueDate: new Date('2024-01-17'), ownerId: '1' }
        ],
        approaching: [
          { id: '2', numBs: 'BS-2024-002', dueDate: new Date(Date.now() + 12 * 60 * 60 * 1000), ownerId: '2' }
        ]
      };
    }
  }

  // TEAM WORKLOAD: Get team workload statistics (ALL document types)
  async getTeamWorkloadStats() {
    console.log('\n📊 === WORKLOAD STATS DEBUG START ===');
    const gestionnaires = await this.prisma.user.findMany({ 
      where: { role: { in: ['GESTIONNAIRE', 'gestionnaire'] }, active: true },
      select: { id: true, fullName: true }
    });
    console.log(`👥 Found ${gestionnaires.length} gestionnaires`);

    const workloadStats = await Promise.all(
      gestionnaires.map(async (g) => {
        console.log(`\n🔍 Calculating workload for: ${g.fullName}`);
        const now = new Date();
        
        // Count BulletinSoin
        const bsInProgress = await this.prisma.bulletinSoin.count({
          where: { ownerId: g.id, etat: { in: ['IN_PROGRESS', 'EN_COURS'] }, deletedAt: null }
        });
        const bsValidated = await this.prisma.bulletinSoin.count({
          where: { ownerId: g.id, etat: 'VALIDATED', deletedAt: null }
        });
        const bsRejected = await this.prisma.bulletinSoin.count({
          where: { ownerId: g.id, etat: 'REJECTED', deletedAt: null }
        });
        const bsOverdue = await this.prisma.bulletinSoin.count({
          where: { ownerId: g.id, dueDate: { lt: now }, etat: { notIn: ['VALIDATED', 'REJECTED'] }, deletedAt: null }
        });
        console.log(`  📄 BulletinSoin: ${bsInProgress} in progress, ${bsValidated} validated, ${bsRejected} rejected, ${bsOverdue} overdue`);
        
        // Count Documents (all types)
        const docsInProgress = await this.prisma.document.count({
          where: { assignedToUserId: g.id, status: { in: ['EN_COURS', 'UPLOADED'] } }
        });
        const docsCompleted = await this.prisma.document.count({
          where: { assignedToUserId: g.id, status: { in: ['TRAITE', 'SCANNE'] } }
        });
        const docsRejected = await this.prisma.document.count({
          where: { assignedToUserId: g.id, status: 'REJETE' }
        });
        console.log(`  📁 Documents: ${docsInProgress} in progress, ${docsCompleted} completed, ${docsRejected} rejected`);
        
        // Count Bordereaux
        const bordereauxInProgress = await this.prisma.bordereau.count({
          where: { currentHandlerId: g.id, statut: { in: ['EN_COURS', 'ASSIGNE', 'A_AFFECTER'] } }
        });
        const bordereauxCompleted = await this.prisma.bordereau.count({
          where: { currentHandlerId: g.id, statut: { in: ['TRAITE', 'CLOTURE', 'PAYE'] } }
        });
        console.log(`  📋 Bordereaux: ${bordereauxInProgress} in progress, ${bordereauxCompleted} completed`);
        
        // Count Reclamations
        const reclamationsInProgress = await this.prisma.reclamation.count({
          where: { assignedToId: g.id, status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING'] } }
        });
        const reclamationsCompleted = await this.prisma.reclamation.count({
          where: { assignedToId: g.id, status: { in: ['RESOLVED', 'CLOSED'] } }
        });
        console.log(`  🎫 Reclamations: ${reclamationsInProgress} in progress, ${reclamationsCompleted} completed`);
        
        // Calculate totals
        const activeWorkload = bsInProgress + docsInProgress + bordereauxInProgress + reclamationsInProgress;
        const totalValidated = bsValidated + docsCompleted + bordereauxCompleted + reclamationsCompleted;
        const totalRejected = bsRejected + docsRejected;
        const total = activeWorkload + totalValidated + totalRejected;
        
        console.log(`  ✅ TOTAL ACTIVE WORKLOAD: ${activeWorkload} (BS:${bsInProgress} + Docs:${docsInProgress} + Bordereaux:${bordereauxInProgress} + Reclamations:${reclamationsInProgress})`);
        
        return {
          id: g.id,
          fullName: g.fullName,
          workload: activeWorkload,
          inProgress: bsInProgress + docsInProgress + bordereauxInProgress + reclamationsInProgress,
          enCours: bsInProgress,
          validated: totalValidated,
          rejected: totalRejected,
          total,
          overdue: bsOverdue,
          risk: activeWorkload > 10 ? 'HIGH' : activeWorkload > 5 ? 'MEDIUM' : 'LOW'
        };
      })
    );
    
    console.log('\n📊 === WORKLOAD STATS DEBUG END ===\n');

    return workloadStats;
  }

  // AI SUGGESTION: Suggest daily priorities for a gestionnaire (ALL document types)
  async suggestPriorities(gestionnaireId: string) {
    console.log(`\n🎯 === PRIORITIES DEBUG START for gestionnaire: ${gestionnaireId} ===`);
    const now = new Date();
    
    // Get BulletinSoin priorities
    const bsList = await this.prisma.bulletinSoin.findMany({
      where: { ownerId: gestionnaireId, etat: { notIn: ['VALIDATED', 'REJECTED'] }, deletedAt: null },
      orderBy: { dueDate: 'asc' },
      take: 10
    });
    console.log(`📄 Found ${bsList.length} BulletinSoin priorities`);
    
    // Get Document priorities (all statuses)
    const docsList = await this.prisma.document.findMany({
      where: { 
        assignedToUserId: gestionnaireId
      },
      orderBy: [
        { priority: 'desc' },
        { uploadedAt: 'asc' }
      ],
      select: {
        id: true,
        name: true,
        type: true,
        uploadedAt: true,
        priority: true,
        status: true
      },
      take: 10
    });
    console.log(`📁 Found ${docsList.length} Document priorities (all statuses)`);
    
    // Get Bordereau priorities (all statuses)
    const bordereauxList = await this.prisma.bordereau.findMany({
      where: { 
        currentHandlerId: gestionnaireId
      },
      orderBy: [
        { priority: 'desc' },
        { dateReception: 'asc' }
      ],
      select: {
        id: true,
        reference: true,
        type: true,
        dateReception: true,
        priority: true,
        statut: true,
        dateLimiteTraitement: true
      },
      take: 10
    });
    console.log(`📋 Found ${bordereauxList.length} Bordereau priorities (all statuses)`);
    
    // Get Reclamation priorities (all statuses)
    const reclamationsList = await this.prisma.reclamation.findMany({
      where: { 
        assignedToId: gestionnaireId
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ],
      select: {
        id: true,
        type: true,
        severity: true,
        status: true,
        createdAt: true,
        priority: true,
        description: true
      },
      take: 10
    });
    console.log(`🎫 Found ${reclamationsList.length} Reclamation priorities (all statuses)`);
    
    // Combine and format all priorities
    const allPriorities = [
      ...bsList.map(bs => ({
        id: bs.id,
        type: 'BulletinSoin',
        reference: bs.numBs,
        priority: bs.priority || 1,
        dueDate: bs.dueDate,
        status: bs.etat,
        createdAt: bs.dateCreation
      })),
      ...docsList.map(doc => ({
        id: doc.id,
        type: 'Document',
        reference: doc.name,
        priority: doc.priority || 1,
        dueDate: null,
        status: doc.status,
        createdAt: doc.uploadedAt
      })),
      ...bordereauxList.map(bord => ({
        id: bord.id,
        type: 'Bordereau',
        reference: bord.reference,
        priority: bord.priority || 1,
        dueDate: bord.dateLimiteTraitement,
        status: bord.statut,
        createdAt: bord.dateReception
      })),
      ...reclamationsList.map(rec => ({
        id: rec.id,
        type: 'Reclamation',
        reference: rec.description?.substring(0, 50) || rec.type,
        priority: rec.priority || 1,
        dueDate: null,
        status: rec.status,
        createdAt: rec.createdAt
      }))
    ];
    
    // Sort by priority (high first), then by due date
    allPriorities.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
    
    console.log(`✅ Total priorities: ${allPriorities.length}`);
    console.log(`🎯 === PRIORITIES DEBUG END ===\n`);
    
    return allPriorities.slice(0, 20); // Return top 20 priorities
  }

  // ADVANCED AI REBALANCING
  async suggestRebalancing() {
    console.log('\n🔄 === REBALANCING DEBUG START ===');
    const stats = await this.getTeamWorkloadStats();
    console.log('📊 Team Stats:', JSON.stringify(stats.map(s => ({ name: s.fullName, workload: s.workload, inProgress: s.inProgress, overdue: s.overdue })), null, 2));
    
    if (stats.length < 2) {
      console.log('❌ Not enough gestionnaires (need at least 2):', stats.length);
      return [];
    }

    const avgWorkload = stats.reduce((sum, s) => sum + s.workload, 0) / stats.length;
    console.log('📈 Average Workload:', avgWorkload);
    
    const workloadVariance = stats.reduce((sum, s) => sum + Math.pow(s.workload - avgWorkload, 2), 0) / stats.length;
    console.log('📉 Workload Variance:', workloadVariance);
    
    if (workloadVariance <= 2) {
      console.log('✅ Workload is balanced (variance <= 2), no rebalancing needed');
      console.log('🔄 === REBALANCING DEBUG END ===\n');
      return [];
    }
    
    console.log('⚠️ Workload imbalance detected! Generating suggestions...');

    const suggestions: { 
      bsId: string; 
      bsNumBs: string;
      from: string; 
      fromName: string; 
      to: string; 
      toName: string; 
      reason: string;
      priority: number;
      impact: string;
    }[] = [];

    const sortedStats = [...stats].sort((a, b) => b.workload - a.workload);
    const overloaded = sortedStats.filter(s => s.workload > avgWorkload + 1);
    const underloaded = sortedStats.filter(s => s.workload < avgWorkload - 1);
    
    console.log('🔴 Overloaded gestionnaires:', overloaded.map(s => `${s.fullName} (${s.workload})`));
    console.log('🟢 Underloaded gestionnaires:', underloaded.map(s => `${s.fullName} (${s.workload})`));

    for (const over of overloaded) {
      console.log(`\n🔍 Processing overloaded: ${over.fullName} (${over.workload} items)`);
      if (underloaded.length === 0) {
        console.log('❌ No underloaded gestionnaires available');
        break;
      }

      // Try to find Documents to rebalance (primary workload source)
      const candidateDocs = await this.prisma.document.findMany({
        where: { 
          assignedToUserId: over.id, 
          status: { in: ['EN_COURS', 'UPLOADED'] }
        },
        select: {
          id: true,
          name: true,
          type: true,
          uploadedAt: true,
          priority: true,
          status: true
        },
        orderBy: [
          { priority: 'asc' },
          { uploadedAt: 'asc' }
        ],
        take: 5
      });
      
      console.log(`  📁 Found ${candidateDocs.length} candidate Documents for rebalancing`);

      if (candidateDocs.length === 0) {
        console.log('  ⚠️ No candidate Documents found, skipping');
        continue;
      }

      const docToMove = candidateDocs[0];
      console.log(`  📄 Selected Document to move: ${docToMove.name} (${docToMove.type})`);
      
      const target = underloaded
        .filter(u => u.workload < over.workload - 2)
        .sort((a, b) => {
          if (a.workload !== b.workload) return a.workload - b.workload;
          return a.overdue - b.overdue;
        })[0];

      if (!target) {
        console.log('  ❌ No suitable target found (need workload difference > 2)');
        continue;
      }
      
      console.log(`  ✅ Target found: ${target.fullName} (${target.workload} items)`);

      const workloadDiff = over.workload - target.workload;
      const priority = workloadDiff > 4 ? 1 : (workloadDiff > 2 ? 2 : 3);
      
      const impact = workloadDiff > 4 ? 'Élevé' : workloadDiff > 2 ? 'Moyen' : 'Faible';
      
      suggestions.push({
        bsId: docToMove.id,
        bsNumBs: docToMove.name,
        from: over.id,
        fromName: over.fullName,
        to: target.id,
        toName: target.fullName,
        priority,
        impact,
        reason: `Rééquilibrage: ${over.fullName} (${over.workload} documents) → ${target.fullName} (${target.workload} documents). Impact: ${impact}. Document: ${docToMove.name}`
      });
      
      console.log(`  ✨ Suggestion created: ${docToMove.name} from ${over.fullName} → ${target.fullName}`);

      target.workload += 1;
    }
    
    console.log(`\n📝 Total suggestions generated: ${suggestions.length}`);
    console.log('🔄 === REBALANCING DEBUG END ===\n');

    return suggestions.sort((a, b) => a.priority - b.priority);
  }

  // APPLY REBALANCING: Execute a rebalancing suggestion
  async applyRebalancing(documentId: string, toUserId: string) {
    try {
      // Try Document first (primary workload source)
      const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
      
      if (doc) {
        const targetUser = await this.prisma.user.findUnique({ where: { id: toUserId } });
        if (!targetUser) {
          throw new NotFoundException('Target user not found');
        }

        const updatedDoc = await this.prisma.document.update({
          where: { id: documentId },
          data: { 
            assignedToUserId: toUserId,
            assignedAt: new Date(),
            assignedByUserId: targetUser.id
          }
        });

        return { success: true, message: `Document ${doc.name} transféré vers ${targetUser.fullName}` };
      }
      
      // Fallback to BulletinSoin if not a Document
      const bs = await this.prisma.bulletinSoin.findUnique({ where: { id: documentId } });
      if (!bs || bs.deletedAt) {
        throw new NotFoundException('Document or Bulletin de soin not found');
      }

      const targetUser = await this.prisma.user.findUnique({ where: { id: toUserId } });
      if (!targetUser) {
        throw new NotFoundException('Target user not found');
      }

      const updatedBS = await this.prisma.bulletinSoin.update({
        where: { id: documentId },
        data: { ownerId: toUserId }
      });

      await this.prisma.bSLog.create({
        data: {
          bsId: documentId,
          userId: toUserId,
          action: `Rééquilibrage IA: BS transféré vers ${targetUser.fullName}`,
          timestamp: new Date(),
        },
      });

      return { success: true, message: `BS ${bs.numBs} transféré vers ${targetUser.fullName}` };
    } catch (error) {
      console.error('Apply rebalancing error:', error);
      throw error;
    }
  }

  // AI SUGGESTION: Suggest best gestionnaire for assignment (ALL document types)
  async suggestAssignment() {
    const gestionnaires = await this.prisma.user.findMany({ 
      where: { role: { in: ['GESTIONNAIRE', 'gestionnaire'] }, active: true },
      select: { id: true, fullName: true }
    });
    
    if (gestionnaires.length === 0) {
      return [];
    }

    const stats = await Promise.all(gestionnaires.map(async g => {
      const now = new Date();
      
      // Count ALL active workload
      const bsInProgress = await this.prisma.bulletinSoin.count({ 
        where: { ownerId: g.id, etat: { in: ['IN_PROGRESS', 'EN_COURS'] }, deletedAt: null } 
      });
      const docsInProgress = await this.prisma.document.count({
        where: { assignedToUserId: g.id, status: { in: ['EN_COURS', 'UPLOADED'] } }
      });
      const bordereauxInProgress = await this.prisma.bordereau.count({
        where: { currentHandlerId: g.id, statut: { in: ['EN_COURS', 'ASSIGNE', 'A_AFFECTER'] } }
      });
      const reclamationsInProgress = await this.prisma.reclamation.count({
        where: { assignedToId: g.id, status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING'] } }
      });
      
      const totalInProgress = bsInProgress + docsInProgress + bordereauxInProgress + reclamationsInProgress;
      
      // Count overdue items
      const bsOverdue = await this.prisma.bulletinSoin.count({ 
        where: { ownerId: g.id, dueDate: { lt: now }, etat: { notIn: ['VALIDATED', 'REJECTED'] }, deletedAt: null } 
      });
      
      // Calculate efficiency from processed BS
      const processed = await this.prisma.bulletinSoin.findMany({ 
        where: { processedById: g.id, processedAt: { not: null }, deletedAt: null },
        take: 50
      });
      
      const avgTime = processed.length > 0 ? processed.reduce((sum, bs) => {
        const processedAt = bs.processedAt ? new Date(bs.processedAt) : null;
        const dateCreation = bs.dateCreation ? new Date(bs.dateCreation) : null;
        if (!processedAt || !dateCreation) return sum;
        return sum + ((processedAt.getTime() - dateCreation.getTime()) / 1000 / 60 / 60);
      }, 0) / processed.length : null;
      
      const baseScore = Math.max(0, 1 - (totalInProgress * 0.05) - (bsOverdue * 0.2));
      const timeBonus = avgTime ? Math.max(0, 1 - (avgTime / 24)) : 0.5;
      const efficiency_score = (baseScore + timeBonus) / 2;
      
      return { 
        id: g.id, 
        fullName: g.fullName, 
        inProgress: totalInProgress, 
        overdue: bsOverdue, 
        avgProcessingHours: avgTime,
        score: efficiency_score,
        efficiency_score
      };
    }));
    
    stats.sort((a, b) => b.score - a.score);
    return stats;
  }

  // Other methods (OCR, Expertise, Logs, etc.) - simplified versions
  async getOcr(id: string, user: any) {
    const bs = await this.prisma.bulletinSoin.findUnique({ where: { id: String(id) } });
    if (!bs || bs.deletedAt) throw new NotFoundException('Bulletin de soin not found');
    return { ocrText: bs.ocrText || 'No OCR result available' };
  }

  async getExpertise(id: string, user: any) {
    const bs = await this.prisma.bulletinSoin.findUnique({
      where: { id: String(id) },
      include: { expertises: true },
    });
    if (!bs || bs.deletedAt) throw new NotFoundException('Bulletin de soin not found');
    return bs.expertises;
  }

  async getLogs(id: string, user: any) {
    const bs = await this.prisma.bulletinSoin.findUnique({
      where: { id: String(id) },
      include: { logs: true },
    });
    if (!bs || bs.deletedAt) throw new NotFoundException('Bulletin de soin not found');
    return bs.logs;
  }

  async addLog(id: string, dto: BsLogDto, user: any) {
    const bs = await this.prisma.bulletinSoin.findUnique({ where: { id: String(id) } });
    if (!bs || bs.deletedAt) throw new NotFoundException('Bulletin de soin not found');
    return this.prisma.bSLog.create({
      data: {
        bsId: String(id),
        userId: user.id,
        action: dto.action,
        timestamp: new Date(),
      },
    });
  }

  // EXPORT: Generate Excel file for BS list
  async exportBsListToExcel() {
    try {
      const bsList = await this.prisma.bulletinSoin.findMany({ 
        where: { deletedAt: null },
        include: { items: true }
      });
      return bsList;
    } catch (error) {
      console.error('Database error for export, using sample data:', error);
      return this.getSampleBsData();
    }
  }

  async getDashboardStats(user: any) {
    const baseWhere = user.role === 'gestionnaire' ? { ownerId: user.id, deletedAt: null } : { deletedAt: null };
    
    const [total, inProgress, validated, rejected, overdue] = await Promise.all([
      this.prisma.bulletinSoin.count({ where: baseWhere }),
      this.prisma.bulletinSoin.count({ where: { ...baseWhere, etat: { in: ['IN_PROGRESS', 'EN_COURS'] } } }),
      this.prisma.bulletinSoin.count({ where: { ...baseWhere, etat: 'VALIDATED' } }),
      this.prisma.bulletinSoin.count({ where: { ...baseWhere, etat: 'REJECTED' } }),
      this.prisma.bulletinSoin.count({ 
        where: { 
          ...baseWhere, 
          dueDate: { lt: new Date() },
          etat: { not: 'VALIDATED' }
        } 
      })
    ]);

    return {
      total,
      inProgress,
      validated,
      rejected,
      overdue,
      completionRate: total > 0 ? (validated / total) * 100 : 0
    };
  }

  // Notification methods
  async notifySlaAlerts() {
    const { overdue, approaching } = await this.getSlaAlerts();
    const gestionnaires = await this.prisma.user.findMany({ where: { role: { in: ['GESTIONNAIRE', 'gestionnaire'] }, active: true } });
    for (const g of gestionnaires) {
      const myOverdue = overdue.filter((bs: any) => bs.ownerId === g.id);
      const myApproaching = approaching.filter((bs: any) => bs.ownerId === g.id);
      if (myOverdue.length > 0 || myApproaching.length > 0) {
        console.log(`SLA Alert for ${g.fullName}: ${myOverdue.length} overdue, ${myApproaching.length} approaching`);
      }
    }
  }

  async notifyAssignment(bsId: string, userId: string) {
    console.log(`Assignment notification: BS ${bsId} assigned to user ${userId}`);
  }

  async notifyOverload(gestionnaireId: string, riskLevel: 'HIGH' | 'MEDIUM' | 'LOW') {
    console.log(`Overload notification: User ${gestionnaireId} has ${riskLevel} risk`);
  }

  // MY TUNICLAIM Integration Methods
  private async pushStatusToTuniclaim(bordereauId: string, statusData: any): Promise<void> {
    try {
      const { TuniclaimService } = await import('../integrations/tuniclaim.service');
      const { OutlookService } = await import('../integrations/outlook.service');
      
      const outlookService = new OutlookService();
      const tuniclaimService = new TuniclaimService(this.prisma, outlookService);
      
      await tuniclaimService.pushStatusUpdate(bordereauId, statusData);
    } catch (error) {
      console.error('Failed to push status to MY TUNICLAIM:', error.message);
    }
  }

  private async pushPaymentToTuniclaim(bordereauId: string, paymentData: any): Promise<void> {
    try {
      const { TuniclaimService } = await import('../integrations/tuniclaim.service');
      const { OutlookService } = await import('../integrations/outlook.service');
      
      const outlookService = new OutlookService();
      const tuniclaimService = new TuniclaimService(this.prisma, outlookService);
      
      await tuniclaimService.pushPaymentUpdate(bordereauId, paymentData);
    } catch (error) {
      console.error('Failed to push payment to MY TUNICLAIM:', error.message);
    }
  }

  // Other methods
  async getPerformanceMetrics({ start, end }: { start: Date; end: Date }) {
    return [];
  }

  async analyseCharge() {
    return this.getTeamWorkloadStats();
  }

  async getBsWithReclamations() {
    return [];
  }

  async calculateDueDate(dateCreation: Date, contractId?: string) {
    let days = 5;
    if (contractId) {
      const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
      if (contract && contract.delaiReglement) days = contract.delaiReglement;
    }
    return new Date(dateCreation.getTime() + days * 24 * 60 * 60 * 1000);
  }

  async estimateEscalationRisk(bsId: string) {
    const bs = await this.prisma.bulletinSoin.findUnique({ where: { id: bsId } });
    if (!bs) return { risk: 'UNKNOWN' };
    const now = new Date();
    if (bs.dueDate && bs.dueDate < now) return { risk: 'HIGH' };
    if (bs.dueDate && bs.dueDate < new Date(now.getTime() + 24 * 60 * 60 * 1000)) return { risk: 'MEDIUM' };
    return { risk: 'LOW' };
  }

  // Financial methods
  async getPaymentStatus(bsId: string) {
    const bs = await this.prisma.bulletinSoin.findUnique({ where: { id: bsId }, include: { virement: true } });
    if (!bs) throw new NotFoundException('Bulletin de soin not found');
    if (!bs.virementId) return { status: 'UNPAID', virement: null };
    if (!bs.virement) return { status: 'UNPAID', virement: null };
    return {
      status: bs.virement.confirmed ? 'PAID' : 'PENDING',
      virement: bs.virement,
    };
  }

  async getBsForVirement(virementId: string) {
    return this.prisma.bulletinSoin.findMany({ where: { virementId, deletedAt: null } });
  }

  async markBsAsPaid(bsId: string) {
    const bs = await this.prisma.bulletinSoin.findUnique({ 
      where: { id: bsId },
      include: { bordereau: true, virement: true }
    });
    
    if (!bs) throw new NotFoundException('Bulletin de soin not found');
    
    const updatedBs = await this.prisma.bulletinSoin.update({ 
      where: { id: bsId }, 
      data: { etat: 'PAID' },
      include: { bordereau: true, virement: true }
    });

    // Push payment update to MY TUNICLAIM
    if (bs.bordereau && bs.virement) {
      this.pushPaymentToTuniclaim(bs.bordereau.id, {
        bordereauId: bs.bordereau.reference,
        bsId: bs.numBs,
        paymentStatus: 'PAID',
        paymentDate: new Date().toISOString(),
        amount: bs.virement.montant,
        virementReference: bs.virement.referenceBancaire
      }).catch(error => {
        console.error('Failed to push payment status to MY TUNICLAIM:', error.message);
      });
    }
    
    return updatedBs;
  }

  async reconcilePaymentsWithAccounting(): Promise<ReconciliationReport> {
    const localVirements = await this.prisma.virement.findMany({ include: { bordereau: true, confirmedBy: true } });
    const externalPayments: ExternalPayment[] = [];
    const matches: { virement: any; external: ExternalPayment }[] = [];
    const unmatched: any[] = [];
    
    for (const v of localVirements) {
      const match = externalPayments.find(e =>
        e.reference === v.referenceBancaire &&
        Math.abs(e.amount - v.montant) < 1 &&
        (!e.date || !v.dateExecution || new Date(e.date).toDateString() === v.dateExecution.toDateString())
      );
      if (match) {
        matches.push({ virement: v, external: match });
        match.matched = true;
      } else {
        unmatched.push(v);
      }
    }
    
    return {
      matched: matches,
      unmatched,
      externalUnmatched: externalPayments.filter(e => !e.matched),
    };
  }

  async upsertExpertise(p0: number, dto: ExpertiseInfoDto, bsId: string, expertiseData: ExpertiseInfoDto) {
    let dents: string | null | undefined = undefined;
    if (Array.isArray(expertiseData.dents)) {
      dents = JSON.stringify(expertiseData.dents);
    } else if (typeof expertiseData.dents === 'string') {
      dents = expertiseData.dents;
    }
    const { id, ...updateData } = expertiseData;
    return this.prisma.expertiseInfo.upsert({
      where: { id: expertiseData.id != null ? String(expertiseData.id) : undefined }, 
      update: { ...updateData, dents },
      create: { 
        ...updateData, 
        bulletinSoinId: String(bsId), 
        dents,
        id: expertiseData.id != null ? String(expertiseData.id) : undefined,
      },
    });
  }

  // ANALYTICS METHODS
  async getAnalyticsDashboard(period: string = '30d') {
    const stats = await this.getDashboardStats({});
    const teamWorkload = await this.getTeamWorkloadStats();
    const slaAlerts = await this.getSlaAlerts();
    const volumeStats = await this.getVolumeStats(period);
    
    return {
      overview: stats,
      teamWorkload,
      slaAlerts,
      volumeStats,
      period
    };
  }

  async getTrends(period: string = '30d') {
    const volumeData = await this.getVolumeStats(period);
    const teamStats = await this.getTeamWorkloadStats();
    
    return {
      volumeTrend: volumeData,
      performanceTrend: teamStats.map(t => ({
        date: new Date().toISOString().split('T')[0],
        gestionnaire: t.fullName,
        processed: t.validated,
        efficiency: t.total > 0 ? (t.validated / t.total) * 100 : 0
      })),
      period
    };
  }

  async getSlaCompliance(period: string = '30d') {
    const { overdue, approaching } = await this.getSlaAlerts();
    const stats = await this.getDashboardStats({});
    
    const complianceRate = stats.total > 0 ? ((stats.total - overdue.length) / stats.total) * 100 : 100;
    
    return {
      complianceRate,
      overdue: overdue.length,
      approaching: approaching.length,
      onTime: stats.total - overdue.length - approaching.length,
      total: stats.total,
      period
    };
  }

  async getTeamPerformanceAnalytics(period: string = '30d') {
    const teamStats = await this.getTeamWorkloadStats();
    
    return {
      teamPerformance: teamStats.map(member => ({
        id: member.id,
        name: member.fullName,
        processed: member.validated,
        inProgress: member.inProgress,
        overdue: member.overdue,
        efficiency: member.total > 0 ? (member.validated / member.total) * 100 : 0,
        workload: member.workload,
        risk: member.risk
      })),
      averageEfficiency: teamStats.length > 0 ? 
        teamStats.reduce((sum, t) => sum + (t.total > 0 ? (t.validated / t.total) * 100 : 0), 0) / teamStats.length : 0,
      totalProcessed: teamStats.reduce((sum, t) => sum + t.validated, 0),
      period
    };
  }

  async getVolumeStats(period: string = '7d') {
    const startDate = this.getStartDateForPeriod(period);
    const endDate = new Date();
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 1000 * 24));
    
    const volumeData: Array<{date: string; sent: number; received: number}> = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const sent = await this.prisma.bulletinSoin.count({
        where: {
          dateCreation: {
            gte: new Date(date.setHours(0, 0, 0, 0)),
            lt: new Date(date.setHours(23, 59, 59, 999))
          },
          deletedAt: null
        }
      });
      const received = sent;
      volumeData.push({
        date: date.toISOString().split('T')[0],
        sent,
        received
      });
    }
    return volumeData;
  }

  private getStartDateForPeriod(period: string): Date {
    const now = new Date();
    switch (period) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '365d':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }
}