import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Society, Member, DonneurDOrdre, WireTransferBatch, WireTransfer, WireTransferBatchStatus, WireTransferBatchHistory, WireTransferHistory } from '@prisma/client';

@Injectable()
export class WireTransferService {
  // --- File Preview/Validation (no DB write) ---
  async previewBatch(file: Express.Multer.File, body: any) {
    if (!file || !file.buffer) throw new BadRequestException('No file uploaded');
    const content = file.buffer.toString('utf-8');
    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) throw new BadRequestException('File is empty');
    const transfers: any[] = [];
    const errors: any[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      try {
        const code = line.substring(0, 6).trim();
        const ref = line.substring(6, 20).trim();
        const amountStr = line.substring(32, 44).trim();
        const amount = parseFloat(amountStr) / 100; // assuming cents
        const rib = line.substring(56, 76).trim();
        const name = line.substring(110, 140).trim();
        if (!rib || isNaN(amount) || !name) throw new Error('Invalid data');
        transfers.push({ code, ref, amount, rib, name });
      } catch (e: any) {
        errors.push({ line: i + 1, error: e.message });
      }
    }
    return { success: errors.length === 0, transfers, errors };
  }

  // --- File Upload, Validation, Batch Processing ---
  async uploadAndProcessBatch(file: Express.Multer.File, body: any) {
    // Accepts a TXT file with fixed-width fields per line
    if (!file || !file.buffer) throw new BadRequestException('No file uploaded');
    const content = file.buffer.toString('utf-8');
    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) throw new BadRequestException('File is empty');

    // Example field mapping (adjust as needed):
    // [0-6]: code, [6-20]: ref, [20-32]: ?, [32-44]: amount, [44-56]: ?, [56-76]: RIB, [76-110]: name, [110-]: ...
    const transfers: any[] = [];
    const errors: any[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      try {
        const code = line.substring(0, 6).trim();
        const ref = line.substring(6, 20).trim();
        const amountStr = line.substring(32, 44).trim();
        const amount = parseFloat(amountStr) / 100; // assuming cents
        const rib = line.substring(56, 76).trim();
        const name = line.substring(110, 140).trim();
        if (!rib || isNaN(amount) || !name) throw new Error('Invalid data');
        transfers.push({ code, ref, amount, rib, name });
      } catch (e: any) {
        errors.push({ line: i + 1, error: e.message });
      }
    }
    if (errors.length > 0) {
      return { success: false, errors };
    }
    // Create batch and transfers in DB
    const batch = await this.prisma.wireTransferBatch.create({
      data: {
        societyId: body.societyId,
        donneurId: body.donneurId,
        status: WireTransferBatchStatus.CREATED,
        fileName: file.originalname,
        fileType: 'TXT',
        archived: false,
        transfers: {
          create: await Promise.all(transfers.map(async (t: any) => {
            // Find member by rib (and societyId if needed)
            let member = await this.prisma.member.findFirst({ where: { rib: t.rib } });
            let memberField: any;
            if (member) {
              memberField = { connect: { id: member.id } };
            } else {
              memberField = { create: { name: t.name, rib: t.rib, societyId: body.societyId } };
            }
            return {
              member: memberField,
              donneur: { connect: { id: body.donneurId } },
              donneurId: body.donneurId,
              amount: t.amount,
              reference: t.ref,
              status: WireTransferBatchStatus.CREATED,
            };
          }))
        }
      },
      include: { transfers: true }
    });
    return { success: true, batch };
  }
  async generateBatchPdf(batchId: string): Promise<Buffer> {
    // Simple PDF generation using PDFKit (or similar)
    const PDFDocument = require('pdfkit');
    const batch = await this.getBatch(batchId);
    const doc = new PDFDocument();
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.text(`Batch ID: ${batch.id}`);
    doc.text(`Society: ${batch.society?.name || ''}`);
    doc.text(`Donneur: ${batch.donneur?.name || ''}`);
    doc.text('Transfers:');
    batch.transfers.forEach((t: any, idx: number) => {
      doc.text(`${idx + 1}. ${t.member?.name || ''} | RIB: ${t.member?.rib || ''} | Amount: ${t.amount} | Ref: ${t.reference}`);
    });
    doc.end();
    return await new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
    });
  }
  async generateBatchTxt(batchId: string): Promise<Buffer> {
    // Export batch in fixed-width TXT format
    const batch = await this.getBatch(batchId);
    // Strict fixed-width formatting for bank requirements
    const lines = batch.transfers.map((t: any) => {
      // Adjust these field lengths and paddings as per bank spec
      const code = ("110104").padEnd(6, ' '); // 6 chars
      const ref = (t.reference || '').padEnd(14, ' '); // 14 chars
      const filler1 = ''.padEnd(12, ' '); // 12 chars
      const amount = (Math.round(t.amount * 100) + '').padStart(12, '0'); // 12 chars, zero-padded
      const filler2 = ''.padEnd(12, ' '); // 12 chars
      const rib = (t.member?.rib || '').padEnd(20, ' '); // 20 chars
      const filler3 = ''.padEnd(34, ' '); // 34 chars
      const name = (t.member?.name || '').padEnd(30, ' '); // 30 chars
      // Concatenate all fields, no delimiters
      return `${code}${ref}${filler1}${amount}${filler2}${rib}${filler3}${name}`;
    });
    return Buffer.from(lines.join('\n'), 'utf-8');
  }
  async archiveBatch(batchId: string) {
    // Mark batch as archived
    return this.prisma.wireTransferBatch.update({ where: { id: batchId }, data: { archived: true, status: WireTransferBatchStatus.ARCHIVED } });
  }
  async getDashboardStats() {
    // Get counts for batches by status
    const total = await this.prisma.wireTransferBatch.count();
    const archived = await this.prisma.wireTransferBatch.count({ where: { archived: true } });
    const processed = await this.prisma.wireTransferBatch.count({ where: { status: 'PROCESSED' } });
    const pending = await this.prisma.wireTransferBatch.count({ where: { status: WireTransferBatchStatus.CREATED } });
    return { total, archived, processed, pending };
  }

  // --- Full Analytics for Dashboard ---
  async getDashboardAnalytics(query: any, user: any) {
    // Filters: companyId, state, userId, delayMin, delayMax, periodStart, periodEnd
    const where: any = {};
    if (query.companyId) where.societyId = query.companyId;
    if (query.state) where.status = query.state.toUpperCase();
    if (query.periodStart || query.periodEnd) {
      where.createdAt = {};
      if (query.periodStart) where.createdAt.gte = new Date(query.periodStart);
      if (query.periodEnd) where.createdAt.lte = new Date(query.periodEnd);
    }
    if (query.delayMin || query.delayMax) {
      // Delay = now - createdAt (in hours)
      // We'll filter in JS after fetching
    }
    // Role-based filtering (example: only finance sees all, others see own)
    // Remove createdBy filter, as it's not present on batch model
    // if (user && user.role && user.role !== 'FINANCE') {
    //   where.createdBy = user.id;
    // }
    const batches = await this.prisma.wireTransferBatch.findMany({
      where,
      include: {
        society: true,
        donneur: true,
        transfers: true,
        history: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    // Calculate delay, KPIs, color codes
    const now = new Date();
    const analytics = batches.map(batch => {
      const delayHours = (now.getTime() - new Date(batch.createdAt).getTime()) / 36e5;
      let color = 'default';
      if (batch.status === WireTransferBatchStatus.CREATED && delayHours > 24) color = 'warning';
      if (batch.status === WireTransferBatchStatus.REJECTED) color = 'danger';
      if (batch.status === WireTransferBatchStatus.PROCESSED) color = 'success';
      return {
        id: batch.id,
        society: batch.society?.name,
        donneur: batch.donneur?.name,
        status: batch.status,
        delayHours,
        color,
        createdAt: batch.createdAt,
        updatedAt: batch.updatedAt,
        totalAmount: batch.transfers.reduce((sum, t) => sum + t.amount, 0),
        transfersCount: batch.transfers.length,
        fileName: batch.fileName,
      };
    });
    // Filter by delay if needed
    let filtered = analytics;
    if (query.delayMin) filtered = filtered.filter(a => a.delayHours >= Number(query.delayMin));
    if (query.delayMax) filtered = filtered.filter(a => a.delayHours <= Number(query.delayMax));
    return {
      analytics: filtered,
      kpis: {
        total: filtered.length,
        pending: filtered.filter(a => a.status === WireTransferBatchStatus.CREATED).length,
        processed: filtered.filter(a => a.status === WireTransferBatchStatus.PROCESSED).length,
        archived: filtered.filter(a => a.status === WireTransferBatchStatus.ARCHIVED).length,
        avgDelay: filtered.length ? (filtered.reduce((sum, a) => sum + a.delayHours, 0) / filtered.length) : 0,
      }
    };
  }

  // --- Export Analytics (Excel/PDF) ---
  async exportDashboardAnalyticsExcel(query: any, user: any) {
    const { analytics } = await this.getDashboardAnalytics(query, user);
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('WireTransferDashboard');
    sheet.columns = [
      { header: 'Batch ID', key: 'id', width: 20 },
      { header: 'Society', key: 'society', width: 20 },
      { header: 'Donneur', key: 'donneur', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Delay (h)', key: 'delayHours', width: 12 },
      { header: 'Total Amount', key: 'totalAmount', width: 15 },
      { header: 'Transfers', key: 'transfersCount', width: 10 },
      { header: 'File', key: 'fileName', width: 20 },
      { header: 'Created At', key: 'createdAt', width: 20 },
      { header: 'Updated At', key: 'updatedAt', width: 20 },
    ];
    analytics.forEach(row => sheet.addRow(row));
    return await workbook.xlsx.writeBuffer();
  }
  async exportDashboardAnalyticsPdf(query: any, user: any) {
    const { analytics } = await this.getDashboardAnalytics(query, user);
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.text('Wire Transfer Dashboard Analytics');
    analytics.forEach((row: any, idx: number) => {
      doc.text(`${idx + 1}. Batch: ${row.id} | Society: ${row.society} | Donneur: ${row.donneur} | Status: ${row.status} | Delay: ${row.delayHours.toFixed(1)}h | Amount: ${row.totalAmount}`);
    });
    doc.end();
    return await new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
    });
  }

  // --- Enhanced Alerts (delay-based, role-aware) ---
  async getAlerts(user?: any) {
    // Transfers with errors
    const errorTransfers = await this.prisma.wireTransfer.findMany({ where: { status: 'ERROR' }, include: { batch: true, member: true } });
    // Batches pending >24h
    const now = new Date();
    const pendingBatches = await this.prisma.wireTransferBatch.findMany({ where: { status: WireTransferBatchStatus.CREATED }, include: { transfers: true } });
    const delayedBatches = pendingBatches.filter(b => ((now.getTime() - new Date(b.createdAt).getTime()) / 36e5) > 24);
    // Role-based: only finance sees all, others see own
    let filteredErrorTransfers = errorTransfers;
    let filteredDelayedBatches = delayedBatches;
    // Remove createdBy filter, as it's not present on batch model
    // if (user && user.role && user.role !== 'FINANCE') {
    //   filteredErrorTransfers = errorTransfers.filter(t => t.batch?.createdBy === user.id);
    //   filteredDelayedBatches = delayedBatches.filter(b => b.createdBy === user.id);
    // }
    return {
      errorTransfers: filteredErrorTransfers,
      delayedBatches: filteredDelayedBatches,
    };
  }
  constructor(private prisma: PrismaService) {}

  // --- Society CRUD ---
  async createSociety(data: Partial<Society>) {
    if (!data.name || !data.code) throw new BadRequestException('name and code are required');
    return this.prisma.society.create({ data: { name: data.name, code: data.code } });
  }
  async getSocieties() {
    return this.prisma.society.findMany();
  }
  async getSociety(id: string) {
    const society = await this.prisma.society.findUnique({ where: { id } });
    if (!society) throw new NotFoundException('Society not found');
    return society;
  }
  async updateSociety(id: string, data: Partial<Society>) {
    return this.prisma.society.update({ where: { id }, data });
  }
  async deleteSociety(id: string) {
    return this.prisma.society.delete({ where: { id } });
  }

  // --- Member CRUD ---
  async createMember(data: Partial<Member>) {
    if (!data.name || !data.rib || !data.societyId) throw new BadRequestException('name, rib, and societyId are required');
    return this.prisma.member.create({ data: { name: data.name, rib: data.rib, societyId: data.societyId, cin: data.cin, address: data.address } });
  }
  async getMembers(societyId?: string) {
    return this.prisma.member.findMany({ where: societyId ? { societyId } : {} });
  }
  async getMember(id: string) {
    const member = await this.prisma.member.findUnique({ where: { id } });
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }
  async updateMember(id: string, data: Partial<Member>) {
    return this.prisma.member.update({ where: { id }, data });
  }
  async deleteMember(id: string) {
    return this.prisma.member.delete({ where: { id } });
  }

  // --- Donneur d'Ordre CRUD ---
  async createDonneur(data: Partial<DonneurDOrdre>) {
    if (!data.name || !data.rib || !data.societyId) throw new BadRequestException('name, rib, and societyId are required');
    return this.prisma.donneurDOrdre.create({ data: { name: data.name, rib: data.rib, societyId: data.societyId } });
  }
  async getDonneurs(societyId?: string) {
    return this.prisma.donneurDOrdre.findMany({ where: societyId ? { societyId } : {} });
  }
  async getDonneur(id: string) {
    const donneur = await this.prisma.donneurDOrdre.findUnique({ where: { id } });
    if (!donneur) throw new NotFoundException('Donneur d\'Ordre not found');
    return donneur;
  }
  async updateDonneur(id: string, data: Partial<DonneurDOrdre>) {
    return this.prisma.donneurDOrdre.update({ where: { id }, data });
  }
  async deleteDonneur(id: string) {
    return this.prisma.donneurDOrdre.delete({ where: { id } });
  }

  // --- Batch CRUD ---
  async createBatch(data: Partial<WireTransferBatch>) {
    if (!data.societyId || !data.donneurId) throw new BadRequestException('societyId and donneurId are required');
    return this.prisma.wireTransferBatch.create({
      data: {
        societyId: data.societyId,
        donneurId: data.donneurId,
        status: data.status || 'CREATED',
        fileName: data.fileName,
        fileType: data.fileType,
        archived: data.archived ?? false,
      }
    });
  }
  async getBatches(societyId?: string) {
    return this.prisma.wireTransferBatch.findMany({ where: societyId ? { societyId } : {} });
  }
  async getBatch(id: string) {
    const batch = await this.prisma.wireTransferBatch.findUnique({
      where: { id },
      include: { transfers: true, history: true, society: true, donneur: true },
    });
    if (!batch) throw new NotFoundException('Batch not found');
    return batch;
  }
  async updateBatch(id: string, data: Partial<WireTransferBatch>) {
    return this.prisma.wireTransferBatch.update({ where: { id }, data });
  }
  async deleteBatch(id: string) {
    return this.prisma.wireTransferBatch.delete({ where: { id } });
  }

  // --- WireTransfer CRUD ---
  async createTransfer(data: Partial<WireTransfer>) {
    if (!data.batchId || !data.memberId || !data.donneurId || data.amount === undefined || !data.reference || !data.status)
      throw new BadRequestException('batchId, memberId, donneurId, amount, reference, and status are required');
    return this.prisma.wireTransfer.create({
      data: {
        batchId: data.batchId,
        memberId: data.memberId,
        donneurId: data.donneurId,
        amount: data.amount,
        reference: data.reference,
        status: data.status,
        error: data.error,
      }
    });
  }
  async getTransfers(batchId?: string) {
    return this.prisma.wireTransfer.findMany({ where: batchId ? { batchId } : {} });
  }
  async getTransfer(id: string) {
    const transfer = await this.prisma.wireTransfer.findUnique({
      where: { id },
      include: { history: true, member: true, donneur: true, batch: true },
    });
    if (!transfer) throw new NotFoundException('Wire transfer not found');
    return transfer;
  }
  async updateTransfer(id: string, data: Partial<WireTransfer>) {
    return this.prisma.wireTransfer.update({ where: { id }, data });
  }
  async deleteTransfer(id: string) {
    return this.prisma.wireTransfer.delete({ where: { id } });
  }

  // --- Status/History ---
  async addBatchHistory(batchId: string, status: WireTransferBatchStatus, changedBy?: string) {
    return this.prisma.wireTransferBatchHistory.create({
      data: { batchId, status, changedBy },
    });
  }
  async addTransferHistory(transferId: string, status: string, error?: string, changedBy?: string) {
    return this.prisma.wireTransferHistory.create({
      data: { transferId, status, error, changedBy },
    });
  }
  async getBatchHistory(batchId: string) {
    return this.prisma.wireTransferBatchHistory.findMany({ where: { batchId } });
  }
  async getTransferHistory(transferId: string) {
    return this.prisma.wireTransferHistory.findMany({ where: { transferId } });
  }
}
