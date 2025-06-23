import { Injectable, NotFoundException, ForbiddenException}from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBulletinSoinDto } from './dto/create-bulletin-soin.dto';
import { UpdateBulletinSoinDto } from './dto/update-bulletin-soin.dto';
import { AssignBulletinSoinDto } from './dto/assign-bulletin-soin.dto';
import { ExpertiseInfoDto } from './dto/expertise-info.dto';
import { BsLogDto } from './dto/bs-log.dto';
import { BsQueryDto } from './dto/bs-query.dto';
import { Prisma } from '@prisma/client';
import { AlertsService } from '../alerts/alerts.service';
import { OcrService } from '../ocr/ocr.service';

import { ExternalPayment, ReconciliationReport } from './reconciliation.types';
// FINANCIAL TRACKING: Get payment status for a BS

@Injectable()
export class BulletinSoinService {
  constructor(
    private prisma: PrismaService,
    private readonly alertsService: AlertsService,
    private readonly ocrService: OcrService,
  ) {}


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

  // FINANCIAL TRACKING: List all BS for a virement
  async getBsForVirement(virementId: string) {
    return this.prisma.bulletinSoin.findMany({ where: { virementId, deletedAt: null } });
  }

  // FINANCIAL TRACKING: Update payment status for a BS (called after virement confirmation)
  async markBsAsPaid(bsId: string) {
    // Optionally update a status field or log payment
    return this.prisma.bulletinSoin.update({ where: { id: bsId }, data: { etat: 'PAID' } });
  }
  

  // ADVANCED PAYMENT RECONCILIATION: Match virements with external accounting system
  async reconcilePaymentsWithAccounting(): Promise<ReconciliationReport> {
    // 1. Fetch all local virements
    const localVirements = await this.prisma.virement.findMany({ include: { bordereau: true, confirmedBy: true } });
    // 2. Fetch external payments (mocked, replace with real API call)
    const externalPayments: ExternalPayment[] = [
      // { reference: 'REF123', amount: 1000, date: '2024-06-01', matched: false }
    ];
    // 3. Match by reference, amount, and date (simple logic)
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
    // 4. Return reconciliation report
    return {
      matched: matches,
      unmatched,
      externalUnmatched: externalPayments.filter(e => !e.matched),
    };
  }

    // EXPORT: Generate Excel report of BS (placeholder logic)
  async exportBsListToExcel() {
    // Placeholder: In real code, use exceljs to generate a file buffer
    const bsList = await this.prisma.bulletinSoin.findMany({ where: { deletedAt: null } });
    // Return data for now; controller can generate file
    return bsList;
  }

  // LOAD/CAPACITY ANALYSIS: Analyse per-user load and risk
  async analyseCharge() {
    const gestionnaires = await this.prisma.user.findMany({ where: { role: 'gestionnaire' } });
    const stats = await Promise.all(gestionnaires.map(async g => {
      const inProgress = await this.prisma.bulletinSoin.count({ where: { ownerId: g.id, etat: { in: ['IN_PROGRESS', 'EN_COURS'] }, deletedAt: null } });
      // Risk: HIGH if >10, MEDIUM if >5, LOW otherwise
      let risk: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
      if (inProgress > 10) risk = 'HIGH';
      else if (inProgress > 5) risk = 'MEDIUM';
      return { id: g.id, fullName: g.fullName, inProgress, risk };
    }));
    return stats;
  }

  // RECLAMATIONS LINK: Get all BS linked to complaints (robust, works with bsId field)
  async getBsWithReclamations() {
    // Try to find all reclamations that reference a BS via bsId
    const reclamations = await this.prisma.reclamation.findMany({ where: { bsId: { not: null } } as any });
    // Fallback: if bsId does not exist, return empty
    if (!reclamations.length || !('bsId' in reclamations[0])) return [];
    const bsIds = reclamations.map((r: any) => r.bsId).filter(Boolean);
    if (bsIds.length === 0) return [];
    // Fetch all BS with those IDs
    const bsList = await this.prisma.bulletinSoin.findMany({ where: { id: { in: bsIds }, deletedAt: null } });
    // Attach reclamations to each BS
    return bsList.map(bs => ({ ...bs, reclamations: reclamations.filter((r: any) => r.bsId === bs.id) }));
  }

