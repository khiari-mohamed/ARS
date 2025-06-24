import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReclamationDto } from './dto/create-reclamation.dto';
import { UpdateReclamationDto } from './dto/update-reclamation.dto';
import { SearchReclamationDto } from './dto/search-reclamation.dto';
import { NotificationService } from './notification.service';

@Injectable()
export class ReclamationsService {
  constructor(
    private prisma: PrismaService,
    public notificationService: NotificationService,
  ) {}





   public async bulkUpdate(ids: string[], data: any, user: any) {
    this.checkRole(user, 'update');
    // Validate input
    if (!Array.isArray(ids) || ids.length === 0) throw new Error('No IDs provided');
    // Update and log history for each
    const updates: any[] = [];
    for (const id of ids) {
      const old = await this.prisma.reclamation.findUnique({ where: { id } });
      if (!old) continue;
      const updated = await this.prisma.reclamation.update({ where: { id }, data });
      await this.prisma.reclamationHistory.create({
        data: {
          reclamationId: id,
          userId: user.id,
          action: 'BULK_UPDATE',
          fromStatus: old.status,
          toStatus: data.status || old.status,
          description: data.description || old.description,
        },
      });
      updates.push(updated);
    }
    return { updated: updates.length };
  }

  // Bulk assign multiple reclamations
  public async bulkAssign(ids: string[], assignedToId: string, user: any) {
    this.checkRole(user, 'assign');
    if (!Array.isArray(ids) || ids.length === 0) throw new Error('No IDs provided');
    if (!assignedToId) throw new Error('No assignedToId provided');
    const updates: any[] = [];
    for (const id of ids) {
      const old = await this.prisma.reclamation.findUnique({ where: { id } });
      if (!old) continue;
      const updated = await this.prisma.reclamation.update({ where: { id }, data: { assignedToId } });
      await this.prisma.reclamationHistory.create({
        data: {
          reclamationId: id,
          userId: user.id,
          action: 'BULK_ASSIGN',
          fromStatus: old.status,
          toStatus: old.status, // or updated.status if you want
          description: `Bulk assigned to ${assignedToId}`,
        },
      });
      updates.push(updated);
    }
    return { updated: updates.length };
  }

  // Get SLA breaches (production logic)
  public async getSlaBreaches(user: any) {
    this.checkRole(user, 'view');
    // Find reclamations overdue based on client/contract SLA
    const now = new Date();
    const reclamations = await this.prisma.reclamation.findMany({
      where: { status: { not: 'RESOLVED' } },
      include: { client: true, contract: true },
    });
    const breaches = reclamations.filter(r => {
      let slaDays = 7; // default
      if (r.contract && r.contract.delaiReclamation) slaDays = r.contract.delaiReclamation;
      else if (r.client && r.client.reclamationDelay) slaDays = r.client.reclamationDelay;
      const deadline = new Date(r.createdAt.getTime() + slaDays * 24 * 60 * 60 * 1000);
      return now > deadline;
    });
    return breaches;
  }

  // Trigger SLA check (production logic)
  public async checkSla(user: any) {
    this.checkRole(user, 'view');
    const breaches = await this.getSlaBreaches(user);
    for (const r of breaches) {
      // Optionally update status or notify
      await this.sendNotification('SLA_BREACH', r);
    }
    return { checked: true, breaches: breaches.length };
  }

  // Get GEC document (production logic)
  public async getGecDocument(id: string, user: any) {
    this.checkRole(user, 'view');
    // Example: check if file exists in /gec-documents
    const fs = require('fs');
    const path = `./gec-documents/${id}.pdf`;
    if (fs.existsSync(path)) {
      return { documentUrl: `/gec-documents/${id}.pdf` };
    } else {
      return { error: 'Document not found' };
    }
  }

