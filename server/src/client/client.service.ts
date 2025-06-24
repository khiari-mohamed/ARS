import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException // --- Complaints by client ---
 
} from '@nestjs/common';
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
      accountManagerId: query.accountManagerId,
    };
    if (user && user.role === 'manager') {
      where.accountManagerId = user.id;
    }
    return this.prisma.client.findMany({
      where,
      include: {
        accountManager: true,
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
      include: { accountManager: true, contracts: true },
    });
    if (!client) throw new NotFoundException('Client not found');
    return client;
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
            accountManagerId: payload.accountManagerId ?? '',
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
          accountManagerId: data.accountManagerId || data.prefix || undefined,
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
      { header: 'Account Manager', key: 'accountManager', width: 32 },
    ];
    clients.forEach((client: any) => {
      sheet.addRow({
        id: client.id,
        name: client.name,
        reglementDelay: client.reglementDelay,
        reclamationDelay: client.reclamationDelay,
        accountManager: client.accountManager?.fullName || client.accountManagerId || '',
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
      'Account Manager', 500, doc.y
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
        client.accountManager?.fullName || client.accountManagerId || '', 500, doc.y
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
    return this.prisma.client.create({ data: dto });
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        accountManager: true,
        contracts: true,
        bordereaux: true,
        reclamations: true,
      },
    });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  async update(id: string, dto: UpdateClientDto) {
    return this.prisma.client.update({
      where: { id },
      data: dto,
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
