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
  }



  // FIND ONE (with access control)
  async findOne(id: string, user?: any) {
    const bs = await this.prisma.bulletinSoin.findUnique({
      where: { id: String(id) },
      include: { items: true, expertises: true, logs: true },
    });
    if (!bs || bs.deletedAt) {
      throw new NotFoundException('Bulletin de soin not found');
    }
    if (user?.role === 'gestionnaire' && bs.ownerId !== user.id) {
      throw new ForbiddenException('Access denied');
    }
    return bs;
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

  // CREATE with optimized load balancing (1 query instead of N)
  async create(dto: CreateBulletinSoinDto) {
    let ownerId: string | undefined = dto.ownerId ? String(dto.ownerId) : undefined;
    if (!ownerId) {
      // Optimized: Use groupBy instead of N queries
      const workloadGrouped = await this.prisma.bulletinSoin.groupBy({
        by: ['ownerId'],
        where: { etat: { in: ['IN_PROGRESS', 'EN_COURS'] }, deletedAt: null },
        _count: true
      });
      
      const gestionnaires = await this.prisma.user.findMany({ 
        where: { role: { in: ['GESTIONNAIRE', 'gestionnaire'] }, active: true },
        select: { id: true }
      });
      
      const workloadMap = new Map(workloadGrouped.map(g => [g.ownerId, g._count]));
      let minCount = Number.POSITIVE_INFINITY;
      
      for (const g of gestionnaires) {
        const count = workloadMap.get(g.id) || 0;
        if (count < minCount) {
          minCount = count;
          ownerId = g.id;
        }
      }
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
          action: `Assigné: ${bs.ownerId || 'null'} → ${dto.ownerId} par ${user.fullName || user.email}`,
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
          risk: 'CALCULATED' // Dynamic risk calculated based on team average
        };
      })
    );
    
    // Calculate dynamic risk thresholds based on team average
    const teamAvg = workloadStats.reduce((sum, s) => sum + s.workload, 0) / workloadStats.length;
    workloadStats.forEach(s => {
      s.risk = s.workload > teamAvg * 1.5 ? 'HIGH' : s.workload > teamAvg * 1.2 ? 'MEDIUM' : 'LOW';
    });
    
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

  // ENTERPRISE-LEVEL REBALANCING: Performance-aware with transaction safety
  async suggestRebalancing() {
    const stats = await this.getTeamWorkloadStats();
    
    if (stats.length < 2) return [];

    const teamAvgWorkload = stats.reduce((sum, s) => sum + s.workload, 0) / stats.length;
    const teamAvgScore = stats.reduce((sum, s) => sum + (s.total > 0 ? s.validated / s.total : 0), 0) / stats.length;
    
    // Dynamic threshold based on team average (not hardcoded)
    const overloaded = stats.filter(s => s.workload > teamAvgWorkload * 1.5).sort((a, b) => b.workload - a.workload);
    
    // Smart receiver selection: if team efficiency is very low (<10%), only use workload
    const receivers = stats
      .filter(s => {
        if (teamAvgScore < 0.1) return s.workload < teamAvgWorkload; // Low efficiency team: only workload
        const performance = s.total > 0 ? s.validated / s.total : 0;
        return performance >= teamAvgScore * 0.8 && s.workload < teamAvgWorkload;
      })
      .sort((a, b) => {
        const perfA = a.total > 0 ? a.validated / a.total : 0;
        const perfB = b.total > 0 ? b.validated / b.total : 0;
        if (perfB !== perfA) return perfB - perfA;
        return a.workload - b.workload;
      });

    if (overloaded.length === 0 || receivers.length === 0) return [];

    const suggestions: any[] = [];

    for (const source of overloaded) {
      // Find least loaded receiver (not always the same one)
      const availableReceivers = receivers.filter(r => !suggestions.some(s => s.to === r.id));
      if (availableReceivers.length === 0) break;
      
      const target = availableReceivers.sort((a, b) => a.workload - b.workload)[0];
      if (!target || target.workload >= source.workload - 20) continue;

      const excess = source.workload - teamAvgWorkload;
      const transferAmount = Math.floor(excess * 0.5);
      
      if (transferAmount < 5) continue;

      const candidateDocs = await this.prisma.document.findMany({
        where: { 
          assignedToUserId: source.id, 
          status: { in: ['EN_COURS', 'UPLOADED'] }
        },
        select: { id: true, name: true, type: true, priority: true },
        orderBy: [{ priority: 'asc' }, { uploadedAt: 'asc' }],
        take: transferAmount
      });

      if (candidateDocs.length === 0) continue;

      const [sourceDocsCount, sourceBsCount, sourceBordCount, sourceReclCount] = await Promise.all([
        this.prisma.document.count({ where: { assignedToUserId: source.id, status: { in: ['EN_COURS', 'UPLOADED'] } } }),
        this.prisma.bulletinSoin.count({ where: { ownerId: source.id, etat: { in: ['IN_PROGRESS', 'EN_COURS'] }, deletedAt: null } }),
        this.prisma.bordereau.count({ where: { currentHandlerId: source.id, statut: { notIn: ['CLOTURE', 'PAYE', 'REJETE'] } } }),
        this.prisma.reclamation.count({ where: { assignedToId: source.id, status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING'] } } })
      ]);

      const [targetDocsCount, targetBsCount, targetBordCount, targetReclCount] = await Promise.all([
        this.prisma.document.count({ where: { assignedToUserId: target.id, status: { in: ['EN_COURS', 'UPLOADED'] } } }),
        this.prisma.bulletinSoin.count({ where: { ownerId: target.id, etat: { in: ['IN_PROGRESS', 'EN_COURS'] }, deletedAt: null } }),
        this.prisma.bordereau.count({ where: { currentHandlerId: target.id, statut: { notIn: ['CLOTURE', 'PAYE', 'REJETE'] } } }),
        this.prisma.reclamation.count({ where: { assignedToId: target.id, status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING'] } } })
      ]);

      const priority = excess > 100 ? 1 : excess > 50 ? 2 : 3;
      const impact = excess > 100 ? 'Élevé' : excess > 50 ? 'Moyen' : 'Faible';
      const sourcePerf = source.total > 0 ? (source.validated / source.total * 100).toFixed(0) : '0';
      const targetPerf = target.total > 0 ? (target.validated / target.total * 100).toFixed(0) : '0';

      suggestions.push({
        from: source.id,
        fromName: source.fullName,
        fromWorkload: `${source.workload} éléments (${sourceDocsCount} docs, ${sourceBsCount} BS, ${sourceBordCount} bord, ${sourceReclCount} récl)`,
        to: target.id,
        toName: target.fullName,
        toWorkload: `${target.workload} éléments (${targetDocsCount} docs, ${targetBsCount} BS, ${targetBordCount} bord, ${targetReclCount} récl)`,
        priority,
        impact,
        documentCount: candidateDocs.length,
        documentIds: candidateDocs.map(d => d.id),
        reason: `Transférer ${candidateDocs.length} documents de ${source.fullName} (${sourcePerf}% efficacité) → ${target.fullName} (${targetPerf}% efficacité). Impact: ${impact}.`
      });

      target.workload += candidateDocs.length;
    }

    return suggestions.sort((a, b) => a.priority - b.priority);
  }

  // APPLY REBALANCING: Execute a BULK rebalancing suggestion with transaction safety
  async applyRebalancing(suggestionData: any, toUserId: string) {
    try {
      console.log('\n🎯 === APPLY REBALANCING START ===');
      console.log('📦 Suggestion Data:', JSON.stringify(suggestionData, null, 2));
      console.log('👤 Target User ID:', toUserId);
      
      // Check if this is bulk rebalancing (new format)
      if (suggestionData.documentIds && Array.isArray(suggestionData.documentIds)) {
        const documentIds = suggestionData.documentIds;
        console.log(`📋 Document IDs to transfer: ${documentIds.length} documents`);
        console.log('📋 First 5 IDs:', documentIds.slice(0, 5));
        
        const targetUser = await this.prisma.user.findUnique({ where: { id: toUserId } });
        
        if (!targetUser) {
          console.log('❌ Target user not found:', toUserId);
          throw new NotFoundException('Target user not found');
        }

        console.log(`🔄 Starting BULK rebalancing: ${documentIds.length} documents to ${targetUser.fullName}`);
        console.log(`📤 From: ${suggestionData.fromName} (${suggestionData.from})`);
        console.log(`📥 To: ${targetUser.fullName} (${toUserId})`);

        // TRANSACTION: Ensure atomic operation (all or nothing)
        const updateResult = await this.prisma.$transaction(async (tx) => {
          return tx.document.updateMany({
            where: { 
              id: { in: documentIds },
              assignedToUserId: suggestionData.from
            },
            data: { 
              assignedToUserId: toUserId,
              assignedAt: new Date(),
              assignedByUserId: toUserId
            }
          });
        });

        console.log(`✅ BULK rebalancing completed: ${updateResult.count} documents transferred`);
        console.log(`📊 Expected: ${documentIds.length}, Actual: ${updateResult.count}`);
        
        if (updateResult.count !== documentIds.length) {
          console.log(`⚠️ WARNING: Mismatch in transfer count!`);
          console.log(`   Expected: ${documentIds.length}`);
          console.log(`   Transferred: ${updateResult.count}`);
        }
        
        console.log('🎯 === APPLY REBALANCING END ===\n');

        return { 
          success: true, 
          message: `${updateResult.count} documents transférés de ${suggestionData.fromName} vers ${targetUser.fullName}`,
          count: updateResult.count,
          details: {
            from: suggestionData.fromName,
            to: targetUser.fullName,
            documentsTransferred: updateResult.count
          }
        };
      }
      
      // Fallback: Single document transfer (old format for backward compatibility)
      const documentId = typeof suggestionData === 'string' ? suggestionData : suggestionData.bsId;
      
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

        return { success: true, message: `Document ${doc.name} transféré vers ${targetUser.fullName}`, count: 1 };
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

      return { success: true, message: `BS ${bs.numBs} transféré vers ${targetUser.fullName}`, count: 1 };
    } catch (error) {
      console.error('Apply rebalancing error:', error);
      throw error;
    }
  }

  // ENTERPRISE-LEVEL AI ASSIGNMENT: Optimized with groupBy queries (3 queries instead of 560)
  async suggestAssignment() {
    const gestionnaires = await this.prisma.user.findMany({ 
      where: { role: { in: ['GESTIONNAIRE', 'gestionnaire'] }, active: true },
      select: { id: true, fullName: true }
    });
    
    if (gestionnaires.length === 0) return [];

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // OPTIMIZATION: Use groupBy to get all workload data in parallel
    const [docsGrouped, bsGrouped, bordereauxGrouped, reclamationsGrouped, completedDocsGrouped, completedBsGrouped, completedBordereauxGrouped, completedReclamationsGrouped, recentDocsGrouped, recentBsGrouped, recentBordereauxGrouped, recentReclamationsGrouped, bsOverdueGrouped, bordereauxOverdueGrouped] = await Promise.all([
      // Current workload
      this.prisma.document.groupBy({ by: ['assignedToUserId'], where: { status: { in: ['UPLOADED', 'EN_COURS', 'SCANNE', 'RETOUR_ADMIN', 'RETOURNER_AU_SCAN'] } }, _count: true }),
      this.prisma.bulletinSoin.groupBy({ by: ['ownerId'], where: { etat: { in: ['IN_PROGRESS', 'EN_COURS'] }, deletedAt: null }, _count: true }),
      this.prisma.bordereau.groupBy({ by: ['currentHandlerId'], where: { statut: { in: ['EN_ATTENTE', 'A_SCANNER', 'SCAN_EN_COURS', 'SCANNE', 'A_AFFECTER', 'ASSIGNE', 'EN_COURS', 'TRAITE', 'PRET_VIREMENT', 'VIREMENT_EN_COURS', 'VIREMENT_EXECUTE', 'EN_DIFFICULTE', 'PARTIEL', 'MIS_EN_INSTANCE', 'RETOURNE'] } }, _count: true }),
      this.prisma.reclamation.groupBy({ by: ['assignedToId'], where: { status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING'] } }, _count: true }),
      // Completed (ALL TIME for accurate efficiency)
      this.prisma.document.groupBy({ by: ['assignedToUserId'], where: { status: { in: ['TRAITE', 'SCANNE'] } }, _count: true }),
      this.prisma.bulletinSoin.groupBy({ by: ['processedById'], where: { processedAt: { not: null }, deletedAt: null }, _count: true }),
      this.prisma.bordereau.groupBy({ by: ['currentHandlerId'], where: { statut: { in: ['CLOTURE', 'PAYE'] } }, _count: true }),
      this.prisma.reclamation.groupBy({ by: ['assignedToId'], where: { status: { in: ['RESOLVED', 'CLOSED'] } }, _count: true }),
      // Recent (7 days for throughput)
      this.prisma.document.groupBy({ by: ['assignedToUserId'], where: { status: { in: ['TRAITE', 'SCANNE'] }, uploadedAt: { gte: sevenDaysAgo } }, _count: true }),
      this.prisma.bulletinSoin.groupBy({ by: ['processedById'], where: { processedAt: { gte: sevenDaysAgo }, deletedAt: null }, _count: true }),
      this.prisma.bordereau.groupBy({ by: ['currentHandlerId'], where: { statut: { in: ['CLOTURE', 'PAYE'] }, updatedAt: { gte: sevenDaysAgo } }, _count: true }),
      this.prisma.reclamation.groupBy({ by: ['assignedToId'], where: { status: { in: ['RESOLVED', 'CLOSED'] }, updatedAt: { gte: sevenDaysAgo } }, _count: true }),
      // Overdue
      this.prisma.bulletinSoin.groupBy({ by: ['ownerId'], where: { dueDate: { lt: now }, etat: { notIn: ['VALIDATED', 'REJECTED'] }, deletedAt: null }, _count: true }),
      this.prisma.bordereau.groupBy({ by: ['currentHandlerId'], where: { dateLimiteTraitement: { lt: now }, statut: { notIn: ['TRAITE', 'CLOTURE', 'PAYE', 'REJETE'] } }, _count: true })
    ]);

    // Convert grouped results to maps for O(1) lookup
    const workloadMap = {
      docs: new Map(docsGrouped.map(g => [g.assignedToUserId, g._count])),
      bs: new Map(bsGrouped.map(g => [g.ownerId, g._count])),
      bordereaux: new Map(bordereauxGrouped.map(g => [g.currentHandlerId, g._count])),
      reclamations: new Map(reclamationsGrouped.map(g => [g.assignedToId, g._count]))
    };

    const completedMap = {
      docs: new Map(completedDocsGrouped.map(g => [g.assignedToUserId, g._count])),
      bs: new Map(completedBsGrouped.map(g => [g.processedById, g._count])),
      bordereaux: new Map(completedBordereauxGrouped.map(g => [g.currentHandlerId, g._count])),
      reclamations: new Map(completedReclamationsGrouped.map(g => [g.assignedToId, g._count]))
    };

    const recentMap = {
      docs: new Map(recentDocsGrouped.map(g => [g.assignedToUserId, g._count])),
      bs: new Map(recentBsGrouped.map(g => [g.processedById, g._count])),
      bordereaux: new Map(recentBordereauxGrouped.map(g => [g.currentHandlerId, g._count])),
      reclamations: new Map(recentReclamationsGrouped.map(g => [g.assignedToId, g._count]))
    };

    const overdueMap = {
      bs: new Map(bsOverdueGrouped.map(g => [g.ownerId, g._count])),
      bordereaux: new Map(bordereauxOverdueGrouped.map(g => [g.currentHandlerId, g._count]))
    };

    // Calculate stats for each gestionnaire using O(1) map lookups
    const stats = gestionnaires.map(g => {
      const docsCount = workloadMap.docs.get(g.id) || 0;
      const bsCount = workloadMap.bs.get(g.id) || 0;
      const bordereauxCount = workloadMap.bordereaux.get(g.id) || 0;
      const reclamationsCount = workloadMap.reclamations.get(g.id) || 0;
      const totalWorkload = docsCount + bsCount + bordereauxCount + reclamationsCount;

      const completedBs = completedMap.bs.get(g.id) || 0;
      const completedDocs = completedMap.docs.get(g.id) || 0;
      const completedBordereaux = completedMap.bordereaux.get(g.id) || 0;
      const completedReclamations = completedMap.reclamations.get(g.id) || 0;
      const totalCompleted = completedBs + completedDocs + completedBordereaux + completedReclamations;
      const totalAssigned = totalWorkload + totalCompleted;

      const efficiencyScore = totalAssigned > 0 ? totalCompleted / totalAssigned : 0.5;

      const bsOverdue = overdueMap.bs.get(g.id) || 0;
      const bordereauxOverdue = overdueMap.bordereaux.get(g.id) || 0;
      const totalOverdue = bsOverdue + bordereauxOverdue;

      const slaScore = totalAssigned > 0 ? 1 - (totalOverdue / totalAssigned) : 1;

      const recentBs = recentMap.bs.get(g.id) || 0;
      const recentDocs = recentMap.docs.get(g.id) || 0;
      const recentBord = recentMap.bordereaux.get(g.id) || 0;
      const recentRec = recentMap.reclamations.get(g.id) || 0;
      const recentCompleted = recentBs + recentDocs + recentBord + recentRec;
      const throughputPerDay = recentCompleted / 7;
      const throughputScore = Math.min(1, throughputPerDay / 10);

      return { 
        g, 
        totalWorkload, 
        docsCount, 
        bsCount, 
        bordereauxCount, 
        reclamationsCount,
        efficiencyScore, 
        slaScore, 
        throughputScore, 
        throughputPerDay,
        totalOverdue, 
        totalCompleted, 
        totalAssigned 
      };
    });

    const teamAvgWorkload = stats.reduce((sum, s) => sum + s.totalWorkload, 0) / stats.length;

    const results = stats.map(s => {
      const workloadScore = Math.max(0, Math.min(1, 1 - (s.totalWorkload / (teamAvgWorkload * 2))));
      const capacityDays = s.throughputPerDay > 0 ? s.totalWorkload / s.throughputPerDay : 999;
      const capacityScore = 1 - Math.min(1, capacityDays / 10);

      const aiScore = 
        (workloadScore * 0.40) +
        (s.efficiencyScore * 0.25) +
        (s.slaScore * 0.15) +
        (s.throughputScore * 0.10) +
        (capacityScore * 0.10);

      return {
        id: s.g.id,
        fullName: s.g.fullName,
        inProgress: s.totalWorkload,
        workloadBreakdown: {
          documents: s.docsCount,
          bulletinsSoin: s.bsCount,
          bordereaux: s.bordereauxCount,
          reclamations: s.reclamationsCount
        },
        overdue: s.totalOverdue,
        completed: s.totalCompleted,
        assigned: s.totalAssigned,
        efficiencyRate: s.totalAssigned > 0 ? (s.totalCompleted / s.totalAssigned * 100) : 0,
        slaRespect: s.slaScore * 100,
        throughputPerDay: s.throughputPerDay,
        capacityDays: capacityDays > 999 ? null : capacityDays,
        score: Math.max(0, Math.min(1, aiScore)),
        efficiency_score: s.efficiencyScore,
        avgProcessingHours: null
      };
    });

    results.sort((a, b) => b.score - a.score);
    return results;
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
    return this.prisma.bulletinSoin.findMany({ 
      where: { deletedAt: null },
      include: { items: true }
    });
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
    const gestionnaires = await this.prisma.user.findMany({ 
      where: { role: { in: ['GESTIONNAIRE', 'gestionnaire'] }, active: true },
      select: { id: true, fullName: true }
    });

    const metrics = await Promise.all(gestionnaires.map(async g => {
      const processed = await this.prisma.bulletinSoin.count({
        where: {
          processedById: g.id,
          processedAt: { gte: start, lte: end },
          deletedAt: null
        }
      });

      const validated = await this.prisma.bulletinSoin.count({
        where: {
          processedById: g.id,
          processedAt: { gte: start, lte: end },
          etat: 'VALIDATED',
          deletedAt: null
        }
      });

      const rejected = await this.prisma.bulletinSoin.count({
        where: {
          processedById: g.id,
          processedAt: { gte: start, lte: end },
          etat: 'REJECTED',
          deletedAt: null
        }
      });

      const avgProcessingTime = await this.prisma.bulletinSoin.findMany({
        where: {
          processedById: g.id,
          processedAt: { gte: start, lte: end },
          deletedAt: null
        },
        select: { dateCreation: true, processedAt: true }
      });

      let avgHours = 0;
      if (avgProcessingTime.length > 0) {
        const totalHours = avgProcessingTime.reduce((sum, bs) => {
          if (!bs.processedAt || !bs.dateCreation) return sum;
          return sum + ((bs.processedAt.getTime() - bs.dateCreation.getTime()) / (1000 * 60 * 60));
        }, 0);
        avgHours = totalHours / avgProcessingTime.length;
      }

      return {
        id: g.id,
        fullName: g.fullName,
        processed,
        validated,
        rejected,
        avgProcessingHours: avgHours,
        efficiency: processed > 0 ? (validated / processed) * 100 : 0
      };
    }));

    return metrics;
  }

  async analyseCharge() {
    return this.getTeamWorkloadStats();
  }

  async getBsWithReclamations() {
    const allBs = await this.prisma.bulletinSoin.findMany({
      where: { deletedAt: null },
      select: { id: true, numBs: true, nomAssure: true, etat: true, dateCreation: true }
    });

    const bsWithReclamations = await Promise.all(
      allBs.map(async bs => {
        const reclamations = await this.prisma.reclamation.findMany({
          where: { 
            OR: [
              { description: { contains: bs.numBs, mode: 'insensitive' } },
              { description: { contains: bs.nomAssure || '', mode: 'insensitive' } }
            ]
          },
          select: {
            id: true,
            type: true,
            status: true,
            severity: true,
            description: true,
            createdAt: true
          }
        });
        return reclamations.length > 0 ? { ...bs, reclamations } : null;
      })
    );

    return bsWithReclamations.filter(bs => bs !== null);
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
    
    // Optimized: Single SQL query with grouping instead of N queries
    const volumeData = await this.prisma.$queryRaw<Array<{date: Date; count: bigint}>>`
      SELECT DATE("dateCreation") as date, COUNT(*)::int as count
      FROM "BulletinSoin"
      WHERE "dateCreation" >= ${startDate}
        AND "dateCreation" <= ${endDate}
        AND "deletedAt" IS NULL
      GROUP BY DATE("dateCreation")
      ORDER BY DATE("dateCreation")
    `;
    
    return volumeData.map(v => ({
      date: new Date(v.date).toISOString().split('T')[0],
      sent: Number(v.count),
      received: Number(v.count)
    }));
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