  // AI/ML prediction (production logic, mock call)
  public async aiPredict(text: string, user: any) {
    this.checkRole(user, 'view');
    // Example: call external ML service (replace with real endpoint)
    // const response = await fetch('http://ml-service/predict', { method: 'POST', body: JSON.stringify({ text }) });
    // const result = await response.json();
    // return result;
    // For now, use a simple keyword-based mock
    if (text.toLowerCase().includes('retard')) return { prediction: 'delay' };
    if (text.toLowerCase().includes('paiement')) return { prediction: 'payment issue' };
    return { prediction: 'other' };
  }
  private checkRole(user: any, action: 'view'|'create'|'update'|'assign'|'escalate'|'delete' = 'view') {
    if (user.role === 'SUPER_ADMIN') return;
    if (user.role === 'CHEF_EQUIPE' && ['view','update','assign'].includes(action)) return;
    if (user.role === 'GESTIONNAIRE' && ['view','update'].includes(action)) return;
    if (user.role === 'CLIENT_SERVICE' && action === 'view') return;
    throw new ForbiddenException('Access denied');
  }

  // Helper: Find least-loaded user in department for auto-assignment
  public async autoAssign(department?: string): Promise<string | undefined> {
    // Find eligible users in department (active, GESTIONNAIRE or CUSTOMER_SERVICE)
    const users = await this.prisma.user.findMany({
      where: {
        ...(department ? { department } : {}),
        active: true,
        role: { in: ['GESTIONNAIRE', 'CUSTOMER_SERVICE'] },
      },
      select: { id: true },
    });
    if (!users.length) return undefined;
    const loads = await Promise.all(users.map(async u => {
      const count = await this.prisma.reclamation.count({
        where: { assignedToId: u.id, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      });
      return { id: u.id, count };
    }));
    loads.sort((a, b) => a.count - b.count);
    return loads[0].id;
  }

  async createReclamation(dto: CreateReclamationDto, user: any) {
    this.checkRole(user, 'create');
    let assignedToId = dto.assignedToId;
    // Auto-assignment if not provided
    if (!assignedToId) {
      assignedToId = await this.autoAssign(dto.department);
    }
    // Defensive: ensure client exists if clientId provided
    if (dto.clientId) {
      const client = await this.prisma.client.findUnique({ where: { id: dto.clientId } });
      if (!client) throw new Error('Linked client does not exist.');
    }
    // Defensive: ensure contract exists if contractId provided
    if (dto.contractId) {
      const contract = await this.prisma.contract.findUnique({ where: { id: dto.contractId } });
      if (!contract) throw new Error('Linked contract does not exist.');
    }
    // Defensive: ensure bordereau exists if bordereauId provided
    if (dto.bordereauId) {
      const bordereau = await this.prisma.bordereau.findUnique({ where: { id: dto.bordereauId } });
      if (!bordereau) throw new Error('Linked bordereau does not exist.');
    }
    const data: any = {
      description: dto.description,
      type: dto.type,
      severity: dto.severity,
      status: 'OPEN',
      department: dto.department,
      contractId: dto.contractId || undefined,
      processId: dto.processId || undefined,
      client: dto.clientId ? { connect: { id: dto.clientId } } : undefined,
      document: dto.documentId ? { connect: { id: dto.documentId } } : undefined,
      bordereau: dto.bordereauId ? { connect: { id: dto.bordereauId } } : undefined,
      assignedTo: assignedToId ? { connect: { id: assignedToId } } : undefined,
      createdBy: { connect: { id: user.id } },
      evidencePath: dto.evidencePath || undefined,
    };
    const reclamation = await this.prisma.reclamation.create({ data });
    await this.prisma.reclamationHistory.create({
      data: {
        reclamationId: reclamation.id,
        userId: user.id,
        action: 'CREATE',
        toStatus: 'OPEN',
        description: dto.description,
      },
    });
    // Alert/notification integration
    if (dto.severity === 'critical') {
      await this.sendNotification('CRITICAL_RECLAMATION', reclamation);
    }
    return reclamation;
  }

  async updateReclamation(id: string, dto: UpdateReclamationDto, user: any) {
    this.checkRole(user, 'update');
    const old = await this.prisma.reclamation.findUnique({ where: { id } });
    if (!old) throw new NotFoundException('Reclamation not found');
    const reclamation = await this.prisma.reclamation.update({
      where: { id },
      data: {
        ...dto,
        department: dto.department ?? old.department,
        contractId: dto.contractId ?? old.contractId,
        processId: dto.processId ?? old.processId,
        assignedToId: dto.assignedToId ?? old.assignedToId,
      },
    });
    await this.prisma.reclamationHistory.create({
      data: {
        reclamationId: id,
        userId: user.id,
        action: 'UPDATE',
        fromStatus: old.status,
        toStatus: dto.status || old.status,
        description: dto.description,
      },
    });
    // Escalation/alert logic
    if (dto.status === 'ESCALATED') {
      await this.sendNotification('ESCALATED_RECLAMATION', reclamation);
    }
    return reclamation;
  }

  async assignReclamation(id: string, assignedToId: string, user: any) {
    this.checkRole(user, 'assign');
    const reclamation = await this.prisma.reclamation.update({
      where: { id },
      data: { assignedToId },
    });
    await this.prisma.reclamationHistory.create({
      data: {
        reclamationId: id,
        userId: user.id,
        action: 'ASSIGN',
        description: `Assigned to ${assignedToId}`,
      },
    });
    return reclamation;
  }

  async escalateReclamation(id: string, user: any) {
    this.checkRole(user, 'escalate');
    const reclamation = await this.prisma.reclamation.update({
      where: { id },
      data: { status: 'ESCALATED' },
    });
    await this.prisma.reclamationHistory.create({
      data: {
        reclamationId: id,
        userId: user.id,
        action: 'ESCALATE',
        fromStatus: reclamation.status,
        toStatus: 'ESCALATED',
      },
    });
    // Alert/notification logic
    await this.sendNotification('ESCALATED_RECLAMATION', reclamation);
    return reclamation;
  }

  async getReclamation(id: string, user: any) {
    this.checkRole(user, 'view');
    return this.prisma.reclamation.findUnique({
      where: { id },
      include: {
        client: true,
        document: true,
        bordereau: true,
        assignedTo: true,
        createdBy: true,
        contract: true,
        process: true,
        history: { include: { user: true } },
      },
    });
  }

  async searchReclamations(query: SearchReclamationDto, user: any) {
    this.checkRole(user, 'view');
    const where: any = {};
    if (query.clientId) where.clientId = query.clientId;
    if (query.status) where.status = query.status;
    if (query.severity) where.severity = query.severity;
    if (query.type) where.type = query.type;
    if (query.assignedToId) where.assignedToId = query.assignedToId;
    if (query.department) where.department = query.department;
    if (query.contractId) where.contractId = query.contractId;
    if (query.processId) where.processId = query.processId;
    const take = query.take || 20;
    const skip = query.skip || 0;
    const orderBy = query.orderBy
      ? { [query.orderBy]: 'desc' as const }
      : { createdAt: 'desc' as const };
    return this.prisma.reclamation.findMany({
      where,
      include: {
        client: true,
        document: true,
        bordereau: true,
        assignedTo: true,
        createdBy: true,
        contract: true,
        process: true,
      },
      orderBy,
      take,
      skip,
    });
  }

  async getReclamationHistory(id: string, user: any) {
    this.checkRole(user, 'view');
    return this.prisma.reclamationHistory.findMany({
      where: { reclamationId: id },
      orderBy: { createdAt: 'asc' },
      include: { user: true },
    });
  }

  // AI-based analysis: detect recurrent complaints, suggest root causes
  async aiAnalysis(user: any) {
    this.checkRole(user, 'view');
    // Example: group by type, client, severity, department, contract, process
    const byType = await this.prisma.reclamation.groupBy({ by: ['type'], _count: { id: true } });
    const byClient = await this.prisma.reclamation.groupBy({ by: ['clientId'], _count: { id: true } });
    const bySeverity = await this.prisma.reclamation.groupBy({ by: ['severity'], _count: { id: true } });
    const byDepartment = await this.prisma.reclamation.groupBy({ by: ['department'], _count: { id: true } });
    const byContract = await this.prisma.reclamation.groupBy({ by: ['contractId'], _count: { id: true } });
    const byProcess = await this.prisma.reclamation.groupBy({ by: ['processId'], _count: { id: true } });
    // Advanced: find recurrent issues by description similarity (simple keyword clustering)
    const all = await this.prisma.reclamation.findMany({ select: { description: true } });
    const keywordMap: Record<string, number> = {};
    all.forEach(r => {
      const words = r.description.toLowerCase().split(/\W+/).filter(w => w.length > 3);
      words.forEach(w => { keywordMap[w] = (keywordMap[w] || 0) + 1; });
    });
    const frequentKeywords = Object.entries(keywordMap).filter(([_, c]) => c > 2).map(([k]) => k);
    const rootCause = frequentKeywords.length ? `Frequent keywords: ${frequentKeywords.join(', ')}` : 'No dominant root cause';
    return { byType, byClient, bySeverity, byDepartment, byContract, byProcess, rootCause };
  }

  // Analytics: dashboard, reporting, performance tracking
  async analytics(user: any) {
    this.checkRole(user, 'view');
    // Number of complaints (daily, weekly, by client or user)
    const total = await this.prisma.reclamation.count();
    const open = await this.prisma.reclamation.count({ where: { status: 'OPEN' } });
    const resolved = await this.prisma.reclamation.count({ where: { status: 'RESOLVED' } });
    const byType = await this.prisma.reclamation.groupBy({ by: ['type'], _count: { id: true } });
    const bySeverity = await this.prisma.reclamation.groupBy({ by: ['severity'], _count: { id: true } });
    const byDepartment = await this.prisma.reclamation.groupBy({ by: ['department'], _count: { id: true } });
    // Resolution time (avg, min, max)
    const histories = await this.prisma.reclamationHistory.findMany({
      where: { toStatus: 'RESOLVED' },
      include: { reclamation: true },
    });
    const times = histories.map(h => {
      const created = h.reclamation.createdAt.getTime();
      const resolved = h.createdAt.getTime();
      return (resolved - created) / 1000; // seconds
    });
    const avgResolution = times.length ? times.reduce((a,b)=>a+b,0)/times.length : 0;
    const minResolution = times.length ? Math.min(...times) : 0;
    const maxResolution = times.length ? Math.max(...times) : 0;
    // Performance by user/manager
    const byUser = await this.prisma.reclamation.groupBy({ by: ['assignedToId'], _count: { id: true } });
    const byManager = await this.prisma.reclamation.groupBy({ by: ['createdById'], _count: { id: true } });
    return { total, open, resolved, byType, bySeverity, byDepartment, avgResolution, minResolution, maxResolution, byUser, byManager };
  }

  // Complaint trend analytics (for charting)
  async trend(user: any) {
    this.checkRole(user, 'view');
    // Group by day
    const data = await this.prisma.reclamation.groupBy({
      by: ['createdAt'],
      _count: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    return data.map(d => ({ date: d.createdAt, count: d._count.id }));
  }

  // Complaint ➜ Task integration (stub)
  async convertToTask(id: string, user: any) {
    this.checkRole(user, 'update');
    // Stub: In real app, create a Task entity and link
    // GEC integration: generate correspondence document
    await this.generateGecDocument(id, user);
    return { taskCreated: true, reclamationId: id };
  }

  // Auto-reply template suggestion (NLP/keyword-based)
  async autoReplySuggestion(id: string, user: any) {
    this.checkRole(user, 'view');
    const rec = await this.prisma.reclamation.findUnique({ where: { id } });
    if (!rec) return { suggestion: null };
    // Simple NLP/keyword-based logic
    const desc = rec.description.toLowerCase();
    if (desc.includes('retard') || desc.includes('delay')) return { suggestion: 'Nous nous excusons pour le retard. Votre dossier est en cours de traitement.' };
    if (desc.includes('paiement') || desc.includes('payment')) return { suggestion: 'Nous analysons votre problème de paiement et reviendrons vers vous rapidement.' };
    if (desc.includes('erreur') || desc.includes('error')) return { suggestion: 'Nous avons bien noté l’erreur signalée et la corrigeons dans les plus brefs délais.' };
    return { suggestion: 'Merci pour votre retour. Nous traitons votre réclamation.' };
  }

  // Notification stub
  public async sendNotification(type: string, reclamation: any) {
    // In production: send email, push, etc.
    // Example: send to manager if critical/escalated
    // console.log(`[NOTIFICATION] ${type} for reclamation ${reclamation.id}`);
    return true;
  }

  // GEC integration stub
  public async generateGecDocument(reclamationId: string, user: any) {
    // In production: generate and link a correspondence document
    // Example: create a GEC document and link to reclamation
    // console.log(`[GEC] Generated correspondence for reclamation ${reclamationId}`);
    return true;
  }
}
