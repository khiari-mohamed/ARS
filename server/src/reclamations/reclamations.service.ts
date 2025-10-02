import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReclamationDto } from './dto/create-reclamation.dto';
import { UpdateReclamationDto } from './dto/update-reclamation.dto';
import { SearchReclamationDto } from './dto/search-reclamation.dto';
import { NotificationService } from './notification.service';
import { AdvancedAnalyticsService } from './advanced-analytics.service';
import { AIClassificationService } from './ai-classification.service';
import { CustomerPortalService } from './customer-portal.service';
import { AICoreService } from './ai-core.service';
import axios from 'axios';

const AI_MICROSERVICE_URL = process.env.AI_MICROSERVICE_URL || 'http://localhost:8002';

import { Logger } from '@nestjs/common';

@Injectable()
export class ReclamationsService {
  private readonly logger = new Logger(ReclamationsService.name);

  constructor(
    private prisma: PrismaService,
    public notificationService: NotificationService,
    public advancedAnalyticsService: AdvancedAnalyticsService,
    public aiClassificationService: AIClassificationService,
    public customerPortalService: CustomerPortalService,
    private aiCore: AICoreService,
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

  // Real AI/ML prediction using trained models
  public async aiPredict(text: string, user: any) {
    this.checkRole(user, 'view');
    try {
      const result = await this.aiCore.classifyText(text);
      return {
        prediction: result.category,
        priority: result.priority,
        confidence: result.confidence
      };
    } catch (error) {
      this.logger.error('AI prediction failed:', error);
      return { prediction: 'unknown', priority: 'medium', confidence: 0 };
    }
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
      typologie: dto.typologie || undefined,
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
    
    const updateData: any = {
      ...dto,
      department: dto.department ?? old.department,
      contractId: dto.contractId ?? old.contractId,
      processId: dto.processId ?? old.processId,
      assignedToId: dto.assignedToId ?? old.assignedToId,
    };
    
    // Only allow conformite update by authorized roles
    if (dto.conformite !== undefined && ['GESTIONNAIRE', 'CHEF_EQUIPE', 'SUPER_ADMIN'].includes(user.role)) {
      updateData.conformite = dto.conformite;
      updateData.conformiteUpdatedBy = user.id;
      updateData.conformiteUpdatedAt = new Date();
    }
    
    const reclamation = await this.prisma.reclamation.update({
      where: { id },
      data: updateData,
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
    const oldReclamation = await this.prisma.reclamation.findUnique({ where: { id } });
    if (!oldReclamation) throw new NotFoundException('Reclamation not found');
    
    const reclamation = await this.prisma.reclamation.update({
      where: { id },
      data: { status: 'ESCALATED' },
    });
    await this.prisma.reclamationHistory.create({
      data: {
        reclamationId: id,
        userId: user.id,
        action: 'ESCALATE',
        fromStatus: oldReclamation.status,
        toStatus: 'ESCALATED',
      },
    });
    // Alert/notification logic
    await this.sendNotification('ESCALATED_RECLAMATION', reclamation);
    return reclamation;
  }

  async getAllReclamations(query: any, user: any) {
    this.checkRole(user, 'view');
    const where: any = {};
    
    // Apply filters
    if (query.clientId) where.clientId = query.clientId;
    if (query.status) where.status = query.status;
    if (query.severity) where.severity = query.severity;
    if (query.type) where.type = query.type;
    if (query.assignedToId) where.assignedToId = query.assignedToId;
    if (query.fromDate) {
      where.createdAt = { ...where.createdAt, gte: new Date(query.fromDate) };
    }
    if (query.toDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(query.toDate) };
    }
    
    const take = query.take ? parseInt(query.take) : 1000;
    const skip = query.skip ? parseInt(query.skip) : 0;
    
    return this.prisma.reclamation.findMany({
      where,
      include: {
        client: true,
        assignedTo: true,
        createdBy: true,
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });
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

  // AI-based correlation analysis
  async getCorrelationAI(payload: any) {
    try {
      const response = await axios.post(`${AI_MICROSERVICE_URL}/correlation`, payload);
      return response.data;
    } catch (error) {
      throw new Error('AI correlation failed: ' + error.message);
    }
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
    
    try {
      const total = await this.prisma.reclamation.count();
      
      const statusCounts = await this.prisma.reclamation.groupBy({
        by: ['status'],
        _count: { id: true }
      });
      
      let open = 0;
      let resolved = 0;
      
      statusCounts.forEach(s => {
        const status = s.status?.toUpperCase();
        if (status === 'OPEN' || status === 'OUVERTE') {
          open += s._count.id;
        } else if (status === 'RESOLVED' || status === 'RESOLU' || status === 'FERMEE') {
          resolved += s._count.id;
        }
      });
      
      const byType = await this.prisma.reclamation.groupBy({
        by: ['type'],
        _count: { id: true }
      });
      
      const severityData = await this.prisma.reclamation.groupBy({
        by: ['severity'],
        _count: { id: true }
      });
      
      const bySeverity = severityData.map(s => {
        let normalizedSeverity = s.severity;
        const sev = s.severity?.toLowerCase();
        
        if (sev === 'low' || sev === 'faible' || sev === 'basse') {
          normalizedSeverity = 'low';
        } else if (sev === 'medium' || sev === 'moyenne' || sev === 'moyen') {
          normalizedSeverity = 'medium';
        } else if (sev === 'high' || sev === 'haute' || sev === 'critical' || sev === 'critique') {
          normalizedSeverity = 'critical';
        }
        
        return {
          severity: normalizedSeverity,
          _count: s._count
        };
      });
      
      const resolvedReclamations = await this.prisma.reclamation.findMany({
        where: {
          OR: [
            { status: 'RESOLVED' },
            { status: 'RESOLU' },
            { status: 'FERMEE' }
          ]
        },
        select: {
          createdAt: true,
          updatedAt: true
        }
      });
      
      const times = resolvedReclamations.map(r => {
        const created = r.createdAt.getTime();
        const resolved = r.updatedAt.getTime();
        return resolved - created;
      });
      
      const avgResolution = times.length ? times.reduce((a,b) => a + b, 0) / times.length : 0;
      const minResolution = times.length ? Math.min(...times) : 0;
      const maxResolution = times.length ? Math.max(...times) : 0;
      
      return {
        total,
        open,
        resolved,
        byType: byType || [],
        bySeverity: bySeverity || [],
        avgResolution,
        minResolution,
        maxResolution
      };
      
    } catch (error) {
      return {
        total: 0,
        open: 0,
        resolved: 0,
        byType: [],
        bySeverity: [],
        avgResolution: 0,
        minResolution: 0,
        maxResolution: 0
      };
    }
  }

  // Complaint trend analytics (for charting)
  async trend(user: any) {
    this.checkRole(user, 'view');
    
    // Get all reclamations with their creation dates
    const reclamations = await this.prisma.reclamation.findMany({
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' }
    });
    
    // Group by date (YYYY-MM-DD)
    const dateMap = new Map<string, number>();
    
    reclamations.forEach(r => {
      const dateKey = r.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD
      dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + 1);
    });
    
    // Convert to array and sort
    const result = Array.from(dateMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    return result;
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

  // Get reclamation alerts
  async getReclamationAlerts(user: any) {
    this.checkRole(user, 'view');
    
    const now = new Date();
    const alerts: any[] = [];
    
    // Get SLA breaches
    const slaBreaches = await this.getSlaBreaches(user);
    slaBreaches.forEach(reclamation => {
      alerts.push({
        id: `sla-${reclamation.id}`,
        type: 'SLA_BREACH',
        level: 'error',
        title: 'SLA dépassé',
        message: `La réclamation ${reclamation.id} a dépassé son SLA`,
        reclamationId: reclamation.id,
        clientName: reclamation.client?.name,
        createdAt: now.toISOString(),
        read: false
      });
    });
    
    // Get critical reclamations
    const criticalReclamations = await this.prisma.reclamation.findMany({
      where: {
        severity: 'critical',
        status: { notIn: ['RESOLVED', 'RESOLU', 'FERMEE'] }
      },
      include: { client: true },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    criticalReclamations.forEach(reclamation => {
      alerts.push({
        id: `critical-${reclamation.id}`,
        type: 'SLA_CRITICAL',
        level: 'error',
        title: 'Réclamation critique',
        message: `Réclamation critique nécessitant une attention immédiate`,
        reclamationId: reclamation.id,
        clientName: reclamation.client?.name,
        createdAt: reclamation.createdAt.toISOString(),
        read: false
      });
    });
    
    // Get escalated reclamations
    const escalatedReclamations = await this.prisma.reclamation.findMany({
      where: {
        status: 'ESCALATED'
      },
      include: { client: true },
      orderBy: { updatedAt: 'desc' },
      take: 5
    });
    
    escalatedReclamations.forEach(reclamation => {
      alerts.push({
        id: `escalated-${reclamation.id}`,
        type: 'ESCALATED',
        level: 'warning',
        title: 'Réclamation escaladée',
        message: `La réclamation a été escaladée et nécessite une intervention`,
        reclamationId: reclamation.id,
        clientName: reclamation.client?.name,
        createdAt: reclamation.updatedAt.toISOString(),
        read: false
      });
    });
    
    // Get new unassigned reclamations
    const unassignedReclamations = await this.prisma.reclamation.findMany({
      where: {
        assignedToId: null,
        status: 'OPEN',
        createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } // Last 24h
      },
      include: { client: true },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    unassignedReclamations.forEach(reclamation => {
      alerts.push({
        id: `new-${reclamation.id}`,
        type: 'NEW_RECLAMATION',
        level: 'info',
        title: 'Nouvelle réclamation',
        message: `Nouvelle réclamation non assignée`,
        reclamationId: reclamation.id,
        clientName: reclamation.client?.name,
        createdAt: reclamation.createdAt.toISOString(),
        read: false
      });
    });
    
    // Sort by creation date (newest first)
    alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return alerts;
  }
  
  // Mark alert as read (stub implementation)
  async markAlertAsRead(alertId: string, user: any) {
    this.checkRole(user, 'view');
    
    // In a real implementation, you would store alert read status in database
    // For now, just return success
    return { success: true, alertId, readAt: new Date().toISOString() };
  }

  // Bulk import reclamations from Excel
  async bulkImportFromExcel(file: any, userId: string) {
    const XLSX = require('xlsx');
    
    try {
      if (!file.buffer) {
        throw new Error('Fichier non reçu correctement');
      }
      
      console.log('Processing Excel file:', file.originalname, 'Buffer size:', file.buffer.length);
      
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      console.log('Extracted', data.length, 'rows from Excel');
      
      const results = {
        successful: 0,  
        failed: 0,
        errors: [] as any[]
      };
      
      for (let i = 0; i < data.length; i++) {
        const row = data[i] as any;
        
        try {
          // Validate required fields
          if (!row.clientName || !row.type || !row.description) {
            results.errors.push({ row: i + 1, error: 'Champs requis manquants: clientName, type, description' });
            results.failed++;
            continue;
          }
          
          // Find client by name
          const client = await this.prisma.client.findFirst({
            where: {
              name: {
                contains: row.clientName,
                mode: 'insensitive'
              }
            }
          });
          
          if (!client) {
            results.errors.push({ row: i + 1, error: `Client non trouvé: ${row.clientName}` });
            results.failed++;
            continue;
          }
          
          // Find assignee if specified
          let assignedToId: string | undefined = undefined;
          if (row.assignedTo) {
            const assignee = await this.prisma.user.findFirst({
              where: {
                fullName: {
                  contains: row.assignedTo,
                  mode: 'insensitive'
                },
                role: { in: ['GESTIONNAIRE', 'CHEF_EQUIPE'] }
              }
            });
            assignedToId = assignee?.id;
          }
          
          // Create reclamation
          const reclamation = await this.prisma.reclamation.create({
            data: {
              clientId: client.id,
              type: row.type || 'AUTRE',
              severity: row.severity || 'MOYENNE',
              status: 'OPEN',
              description: row.description,
              department: row.department || 'RECLAMATIONS',
              assignedToId,
              createdById: userId
            }
          });
          
          // Create history entry
          await this.prisma.reclamationHistory.create({
            data: {
              reclamationId: reclamation.id,
              userId,
              action: 'BULK_IMPORT',
              toStatus: 'OPEN',
              description: 'Réclamation créée via import Excel'
            }
          });
          
          results.successful++;
        } catch (error) {
          results.errors.push({ row: i + 1, error: error.message });
          results.failed++;
        }
      }
      
      return results;
    } catch (error) {
      throw new Error(`Erreur lors de la lecture du fichier Excel: ${error.message}`);
    }
  }
}
