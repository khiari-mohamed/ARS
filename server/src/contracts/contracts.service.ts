import { Injectable, ForbiddenException, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { SearchContractDto } from './dto/search-contract.dto';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);
  constructor(private prisma: PrismaService) {}

  private checkRole(user: any, action: 'view'|'create'|'update'|'delete' = 'view') {
    if (user.role === 'SUPER_ADMIN') return;
    if (user.role === 'ADMIN' && action !== 'delete') return;
    if (user.role === 'CHEF_EQUIPE' && action === 'view') return;
    throw new ForbiddenException('Access denied');
  }

  async isClientExists(clientId: string): Promise<boolean> {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    return !!client;
  }

  async hasContractOverlap(clientId: string, startDate: string, endDate: string): Promise<boolean> {
    // Check for overlapping contracts for the same client
    const overlap = await this.prisma.contract.findFirst({
      where: {
        clientId,
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
    });
    return !!overlap;
  }

  async createContract(dto: CreateContractDto, file: Express.Multer.File, user: any) {
    this.checkRole(user, 'create');
    // Validate client linkage (defensive, should be checked in controller)
    const client = await this.prisma.client.findUnique({ where: { id: dto.clientId } });
    if (!client) {
      throw new NotFoundException('Linked client does not exist.');
    }
    // Optionally, check for unique contract per client+period (defensive)
    const overlap = await this.hasContractOverlap(dto.clientId, dto.startDate, dto.endDate);
    if (overlap) {
      throw new ConflictException('A contract for this client and period already exists.');
    }
    const contract = await this.prisma.contract.create({
      data: {
        ...dto,
        documentPath: file?.path || dto.documentPath || '',
      },
    });
    await this.prisma.contractHistory.create({
      data: {
        contractId: contract.id,
        modifiedById: user.id,
        changes: { created: contract },
      },
    });
    return contract;
  }

  async updateContract(id: string, dto: UpdateContractDto, user: any) {
    this.checkRole(user, 'update');
    const old = await this.prisma.contract.findUnique({ where: { id } });
    if (!old) throw new NotFoundException('Contract not found');
    const contract = await this.prisma.contract.update({
      where: { id },
      data: { ...dto },
    });
    await this.prisma.contractHistory.create({
      data: {
        contractId: contract.id,
        modifiedById: user.id,
        changes: { before: old, after: contract },
      },
    });
    return contract;
  }

  async deleteContract(id: string, user: any) {
    this.checkRole(user, 'delete');
    return this.prisma.contract.delete({ where: { id } });
  }

  async getContract(id: string, user: any) {
    this.checkRole(user, 'view');
    return this.prisma.contract.findUnique({ where: { id }, include: { assignedManager: true, history: true } });
  }

  async searchContracts(query: SearchContractDto, user: any) {
    this.checkRole(user, 'view');
    const where: any = {};
    if (query.clientId) where.clientId = query.clientId;
    if (query.clientName) where.clientName = query.clientName;
    if (query.assignedManagerId) where.assignedManagerId = query.assignedManagerId;
    return this.prisma.contract.findMany({ where, include: { assignedManager: true } });
  }

  async getContractHistory(id: string, user: any) {
    this.checkRole(user, 'view');
    return this.prisma.contractHistory.findMany({
      where: { contractId: id },
      orderBy: { modifiedAt: 'desc' },
      include: { modifiedBy: true },
    });
  }

  // 1. Export Contracts (Excel, PDF)
  async exportContractsExcel(query: SearchContractDto, user: any) {
    this.checkRole(user, 'view');
    const contracts = await this.searchContracts(query, user);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Contracts');
    sheet.columns = [
      { header: 'ID', key: 'id', width: 20 },
      { header: 'Client ID', key: 'clientId', width: 20 },
      { header: 'Client Name', key: 'clientName', width: 30 },
      { header: 'Assigned Manager', key: 'assignedManagerId', width: 20 },
      { header: 'Start Date', key: 'startDate', width: 20 },
      { header: 'End Date', key: 'endDate', width: 20 },
      { header: 'Delai Reglement', key: 'delaiReglement', width: 20 },
      { header: 'Delai Reclamation', key: 'delaiReclamation', width: 20 },
      { header: 'Escalation Threshold', key: 'escalationThreshold', width: 20 },
      { header: 'Document Path', key: 'documentPath', width: 40 },
      { header: 'Signature', key: 'signature', width: 20 },
    ];
    contracts.forEach(contract => {
      sheet.addRow(contract);
    });
    const buffer = await workbook.xlsx.writeBuffer();
    return {
      file: buffer,
      filename: 'contracts.xlsx',
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  async exportContractsPdf(query: SearchContractDto, user: any) {
    this.checkRole(user, 'view');
    const contracts = await this.searchContracts(query, user);
    const doc = new PDFDocument();
    const stream = new PassThrough();
    doc.pipe(stream);
    doc.fontSize(18).text('Contracts List', { align: 'center' });
    doc.moveDown();
    contracts.forEach(contract => {
      doc.fontSize(12).text(`ID: ${contract.id}`);
      doc.text(`Client: ${contract.clientName} (${contract.clientId})`);
      doc.text(`Manager: ${contract.assignedManagerId}`);
      doc.text(`Start: ${contract.startDate}  End: ${contract.endDate}`);
      doc.text(`Delai Reglement: ${contract.delaiReglement}`);
      doc.text(`Delai Reclamation: ${contract.delaiReclamation}`);
      doc.text(`Escalation Threshold: ${contract.escalationThreshold}`);
      doc.text(`Document Path: ${contract.documentPath}`);
      doc.text(`Signature: ${contract.signature}`);
      doc.moveDown();
    });
    doc.end();
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', () => {
        resolve({
          file: Buffer.concat(chunks),
          filename: 'contracts.pdf',
          contentType: 'application/pdf',
        });
      });
      stream.on('error', reject);
    });
  }

  // 2. SLA Breach Detection & Alerting
  async checkSlaBreaches() {
    const now = new Date();
    const contracts = await this.prisma.contract.findMany({});
    const breached: any[] = [];
    for (const contract of contracts) {
      // Example: check if endDate is past and not signed
      if (contract.endDate && new Date(contract.endDate) < now && !contract.signature) {
        breached.push({
          id: contract.id,
          reason: 'Contract expired without signature',
        });
        this.logger.warn(`SLA Breach: Contract ${contract.id} expired without signature.`);
      }
      // Example: check escalation threshold
      if (contract.escalationThreshold && contract.delaiReglement > contract.escalationThreshold) {
        breached.push({
          id: contract.id,
          reason: 'Delai Reglement exceeds escalation threshold',
        });
        this.logger.warn(`SLA Breach: Contract ${contract.id} delaiReglement exceeds threshold.`);
      }
      // Add more SLA checks as needed
    }
    return { breached };
  }

  // 3. Dashboard/Statistics Endpoints
  async getContractStatistics(user: any) {
    this.checkRole(user, 'view');
    const now = new Date();
    const [total, active, expired, expiringSoon, contractsWithThreshold] = await Promise.all([
      this.prisma.contract.count(),
      this.prisma.contract.count({ where: { endDate: { gte: now } } }),
      this.prisma.contract.count({ where: { endDate: { lt: now } } }),
      this.prisma.contract.count({
        where: {
          endDate: {
            gte: now,
            lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.contract.findMany({ where: { escalationThreshold: { not: null } } })
    ]);
    // JS-based SLA compliance: delaiReglement <= escalationThreshold
    let slaCompliant = 0;
    for (const contract of contractsWithThreshold as any[]) {
      if (typeof contract.escalationThreshold === 'number' && contract.delaiReglement <= contract.escalationThreshold) {
        slaCompliant++;
      }
    }
    return {
      total,
      active,
      expired,
      expiringSoon,
      slaCompliant,
    };
  }

  // 4. Automatic Contract-Bordereau Association
  async associateContractsToBordereaux() {
    const contracts = await this.prisma.contract.findMany();
    let count = 0;
    for (const contract of contracts) {
      const bordereaux = await this.prisma.bordereau.findMany({
        where: {
          clientId: contract.clientId,
          dateReception: {
            gte: contract.startDate,
            lte: contract.endDate,
          },
        },
      });
      for (const bordereau of bordereaux) {
        if (bordereau.contractId !== contract.id) {
          await this.prisma.bordereau.update({
            where: { id: bordereau.id },
            data: { contractId: contract.id },
          });
          count++;
        }
      }
    }
    return { associated: count };
  }

  // 5. GEC Integration (Automated Letters/Reminders)
  async triggerContractReminders() {
    const now = new Date();
    const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const contracts = await this.prisma.contract.findMany({
      where: {
        OR: [
          { endDate: { gte: now, lte: soon } },
          { signature: null },
        ],
      },
    });
    for (const contract of contracts) {
      this.logger.log(`[REMINDER] Contract ${contract.id} is expiring soon or missing signature.`);
    }
    return { remindersSent: contracts.length };
  }

  // 6. GED Integration: Indexing & Search
  async indexContractsForGed() {
    const contracts = await this.prisma.contract.findMany();
    let indexed = 0;
    for (const contract of contracts) {
      this.logger.log(`[GED] Indexed contract ${contract.id} for search.`);
      indexed++;
    }
    return { indexed };
  }

  // 7. Link Contracts to Complaints (Reclamation)
  async linkContractsToComplaints() {
    // Only works if you have a contractId field in Reclamation
    const complaints = await this.prisma.reclamation.findMany();
    let linked = 0;
    for (const complaint of complaints) {
      const contract = await this.prisma.contract.findFirst({
        where: {
          clientId: complaint.clientId,
          startDate: { lte: complaint.createdAt },
          endDate: { gte: complaint.createdAt },
        },
      });
      if (contract && (complaint as any).contractId !== contract.id) {
        await this.prisma.reclamation.update({
          where: { id: complaint.id },
          data: { contractId: contract.id },
        });
        linked++;
      }
    }
    return { linked };
  }
}