  // DYNAMIC SLA: Calculate dueDate based on contract (if available)
  async calculateDueDate(dateCreation: Date, contractId?: string) {
    let days = 5;
    if (contractId) {
      const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
      if (contract && contract.delaiReglement) days = contract.delaiReglement;
    }
    if (!dateCreation) throw new Error('dateCreation is required');
    return new Date(dateCreation.getTime() + days * 24 * 60 * 60 * 1000);
  }

  // REBALANCING: Suggest or perform rebalancing of BS from overloaded to underloaded gestionnaires
  async suggestRebalancing() {
    const stats = await this.analyseCharge();
    const overloaded = stats.filter(s => s.risk === 'HIGH');
    const underloaded = stats.filter(s => s.risk === 'LOW');
    // Suggest moving oldest IN_PROGRESS BS from overloaded to underloaded
    const suggestions: { bsId: string; from: string; to: string }[] = [];
    for (const over of overloaded) {
      const bsToMove = await this.prisma.bulletinSoin.findFirst({
        where: { ownerId: over.id, etat: { in: ['IN_PROGRESS', 'EN_COURS'] }, deletedAt: null },
        orderBy: { dateCreation: 'asc' },
      });
      if (bsToMove && underloaded.length > 0) {
        suggestions.push({ bsId: bsToMove.id, from: over.id, to: underloaded[0].id });
      }
    }
    return suggestions;
  }

  // PREDICTIVE IA: Estimate escalation risk for a BS (mock logic)
  async estimateEscalationRisk(bsId: string) {
    const bs = await this.prisma.bulletinSoin.findUnique({ where: { id: bsId } });
    if (!bs) return { risk: 'UNKNOWN' };
    // Mock: risk is HIGH if overdue, MEDIUM if due in <24h, LOW otherwise
    const now = new Date();
    if (bs.dueDate && bs.dueDate < now) return { risk: 'HIGH' };
    if (bs.dueDate && bs.dueDate < new Date(now.getTime() + 24 * 60 * 60 * 1000)) return { risk: 'MEDIUM' };
    return { risk: 'LOW' };
  }

    // NOTIFICATIONS: Send email for SLA breach, assignment, overload
  async sendNotification({
    to,
    subject,
    text,
  }: {
    to: string;
    subject: string;
    text: string;
  }) {
    // Use OutlookService if available
    if ((this as any).outlookService) {
      return (this as any).outlookService.sendMail(to, subject, text);
    }
    // Fallback: log to console
    console.log(`[NOTIFY] To: ${to} | Subject: ${subject} | Text: ${text}`);
    return Promise.resolve();
  }

  // NOTIFICATIONS: Send SLA alerts to all gestionnaires with overdue/approaching BS
  async notifySlaAlerts() {
    const { overdue, approaching } = await this.getSlaAlerts();
    // Get all gestionnaires
    const gestionnaires = await this.prisma.user.findMany({ where: { role: 'gestionnaire' } });
    for (const g of gestionnaires) {
      // Find their overdue/approaching BS
      const myOverdue = overdue.filter(bs => bs.ownerId === g.id);
      const myApproaching = approaching.filter(bs => bs.ownerId === g.id);
      if (myOverdue.length > 0 || myApproaching.length > 0) {
        await this.sendNotification({
          to: g.email,
          subject: 'Alerte SLA Bulletin de Soin',
          text: `Vous avez ${myOverdue.length} BS en retard et ${myApproaching.length} BS proches de la date limite.`,
        });
      }
    }
  }

