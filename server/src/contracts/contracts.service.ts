import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { SearchContractDto } from './dto/search-contract.dto';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';
import { Express } from 'express';

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);
  
  constructor(private prisma: PrismaService) {}

  // Create contract with PDF upload
  async create(dto: CreateContractDto, file: Express.Multer.File, userId: string) {
    try {
      console.log('=== SERVICE CREATE DEBUG ===');
      console.log('DTO in service:', dto);
      console.log('File in service:', file ? 'File present' : 'No file');
      console.log('User ID in service:', userId);
      
      // Validate client exists
      console.log('Checking client exists:', dto.clientId);
      const client = await this.prisma.client.findUnique({ where: { id: dto.clientId } });
      if (!client) {
        console.error('Client not found:', dto.clientId);
        throw new NotFoundException('Client not found');
      }
      console.log('Client found:', client.name);

    // Allow multiple contracts for the same period - removed overlap check

    // Handle file upload
    let documentPath = '';
    if (file) {
      const fs = require('fs');
      const path = require('path');
      
      const uploadsDir = path.join(process.cwd(), 'uploads', 'contracts');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.pdf`;
      documentPath = path.join(uploadsDir, fileName);
      fs.writeFileSync(documentPath, file.buffer);
    }

      console.log('Creating contract with data:', {
        clientId: dto.clientId,
        clientName: client.name,
        delaiReglement: dto.treatmentDelay,
        delaiReclamation: dto.claimsReplyDelay,
        escalationThreshold: dto.warningThreshold,
        assignedManagerId: dto.accountOwnerId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        documentPath,
        signature: dto.notes
      });
      
      const contract = await this.prisma.contract.create({
        data: {
          clientId: dto.clientId,
          clientName: dto.contractNumber, // Store contract number, not client name
          delaiReglement: parseInt(dto.treatmentDelay.toString()),
          delaiReclamation: parseInt(dto.claimsReplyDelay.toString()),
          escalationThreshold: dto.warningThreshold ? parseInt(dto.warningThreshold.toString()) : null,
          assignedManagerId: dto.accountOwnerId,
          teamLeaderId: dto.teamLeaderId || null, // Assign chef d'équipe
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          documentPath,
          signature: dto.notes
        },
        include: {
          client: true,
          assignedManager: true
        }
      });
      
      console.log('Contract created successfully:', contract.id);

      // Auto-associate with existing bordereaux
      await this.associateBordereaux(contract.id);

      return contract;
    } catch (error) {
      console.error('=== SERVICE CREATE ERROR ===');
      console.error('Error in service create:', error);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  }

  // Get all contracts with filters
  async findAll(query: SearchContractDto) {
    const where: any = {};
    
    if (query.clientId) where.clientId = query.clientId;
    if (query.contractNumber) where.clientName = { contains: query.contractNumber, mode: 'insensitive' };
    if (query.accountOwnerId) where.assignedManagerId = query.accountOwnerId;
    
    if (query.status) {
      const now = new Date();
      const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      switch (query.status) {
        case 'active':
          where.endDate = { gte: now };
          break;
        case 'expired':
          where.endDate = { lt: now };
          break;
        case 'expiring_soon':
          where.endDate = { gte: now, lte: soon };
          break;
      }
    }

    if (query.hasDocument !== undefined) {
      where.documentPath = query.hasDocument ? { not: '' } : '';
    }

    return this.prisma.contract.findMany({
      where,
      include: {
        client: true,
        assignedManager: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // Get single contract
  async findOne(id: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: {
        client: true,
        assignedManager: true
      }
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    return contract;
  }

  // Update contract
  async update(id: string, dto: UpdateContractDto, userId: string) {
    const contract = await this.prisma.contract.findUnique({ where: { id } });
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    // Map DTO fields to correct Prisma schema fields
    const updateData: any = {};
    
    if (dto.contractNumber) updateData.clientName = dto.contractNumber;
    if (dto.treatmentDelay) updateData.delaiReglement = parseInt(dto.treatmentDelay.toString());
    if (dto.claimsReplyDelay) updateData.delaiReclamation = parseInt(dto.claimsReplyDelay.toString());
    if (dto.paymentDelay) updateData.delaiReglement = parseInt(dto.paymentDelay.toString());
    if (dto.warningThreshold) updateData.escalationThreshold = parseInt(dto.warningThreshold.toString());
    if (dto.accountOwnerId) updateData.assignedManagerId = dto.accountOwnerId;
    if (dto.teamLeaderId !== undefined) updateData.teamLeaderId = dto.teamLeaderId || null;
    if (dto.startDate) updateData.startDate = new Date(dto.startDate);
    if (dto.endDate) updateData.endDate = new Date(dto.endDate);
    if (dto.notes) updateData.signature = dto.notes;
    
    updateData.updatedAt = new Date();

    const updated = await this.prisma.contract.update({
      where: { id },
      data: updateData,
      include: {
        client: true,
        assignedManager: true
      }
    });

    // Log the change
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'CONTRACT_UPDATE',
        details: {
          contractId: id,
          changes: dto
        }
      }
    });

    return updated;
  }

  // Delete contract
  async remove(id: string, userId: string) {
    const contract = await this.prisma.contract.findUnique({ where: { id } });
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    // Remove file if exists
    if (contract.documentPath) {
      const fs = require('fs');
      if (fs.existsSync(contract.documentPath)) {
        fs.unlinkSync(contract.documentPath);
      }
    }

    await this.prisma.contract.delete({ where: { id } });

    // Log the deletion
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'CONTRACT_DELETE',
        details: { contractId: id }
      }
    });

    return { message: 'Contract deleted successfully' };
  }

  // Upload contract document
  async uploadDocument(contractId: string, file: Express.Multer.File) {
    const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    const fs = require('fs');
    const path = require('path');
    
    const uploadsDir = path.join(process.cwd(), 'uploads', 'contracts');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.pdf`;
    const documentPath = path.join(uploadsDir, fileName);
    fs.writeFileSync(documentPath, file.buffer);

    // Remove old file if exists
    if (contract.documentPath && fs.existsSync(contract.documentPath)) {
      fs.unlinkSync(contract.documentPath);
    }

    return this.prisma.contract.update({
      where: { id: contractId },
      data: { documentPath }
    });
  }

  // Download contract document
  async downloadDocument(contractId: string, res: any) {
    const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract || !contract.documentPath) {
      throw new NotFoundException('Contract document not found');
    }

    const fs = require('fs');
    if (!fs.existsSync(contract.documentPath)) {
      throw new NotFoundException('File not found on server');
    }

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="contract-${contract.id}.pdf"`
    });

    const stream = fs.createReadStream(contract.documentPath);
    stream.pipe(res);
  }

  // Get contract statistics
  async getStatistics() {
    const now = new Date();
    const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [total, active, expired, expiringSoon, withDocuments] = await Promise.all([
      this.prisma.contract.count(),
      this.prisma.contract.count({ where: { endDate: { gte: now } } }),
      this.prisma.contract.count({ where: { endDate: { lt: now } } }),
      this.prisma.contract.count({ where: { endDate: { gte: now, lte: soon } } }),
      this.prisma.contract.count({ where: { documentPath: { not: '' } } })
    ]);

    return {
      total,
      active,
      expired,
      expiringSoon,
      withDocuments,
      documentCoverage: total > 0 ? (withDocuments / total) * 100 : 0
    };
  }

  // Get SLA compliance for contract
  async getSLACompliance(contractId: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: { bordereaux: true }
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    const bordereaux = contract.bordereaux;
    let compliant = 0;
    let atRisk = 0;
    let breach = 0;

    bordereaux.forEach(bordereau => {
      const processingDays = bordereau.dateCloture 
        ? Math.floor((bordereau.dateCloture.getTime() - bordereau.dateReception.getTime()) / (1000 * 60 * 60 * 24))
        : Math.floor((new Date().getTime() - bordereau.dateReception.getTime()) / (1000 * 60 * 60 * 24));

      if (processingDays <= contract.delaiReglement) {
        compliant++;
      } else if (processingDays <= (contract.escalationThreshold || contract.delaiReglement + 2)) {
        atRisk++;
      } else {
        breach++;
      }
    });

    const total = bordereaux.length;
    return {
      total,
      compliant,
      atRisk,
      breach,
      complianceRate: total > 0 ? (compliant / total) * 100 : 100
    };
  }

  // Auto-associate bordereaux with contract
  private async associateBordereaux(contractId: string) {
    const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) return;

    const bordereaux = await this.prisma.bordereau.findMany({
      where: {
        clientId: contract.clientId,
        dateReception: {
          gte: contract.startDate,
          lte: contract.endDate
        },
        contractId: null
      }
    });

    if (bordereaux.length > 0) {
      await this.prisma.bordereau.updateMany({
        where: {
          id: { in: bordereaux.map(b => b.id) }
        },
        data: { contractId }
      });
    }

    return bordereaux.length;
  }

  // Export contracts to Excel
  async exportToExcel(query: SearchContractDto) {
    const contracts = await this.findAll(query);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Contracts');

    sheet.columns = [
      { header: 'Contract Number', key: 'contractNumber', width: 20 },
      { header: 'Client', key: 'clientName', width: 30 },
      { header: 'Account Owner', key: 'accountOwner', width: 25 },
      { header: 'Start Date', key: 'startDate', width: 15 },
      { header: 'End Date', key: 'endDate', width: 15 },
      { header: 'Treatment SLA', key: 'treatmentDelay', width: 15 },
      { header: 'Claims SLA', key: 'claimsReplyDelay', width: 15 },
      { header: 'Payment SLA', key: 'paymentDelay', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Bordereaux Count', key: 'bordereauxCount', width: 18 }
    ];

    contracts.forEach(contract => {
      const now = new Date();
      let status = 'Active';
      if (contract.endDate < now) status = 'Expired';
      else if (contract.endDate <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) status = 'Expiring Soon';

      sheet.addRow({
        contractNumber: contract.id,
        clientName: contract.clientName,
        accountOwner: contract.assignedManager?.fullName || 'N/A',
        startDate: contract.startDate.toLocaleDateString(),
        endDate: contract.endDate.toLocaleDateString(),
        treatmentDelay: `${contract.delaiReglement} days`,
        claimsReplyDelay: `${contract.delaiReclamation} days`,
        paymentDelay: `${contract.delaiReglement} days`,
        status,
        bordereauxCount: 0
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // Check for SLA breaches and send alerts
  async checkSLABreaches() {
    const contracts = await this.prisma.contract.findMany({
      where: {
        endDate: { gte: new Date() } // Only active contracts
      },
      include: {
        client: true,
        assignedManager: true
      }
    });
    
    // Get bordereaux for each contract
    const contractsWithBordereaux = await Promise.all(
      contracts.map(async (contract) => {
        const bordereaux = await this.prisma.bordereau.findMany({
          where: {
            clientId: contract.clientId,
            statut: { notIn: ['CLOTURE', 'TRAITE'] }
          }
        });
        return { ...contract, bordereaux };
      })
    );

    const alerts: any[] = [];

    for (const contract of contractsWithBordereaux) {
      for (const bordereau of contract.bordereaux) {
        const processingDays = Math.floor(
          (new Date().getTime() - bordereau.dateReception.getTime()) / (1000 * 60 * 60 * 24)
        );

        let alertLevel: string | null = null;
        if (processingDays > (contract.escalationThreshold || contract.delaiReglement + 5)) {
          alertLevel = 'critical';
        } else if (processingDays > contract.delaiReglement + 2) {
          alertLevel = 'warning';
        }

        if (alertLevel) {
          alerts.push({
            contractId: contract.id,
            bordereauxId: bordereau.id,
            clientName: contract.clientName,
            processingDays,
            alertLevel,
            threshold: contract.escalationThreshold || contract.delaiReglement
          });
        }
      }
    }

    return { alerts, count: alerts.length };
  }
}