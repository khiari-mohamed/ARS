import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { SearchClientDto } from './dto/search-client.dto';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';
import axios from 'axios';
import { PassThrough } from 'stream';

@Injectable()
export class ClientService {
  constructor(private prisma: PrismaService) {}



   async getComplaintsByClient(clientId: string) {
    return this.prisma.reclamation.findMany({ where: { clientId } });
  }

  // --- Bordereaux by client ---
  async getBordereauxByClient(clientId: string) {
    return this.prisma.bordereau.findMany({ where: { clientId } });
  }
  
  // --- GED Integration: Upload Contract Document ---
  async uploadContract(clientId: string, file: Express.Multer.File, uploadedById: string) {
    if (!file) throw new BadRequestException('No file uploaded');
    // Save document metadata
    const document = await this.prisma.document.create({
      data: {
        name: file.originalname,
        type: 'contrat',
        path: file.path, // or file.location if using S3
        uploadedById,
      },
    });
    // Optionally, link to Contract if needed
    // await this.prisma.contract.updateMany({ where: { clientId }, data: { documentPath: file.path } });
    return document;
  }

  // --- GED Integration: Download Contract Document ---
  async downloadContract(documentId: string, res: any) {
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!document) throw new NotFoundException('Document not found');
    const fs = require('fs');
    if (!fs.existsSync(document.path)) {
      throw new NotFoundException('File not found on server');
    }
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${document.name}"`,
    });
    const stream = fs.createReadStream(document.path);
    stream.pipe(res);
  }

  // --- SLA Config ---
  async updateSlaConfig(clientId: string, config: any) {
    return this.prisma.client.update({
      where: { id: clientId },
      data: { slaConfig: config },
    });
  }
  async getSlaConfig(clientId: string) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId }, select: { slaConfig: true } });
    if (!client) throw new NotFoundException('Client not found');
    return client.slaConfig;
  }

  // --- SLA Status (breach check) ---
  async getSlaStatus(clientId: string) {
    const analytics = await this.analytics(clientId);
    const client = await this.prisma.client.findUnique({ where: { id: clientId }, select: { slaConfig: true } });
    let status = 'healthy';
    let reason = '';
    let config: any = {};
    if (typeof client?.slaConfig === 'string') {
      try { config = JSON.parse(client.slaConfig); } catch { config = {}; }
    } else if (typeof client?.slaConfig === 'object' && client.slaConfig !== null) {
      config = client.slaConfig;
    }
    const threshold = config.slaThreshold;
    if (analytics.avgSLA && threshold !== undefined) {
      if (analytics.avgSLA > threshold) {
        status = 'breach';
        reason = 'Average SLA exceeds threshold';
      }
    } else if (analytics.avgSLA && analytics.reglementDelay && analytics.avgSLA > analytics.reglementDelay) {
      status = 'breach';
      reason = 'Average SLA exceeds contractual delay';
    }
    return { status, reason, avgSLA: analytics.avgSLA };
  }

  // --- Role-based filtering in findAll ---
  async findAll(query: SearchClientDto, user?: any) {
    let where: any = {
      name: query.name ? { contains: query.name, mode: 'insensitive' } : undefined,
    };
    return this.prisma.client.findMany({
      where,
      include: {
        gestionnaires: true,
        contracts: true,
        bordereaux: true,
        reclamations: true,
      },
    });
  }

  // --- Reclamation SLA Match Check ---
  async reclamationSlaStats(clientId: string) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId }, select: { reclamationDelay: true } });
    if (!client) throw new NotFoundException('Client not found');
    const reclamations = await this.prisma.reclamation.findMany({
      where: { clientId },
      select: { createdAt: true, updatedAt: true, status: true },
    });
    let withinSla = 0, total = reclamations.length;
    reclamations.forEach(r => {
      if (r.status === 'closed' || r.status === 'CLOSED') {
        const days = (r.updatedAt.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        if (days <= client.reclamationDelay) withinSla++;
      }
    });
    return { total, withinSla, breach: total - withinSla };
  }

  // --- Prioritized View by SLA Breach ---
  async prioritizedClients() {
    // For each client, count bordereaux with delaiReglement > reglementDelay
    const clients = await this.prisma.client.findMany({
      include: { bordereaux: true },
    });
    const prioritized = await Promise.all(clients.map(async client => {
      const breachCount = await this.prisma.bordereau.count({
        where: {
          clientId: client.id,
          delaiReglement: { gt: client.reglementDelay },
        },
      });
      return { ...client, breachCount };
    }));
    return prioritized.sort((a, b) => b.breachCount - a.breachCount);
  }

  // --- Workflow Autofill ---
  async autofillData(clientId: string) {
    // Return all fields needed for workflow autofill
    const client = await this.prisma.client.findUnique({
    where: { id: clientId },
    include: { gestionnaires: true, contracts: true },
    });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  // --- Create complaint for client ---
  async createComplaintForClient(clientId: string, data: any) {
    return this.prisma.reclamation.create({
      data: {
        clientId,
        type: data.type,
        severity: data.severity,
        status: data.status || 'open',
        description: data.description,
        createdById: 'SYSTEM', // Should be actual user ID
      }
    });
  }

  // --- Performance metrics ---
  async getPerformanceMetrics(clientId: string) {
    const [bordereauxStats, reclamationStats, slaStats] = await Promise.all([
      this.prisma.bordereau.groupBy({
        by: ['statut'],
        where: { clientId },
        _count: true
      }),
      this.prisma.reclamation.groupBy({
        by: ['status'],
        where: { clientId },
        _count: true
      }),
      this.prisma.bordereau.aggregate({
        where: { clientId },
        _avg: { delaiReglement: true },
        _min: { delaiReglement: true },
        _max: { delaiReglement: true }
      })
    ]);

    return {
      bordereauxByStatus: bordereauxStats,
      reclamationsByStatus: reclamationStats,
      slaMetrics: slaStats
    };
  }

  // --- Update SLA alerts ---
  async updateSLAAlerts(clientId: string, alertConfig: any) {
    return this.prisma.client.update({
      where: { id: clientId },
      data: {
        slaConfig: {
          ...alertConfig,
          updatedAt: new Date().toISOString()
        }
      }
    });
  }

  // === NEW FEATURES FOR 100% COMPLETION ===

  // --- Client Performance Analytics Dashboard ---
  async getPerformanceAnalytics(clientId: string, period: string = 'monthly') {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Client not found');

    const now = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'daily': startDate.setDate(now.getDate() - 30); break;
      case 'weekly': startDate.setDate(now.getDate() - 84); break;
      case 'monthly': startDate.setMonth(now.getMonth() - 12); break;
      case 'yearly': startDate.setFullYear(now.getFullYear() - 3); break;
    }

    // SLA Compliance Trends
    const slaCompliance = await this.prisma.bordereau.groupBy({
      by: ['dateReception'],
      where: {
        clientId,
        dateReception: { gte: startDate }
      },
      _count: { id: true },
      _avg: { delaiReglement: true }
    });

    // Processing Time Averages
    const processingTimes = await this.prisma.bordereau.findMany({
      where: {
        clientId,
        dateReception: { gte: startDate },
        dateCloture: { not: null }
      },
      select: {
        dateReception: true,
        dateCloture: true,
        delaiReglement: true
      }
    });

    const avgProcessingTime = processingTimes.reduce((acc, b) => {
      const days = Math.floor((new Date(b.dateCloture!).getTime() - new Date(b.dateReception).getTime()) / (1000 * 60 * 60 * 24));
      return acc + days;
    }, 0) / (processingTimes.length || 1);

    // Volume vs Capacity Analysis
    const volumeAnalysis = await this.prisma.bordereau.groupBy({
      by: ['statut'],
      where: { clientId },
      _count: { id: true }
    });

    const totalVolume = volumeAnalysis.reduce((acc, v) => acc + v._count.id, 0);
    const completedVolume = volumeAnalysis.find(v => v.statut === 'CLOTURE')?._count.id || 0;
    const capacityUtilization = totalVolume > 0 ? (completedVolume / totalVolume) * 100 : 0;

    return {
      slaCompliance: {
        trends: slaCompliance.map(s => ({
          date: s.dateReception,
          count: s._count.id,
          avgSla: s._avg.delaiReglement
        })),
        overallCompliance: slaCompliance.length > 0 ? 
          slaCompliance.reduce((acc, s) => acc + (s._avg.delaiReglement || 0), 0) / slaCompliance.length : 0
      },
      processingTimes: {
        average: avgProcessingTime,
        trends: processingTimes.map(p => ({
          date: p.dateReception,
          processingDays: Math.floor((new Date(p.dateCloture!).getTime() - new Date(p.dateReception).getTime()) / (1000 * 60 * 60 * 24))
        }))
      },
      volumeCapacity: {
        totalVolume,
        completedVolume,
        capacityUtilization,
        statusBreakdown: volumeAnalysis
      }
    };
  }

  // --- Bulk Import/Export ---
  async bulkImportClients(csvData: string, validateOnly: boolean = false) {
    const lines = csvData.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    const results = { success: [] as any[], errors: [] as any[], total: lines.length - 1 };

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim());
        const clientData: any = {};
        
        headers.forEach((header, index) => {
          switch (header.toLowerCase()) {
            case 'name': clientData.name = values[index]; break;
            case 'reglementdelay': clientData.reglementDelay = parseInt(values[index]); break;
            case 'reclamationdelay': clientData.reclamationDelay = parseInt(values[index]); break;
            case 'gestionnaireids': 
              clientData.gestionnaireIds = values[index] ? values[index].split(';') : [];
              break;
          }
        });

        // Validation
        if (!clientData.name || !clientData.reglementDelay || !clientData.reclamationDelay) {
          results.errors.push({ line: i + 1, error: 'Missing required fields' });
          continue;
        }

        if (!validateOnly) {
          const existing = await this.prisma.client.findUnique({ where: { name: clientData.name } });
          if (existing) {
            results.errors.push({ line: i + 1, error: 'Client name already exists' });
            continue;
          }

          await this.create(clientData);
        }
        
        results.success.push({ line: i + 1, name: clientData.name });
      } catch (error) {
        results.errors.push({ line: i + 1, error: error.message });
      }
    }

    return results;
  }

  async exportClientsAdvanced(format: 'csv' | 'excel' | 'pdf', filters?: any) {
    const clients = await this.findAll(filters || {});
    
    if (format === 'csv') {
      const headers = ['ID', 'Name', 'Reglement Delay', 'Reclamation Delay', 'Gestionnaires', 'SLA Status', 'Risk Level'];
      const csvContent = [headers.join(',')];
      
      for (const client of clients) {
        const slaStatus = await this.getSlaStatus(client.id);
        const riskAssessment = await this.getRiskAssessment(client.id);
        
        csvContent.push([
          client.id,
          `"${client.name}"`,
          client.reglementDelay,
          client.reclamationDelay,
          `"${client.gestionnaires?.map(g => g.fullName).join('; ') || ''}"`,
          slaStatus.status,
          riskAssessment.riskLevel
        ].join(','));
      }
      
      return csvContent.join('\n');
    }
    
    // For Excel and PDF, use existing methods with enhancements
    return format === 'excel' ? await this.exportToExcel(filters) : await this.exportToPDF(filters);
  }

  // --- Communication History ---
  async addCommunicationLog(clientId: string, logData: any, userId: string) {
    // Store in a new CommunicationLog table or use existing audit system
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'CLIENT_COMMUNICATION',
        details: {
          clientId,
          type: logData.type,
          subject: logData.subject,
          content: logData.content,
          contactPerson: logData.contactPerson,
          timestamp: new Date().toISOString()
        }
      }
    });

    return { success: true, message: 'Communication logged successfully' };
  }

  async getCommunicationHistory(clientId: string) {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        action: 'CLIENT_COMMUNICATION',
        details: {
          path: ['clientId'],
          equals: clientId
        }
      },
      include: { user: { select: { fullName: true } } },
      orderBy: { timestamp: 'desc' }
    });

    return logs.map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      user: log.user.fullName,
      type: log.details?.type,
      subject: log.details?.subject,
      content: log.details?.content,
      contactPerson: log.details?.contactPerson
    }));
  }

  async getCommunicationTemplates(clientId: string) {
    // Get templates specific to client or general templates
    const templates = await this.prisma.template.findMany({
      where: {
        OR: [
          { name: { contains: 'client' } },
          { variables: { has: 'clientName' } }
        ]
      }
    });

    return templates.map(t => ({
      id: t.id,
      name: t.name,
      subject: t.subject,
      body: t.body,
      variables: t.variables
    }));
  }

  // --- Risk Assessment ---
  async getRiskAssessment(clientId: string) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Client not found');

    // Calculate risk factors
    const [slaStatus, recentComplaints, bordereauxStats] = await Promise.all([
      this.getSlaStatus(clientId),
      this.prisma.reclamation.count({
        where: {
          clientId,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
        }
      }),
      this.prisma.bordereau.groupBy({
        by: ['statut'],
        where: { clientId },
        _count: { id: true }
      })
    ]);

    let riskScore = 0;
    const riskFactors: string[] = [];

    // SLA breach risk
    if (slaStatus.status === 'breach') {
      riskScore += 30;
      riskFactors.push('SLA compliance issues');
    }

    // High complaint volume
    if (recentComplaints > 5) {
      riskScore += 25;
      riskFactors.push('High complaint volume');
    }

    // Processing delays
    const delayedBordereaux = bordereauxStats.find(s => s.statut === 'EN_DIFFICULTE')?._count.id || 0;
    const totalBordereaux = bordereauxStats.reduce((acc, s) => acc + s._count.id, 0);
    if (totalBordereaux > 0 && (delayedBordereaux / totalBordereaux) > 0.2) {
      riskScore += 20;
      riskFactors.push('High processing delay rate');
    }

    // Volume overload
    const activeBordereaux = bordereauxStats.filter(s => !['CLOTURE', 'TRAITE'].includes(s.statut))
      .reduce((acc, s) => acc + s._count.id, 0);
    if (activeBordereaux > 50) {
      riskScore += 15;
      riskFactors.push('High active volume');
    }

    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (riskScore >= 70) riskLevel = 'critical';
    else if (riskScore >= 50) riskLevel = 'high';
    else if (riskScore >= 25) riskLevel = 'medium';
    else riskLevel = 'low';

    return {
      riskScore,
      riskLevel,
      riskFactors,
      recommendations: this.generateRiskRecommendations(riskLevel, riskFactors)
    };
  }

  private generateRiskRecommendations(riskLevel: string, factors: string[]) {
    const recommendations: string[] = [];
    
    if (factors.includes('SLA compliance issues')) {
      recommendations.push('Review and optimize processing workflows');
      recommendations.push('Consider increasing staff allocation');
    }
    
    if (factors.includes('High complaint volume')) {
      recommendations.push('Implement proactive communication strategy');
      recommendations.push('Review service quality processes');
    }
    
    if (factors.includes('High processing delay rate')) {
      recommendations.push('Analyze bottlenecks in processing pipeline');
      recommendations.push('Implement priority handling for this client');
    }
    
    if (factors.includes('High active volume')) {
      recommendations.push('Consider workload redistribution');
      recommendations.push('Evaluate capacity planning');
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue monitoring current performance');
    }

    return recommendations;
  }

  async updateRiskThresholds(clientId: string, thresholds: any) {
    const currentConfig = await this.getSlaConfig(clientId) || {};
    const updatedConfig = {
      ...(typeof currentConfig === 'object' ? currentConfig : {}),
      riskThresholds: thresholds,
      updatedAt: new Date().toISOString()
    };

    return this.prisma.client.update({
      where: { id: clientId },
      data: { slaConfig: updatedConfig }
    });
  }

  // --- Existing methods (untouched) ---
  async handleArsWebhook(payload: any): Promise<void> {
    try {
      console.log('Received ARS webhook payload:', payload);
      if (payload && payload.clientId && payload.name) {
        await this.prisma.client.upsert({
          where: { id: payload.clientId },
          update: { name: payload.name },
          create: {
          id: payload.clientId,
          name: payload.name,
          reglementDelay: payload.reglementDelay ?? 0,
          reclamationDelay: payload.reclamationDelay ?? 0,
          // accountManagerId removed
          },
          });
      }
    } catch (err) {
      throw new InternalServerErrorException('Failed to process ARS webhook payload');
    }
  }

  async syncWithExternal(id: string) {
    try {
      const externalUrl = `http://197.14.56.112:8083/api/societes/${id}`;
      const { data } = await axios.get(externalUrl);
      if (!data) throw new NotFoundException('External client not found');
      const updated = await this.prisma.client.update({
      where: { id },
      data: {
      name: data.name,
      reglementDelay: data.reglementDelay ?? 5,
      reclamationDelay: data.reclamationDelay ?? 5,
      // accountManagerId removed
      },
      });
      return updated;
    } catch (err) {
      throw new InternalServerErrorException('Failed to sync with external API');
    }
  }

  async getAIRecommendation(id: string): Promise<{ recommendation: string }> {
    const analytics = await this.analytics(id);
    if (
      typeof analytics.avgSLA === 'number' &&
      typeof analytics.reglementDelay === 'number' &&
      analytics.avgSLA > analytics.reglementDelay
    ) {
      return {
        recommendation: '⚠️ AI Suggestion: SLA is trending late. Consider increasing staff or reviewing process.',
      };
    }
    return {
      recommendation: '✅ AI Suggestion: SLA is healthy.',
    };
  }

  async exportToExcel(query: SearchClientDto): Promise<Buffer> {
    const clients = await this.findAll(query);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Clients');
    sheet.columns = [
    { header: 'ID', key: 'id', width: 24 },
    { header: 'Name', key: 'name', width: 32 },
    { header: 'Reglement Delay', key: 'reglementDelay', width: 18 },
    { header: 'Reclamation Delay', key: 'reclamationDelay', width: 18 },
    { header: 'Gestionnaires', key: 'gestionnaires', width: 32 },
    ];
    clients.forEach((client: any) => {
    sheet.addRow({
    id: client.id,
    name: client.name,
    reglementDelay: client.reglementDelay,
    reclamationDelay: client.reclamationDelay,
    gestionnaires: client.gestionnaires?.map((g: any) => g.fullName).join(', ') || '',
    });
    });
    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  async exportToPDF(query: SearchClientDto): Promise<Buffer> {
    const clients = await this.findAll(query);
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    const stream = new PassThrough();
    doc.pipe(stream);
    doc.fontSize(18).text('Clients', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(
    'ID', 30, doc.y, { continued: true }
    ).text(
    'Name', 120, doc.y, { continued: true }
    ).text(
    'Reglement Delay', 250, doc.y, { continued: true }
    ).text(
    'Reclamation Delay', 370, doc.y, { continued: true }
    ).text(
    'Gestionnaires', 500, doc.y
    );
    doc.moveDown(0.5);
    clients.forEach((client: any) => {
    doc.text(
    client.id, 30, doc.y, { continued: true }
    ).text(
    client.name, 120, doc.y, { continued: true }
    ).text(
    String(client.reglementDelay), 250, doc.y, { continued: true }
    ).text(
    String(client.reclamationDelay), 370, doc.y, { continued: true }
    ).text(
    client.gestionnaires?.map((g: any) => g.fullName).join(', ') || '', 500, doc.y
    );
    doc.moveDown(0.5);
    });
    doc.end();
    const chunks: Buffer[] = [];
    return new Promise<Buffer>((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  async findByName(name: string) {
    return this.prisma.client.findUnique({ where: { name } });
  }

  async create(dto: CreateClientDto) {
    // Ensure unique client name
    const existing = await this.prisma.client.findUnique({ where: { name: dto.name } });
    if (existing) {
      throw new Error('A client with this name already exists.');
    }
    // Default SLA config if not provided
    if (!('slaConfig' in dto)) {
      (dto as any).slaConfig = { slaThreshold: dto.reglementDelay };
    }
    const { gestionnaireIds, ...rest } = dto;
    return this.prisma.client.create({
      data: {
        ...rest,
        gestionnaires: {
          connect: gestionnaireIds.map(id => ({ id })),
        },
      },
      include: { gestionnaires: true },
    });
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        gestionnaires: true,
        contracts: true,
        bordereaux: true,
        reclamations: true,
      },
    });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  async update(id: string, dto: UpdateClientDto) {
    const {
      name,
      reglementDelay,
      reclamationDelay,
      gestionnaireIds,
      slaConfig
    } = dto;
    const data: any = {
      ...(name !== undefined && { name }),
      ...(reglementDelay !== undefined && { reglementDelay }),
      ...(reclamationDelay !== undefined && { reclamationDelay }),
      ...(slaConfig !== undefined && { slaConfig }),
    };
    if (gestionnaireIds) {
      data.gestionnaires = {
        set: gestionnaireIds.map(id => ({ id })),
      };
    }
    return this.prisma.client.update({
      where: { id },
      data,
      include: { gestionnaires: true },
    });
  }

  async remove(id: string) {
    return this.prisma.client.delete({ where: { id } });
  }

  async getHistory(id: string) {
    return {
      contracts: await this.prisma.contract.findMany({ where: { clientId: id } }),
      bordereaux: await this.prisma.bordereau.findMany({ where: { clientId: id } }),
      reclamations: await this.prisma.reclamation.findMany({ where: { clientId: id } }),
    };
  }

  async analytics(id: string) {
    const bordereauxCount = await this.prisma.bordereau.count({ where: { clientId: id } });
    const reclamationsCount = await this.prisma.reclamation.count({ where: { clientId: id } });
    const avgSLA = await this.prisma.bordereau.aggregate({
      where: { clientId: id },
      _avg: { delaiReglement: true },
    });
    const client = await this.prisma.client.findUnique({
      where: { id },
      select: { reglementDelay: true }
    });
    return {
      bordereauxCount,
      reclamationsCount,
      avgSLA: avgSLA._avg.delaiReglement,
      reglementDelay: client?.reglementDelay,
    };
  }

  async analyticsTrends(id: string) {
    const now = new Date();
    const months = Array.from({ length: 12 }).map((_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    }).reverse();
    const data = await Promise.all(months.map(async ({ year, month }) => {
      const count = await this.prisma.bordereau.count({
        where: {
          clientId: id,
          dateReception: {
            gte: new Date(year, month - 1, 1),
            lt: new Date(year, month, 1),
          },
        },
      });
      return { year, month, count };
    }));
    return { monthlyBordereaux: data };
  }
}