  // NOTIFICATIONS: Send assignment notification
  async notifyAssignment(bsId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      await this.sendNotification({
        to: user.email,
        subject: 'Nouveau Bulletin de Soin Assigné',
        text: `Un nouveau BS vous a été assigné (ID: ${bsId}).`,
      });
    }
  }

  // NOTIFICATIONS: Send overload risk notification
  async notifyOverload(gestionnaireId: string, riskLevel: 'HIGH' | 'MEDIUM' | 'LOW') {
    const user = await this.prisma.user.findUnique({ where: { id: gestionnaireId } });
    if (user) {
      await this.sendNotification({
        to: user.email,
        subject: 'Risque de surcharge',
        text: `Votre charge de travail est actuellement : ${riskLevel}`,
      });
    }
  } 
  // CREATE
  async create(dto: CreateBulletinSoinDto) {
    // Automatic assignment if ownerId not provided
    let ownerId: string | undefined = dto.ownerId ? String(dto.ownerId) : undefined;
    if (!ownerId) {
      // Find gestionnaire with least BS in progress (etat IN_PROGRESS or EN_COURS)
      const gestionnaires = await this.prisma.user.findMany({ where: { role: 'gestionnaire' } });
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
    // SLA: set dueDate (e.g., 5 days after dateCreation)
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

  // FIND ALL (with pagination, filtering, and role-based access)
  async findAll(query: BsQueryDto, user: any) {
    const { page = 1, limit = 20, etat, ownerId, bordereauId, search } = query;
    const where: any = { deletedAt: null };

    if (user.role === 'gestionnaire') {
      where.ownerId = user.id;
    } else if (user.role === 'chef') {
      // Add logic to filter by team if needed
    }

    if (etat) where.etat = etat;
    if (ownerId) where.ownerId = ownerId;
    if (bordereauId) where.bordereauId = bordereauId;
    if (search) {
      where.OR = [
        { numBs: { contains: search, mode: 'insensitive' } },
        { nomAssure: { contains: search, mode: 'insensitive' } },
        { nomBeneficiaire: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.bulletinSoin.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { items: true, expertises: true, logs: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.bulletinSoin.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // FIND ONE (with access control)
  async findOne(id: string, user: any) {
    const bs = await this.prisma.bulletinSoin.findUnique({
      where: { id: String(id) },
      include: { items: true, expertises: true, logs: true },
    });
    if (!bs || bs.deletedAt) throw new NotFoundException('Bulletin de soin not found');
    if (user.role === 'gestionnaire' && bs.ownerId !== user.id) {
      throw new ForbiddenException('Access denied');
    }
    return bs;
  }

  // UPDATE (status, assignment, etc.)
  async update(id: string, dto: UpdateBulletinSoinDto, user: any) {
    const bs = await this.prisma.bulletinSoin.findUnique({ where: { id: String(id) } });
    if (!bs || bs.deletedAt) throw new NotFoundException('Bulletin de soin not found');
    const updateData: any = {
      ...dto,
      ownerId: dto.ownerId ?? undefined,
    };
    // Performance metrics: set processedById/processedAt if status is VALIDATED or REJECTED
    if (dto.etat && ['VALIDATED', 'REJECTED'].includes(dto.etat)) {
      updateData.processedById = user.id;
      updateData.processedAt = new Date();
    }
    // Allow updating virementId
    if ((dto as any).virementId) {
      updateData.virementId = (dto as any).virementId;
    }
    return this.prisma.bulletinSoin.update({
      where: { id: String(id) },
      data: updateData,
      include: { items: true, expertises: true, logs: true },
    });
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
  async assign(id: string, dto: AssignBulletinSoinDto, user: any) {
    const bs = await this.prisma.bulletinSoin.findUnique({ where: { id: String(id) } });
    if (!bs || bs.deletedAt) throw new NotFoundException('Bulletin de soin not found');
    return this.prisma.bulletinSoin.update({
      where: { id: String(id) },
      data: { ownerId: dto.ownerId != null ? String(dto.ownerId) : undefined },
    });
  }

  // OCR (integrate with OCR module/service)
  async getOcr(id: string, user: any) {
    const bs = await this.prisma.bulletinSoin.findUnique({ where: { id: String(id) } });
    if (!bs || bs.deletedAt) throw new NotFoundException('Bulletin de soin not found');
   return { ocrText: await this.ocrService.extractText(bs.lien) };
    // return { ocrText: bs.ocrText || 'No OCR result available' };
  }

  async getOcrText(bulletinSoinId: string): Promise<string> {
    const bs = await this.prisma.bulletinSoin.findUnique({ where: { id: String(bulletinSoinId) } });
    if (!bs || bs.deletedAt) throw new NotFoundException('Bulletin de soin not found');
    const ocrResult = await this.ocrService.extractText(bs.lien);
    return typeof ocrResult === 'string' ? ocrResult : '';
    // return bs.ocrText || 'No OCR result available';
  }

  // GET EXPERTISE
  async getExpertise(id: string, user: any) {
    const bs = await this.prisma.bulletinSoin.findUnique({
      where: { id: String(id) },
      include: { expertises: true },
    });
    if (!bs || bs.deletedAt) throw new NotFoundException('Bulletin de soin not found');
    return bs.expertises;
  }

  // UPSERT EXPERTISE (prevents duplicates)
  async upsertExpertise(p0: number, dto: ExpertiseInfoDto, bsId: string, expertiseData: ExpertiseInfoDto) {
    let dents: string | null | undefined = undefined;
    if (Array.isArray(expertiseData.dents)) {
      dents = JSON.stringify(expertiseData.dents);
    } else if (typeof expertiseData.dents === 'string') {
      dents = expertiseData.dents;
    }
    // Remove 'id' from update object to avoid Prisma type error
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

  // GET LOGS
  async getLogs(id: string, user: any) {
    const bs = await this.prisma.bulletinSoin.findUnique({
      where: { id: String(id) },
      include: { logs: true },
    });
    if (!bs || bs.deletedAt) throw new NotFoundException('Bulletin de soin not found');
    return bs.logs;
  }

  // ADD LOG
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

  // SOFT DELETE (helper)
  async softDelete(id: string) {
    return this.prisma.bulletinSoin.update({
      where: { id: String(id) },
      data: { deletedAt: new Date(), etat: 'DELETED' },
    });
  }

  // PERFORMANCE METRICS: Get number of BS processed per user per day
  async getPerformanceMetrics({ start, end }: { start: Date; end: Date }) {
    // Group by processedById and date
    const results = await this.prisma.bulletinSoin.groupBy({
      by: ['processedById'],
      where: {
        processedAt: { gte: start, lte: end },
        deletedAt: null,
      },
      _count: { id: true },
    });
    return results;
  }

  // SLA ALERTS: Get BS that are overdue or approaching deadline (e.g., due in next 24h)
  async getSlaAlerts() {
    const now = new Date();
    const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h from now
    // Overdue: dueDate < now
    const overdue = await this.prisma.bulletinSoin.findMany({
      where: {
        dueDate: { lt: now },
        etat: { not: 'VALIDATED' },
        deletedAt: null,
      },
    });
    // Approaching: dueDate >= now && dueDate < soon
    const approaching = await this.prisma.bulletinSoin.findMany({
      where: {
        dueDate: { gte: now, lt: soon },
        etat: { not: 'VALIDATED' },
        deletedAt: null,
      },
    });
    return { overdue, approaching };
  }

  // AI SUGGESTION: Suggest best gestionnaire for assignment (workload, performance)
  async suggestAssignment() {
    // Get all gestionnaires
    const gestionnaires = await this.prisma.user.findMany({ where: { role: 'gestionnaire' } });
    // For each, get count of BS in progress, overdue, and average processing time
    const stats = await Promise.all(gestionnaires.map(async g => {
      const inProgress = await this.prisma.bulletinSoin.count({ where: { ownerId: g.id, etat: { in: ['IN_PROGRESS', 'EN_COURS'] }, deletedAt: null } });
      const overdue = await this.prisma.bulletinSoin.count({ where: { ownerId: g.id, dueDate: { lt: new Date() }, etat: { not: 'VALIDATED' }, deletedAt: null } });
      const processed = await this.prisma.bulletinSoin.findMany({ where: { processedById: g.id, processedAt: { not: null }, deletedAt: null } });
      const avgTime = processed.length > 0 ? processed.reduce((sum, bs) => {
        const processedAt = bs.processedAt ? new Date(bs.processedAt) : null;
        const dateCreation = bs.dateCreation ? new Date(bs.dateCreation) : null;
        if (!processedAt || !dateCreation) return sum;
        return sum + ((processedAt.getTime() - dateCreation.getTime()) / 1000 / 60 / 60);
      }, 0) / processed.length : null;
      // Score: lower inProgress, lower overdue, lower avgTime is better
      const score = (inProgress * 2) + (overdue * 3) + (avgTime ?? 10);
      return { id: g.id, fullName: g.fullName, inProgress, overdue, avgProcessingHours: avgTime, score };
    }));
    // Sort by best score
    stats.sort((a, b) => a.score - b.score);
    return stats;
  }

  // AI SUGGESTION: Suggest daily priorities for a gestionnaire
  async suggestPriorities(gestionnaireId: string) {
    // Get all BS assigned to this gestionnaire, not validated, ordered by dueDate
    const bsList = await this.prisma.bulletinSoin.findMany({
      where: { ownerId: gestionnaireId, etat: { not: 'VALIDATED' }, deletedAt: null },
      orderBy: { dueDate: 'asc' },
    });
    // Prioritize: overdue first, then soonest dueDate
    return bsList;
  }
}