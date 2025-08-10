import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateBOEntryDto {
  reference?: string;
  clientId: string;
  contractId?: string;
  documentType: string;
  nombreDocuments: number;
  delaiReglement?: number;
  dateReception?: string;
  startTime?: number;
}

export interface DocumentTypeDto {
  type: string;
  category: string;
  priority: string;
  extension: string;
  confidence: number;
}

export interface BOPerformanceDto {
  period: string;
  totalEntries: number;
  avgProcessingTime: number;
  errorRate: number;
  entrySpeed: number;
  activities: any[];
}

@Injectable()
export class BOService {
  constructor(private prisma: PrismaService) {}

  async generateReference(type: string, clientId?: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    const today = new Date(year, now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const count = await this.prisma.bordereau.count({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      }
    });
    
    const sequence = String(count + 1).padStart(4, '0');
    
    switch (type) {
      case 'BS':
        return `BS-${year}${month}${day}-${sequence}`;
      case 'RECLAMATION':
        return `REC-${year}${month}${day}-${sequence}`;
      case 'CONTRAT':
        return `CTR-${year}${month}${day}-${sequence}`;
      default:
        return `DOC-${year}${month}${day}-${sequence}`;
    }
  }

  async classifyDocument(fileName: string, content?: string): Promise<DocumentTypeDto> {
    const extension = fileName.split('.').pop()?.toLowerCase();
    let type = 'AUTRE';
    let category = 'GENERAL';
    let priority = 'NORMAL';
    
    if (fileName.toLowerCase().includes('bs') || fileName.toLowerCase().includes('bulletin')) {
      type = 'BS';
      category = 'MEDICAL';
      priority = 'HIGH';
    } else if (fileName.toLowerCase().includes('contrat') || fileName.toLowerCase().includes('contract')) {
      type = 'CONTRAT';
      category = 'LEGAL';
      priority = 'HIGH';
    } else if (fileName.toLowerCase().includes('reclamation') || fileName.toLowerCase().includes('complaint')) {
      type = 'RECLAMATION';
      category = 'CUSTOMER_SERVICE';
      priority = 'URGENT';
    } else if (fileName.toLowerCase().includes('facture') || fileName.toLowerCase().includes('invoice')) {
      type = 'FACTURE';
      category = 'FINANCE';
      priority = 'HIGH';
    }
    
    return {
      type,
      category,
      priority,
      extension: extension || 'unknown',
      confidence: 0.85
    };
  }

  async createBatchEntry(entries: CreateBOEntryDto[], userId: string) {
    const results = [];
    const errors = [];
    
    for (let i = 0; i < entries.length; i++) {
      try {
        const entry = entries[i];
        
        if (!entry.reference) {
          entry.reference = await this.generateReference(entry.documentType, entry.clientId);
        }
        
        if (!entry.clientId || !entry.documentType || !entry.nombreDocuments) {
          throw new Error('Missing required fields');
        }
        
        const bordereau = await this.prisma.bordereau.create({
          data: {
            reference: entry.reference,
            clientId: entry.clientId,
            contractId: entry.contractId || '',
            dateReception: entry.dateReception ? new Date(entry.dateReception) : new Date(),
            delaiReglement: entry.delaiReglement || 30,
            nombreBS: entry.nombreDocuments,
            statut: 'EN_ATTENTE',
          },
          include: {
            client: true,
            contract: true
          }
        });
        
        await this.logBOActivity(userId, 'CREATE_ENTRY', {
          bordereauId: bordereau.id,
          documentType: entry.documentType,
          processingTime: Date.now() - (entry.startTime || Date.now())
        });
        
        (results as any[]).push({
          index: i,
          success: true,
          bordereau,
          reference: bordereau.reference
        });
        
      } catch (error) {
        (errors as any[]).push({
          index: i,
          error: error.message,
          entry: entries[i]
        });
      }
    }
    
    return {
      success: results,
      errors,
      total: entries.length,
      successCount: results.length,
      errorCount: errors.length
    };
  }

  async validateDocumentQuality(file: Express.Multer.File): Promise<{
    isValid: boolean;
    issues: string[];
    score: number;
  }> {
    const issues: string[] = [];
    let score = 100;
    
    if (file.size > 10 * 1024 * 1024) {
      issues.push('File size exceeds 10MB limit');
      score -= 20;
    }
    
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'];
    if (!allowedTypes.includes(file.mimetype)) {
      issues.push('Unsupported file type');
      score -= 30;
    }
    
    if (file.originalname.length < 3) {
      issues.push('Filename too short');
      score -= 10;
    }
    
    if (!/^[a-zA-Z0-9._-]+$/.test(file.originalname.replace(/\.[^/.]+$/, ""))) {
      issues.push('Filename contains invalid characters');
      score -= 15;
    }
    
    return {
      isValid: score >= 70,
      issues,
      score: Math.max(0, score)
    };
  }

  async logBOActivity(userId: string, action: string, details: any) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: `BO_${action}`,
        details: {
          ...details,
          timestamp: new Date().toISOString()
        }
      }
    });
  }

  async getBOPerformance(userId?: string, period: string = 'daily'): Promise<BOPerformanceDto> {
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'daily':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'weekly':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(now.getMonth() - 1);
        break;
    }
    
    const whereClause = userId ? 
      { userId, timestamp: { gte: startDate } } : 
      { timestamp: { gte: startDate } };
    
    const activities = await this.prisma.auditLog.findMany({
      where: {
        action: { startsWith: 'BO_' },
        ...whereClause
      },
      include: { user: { select: { fullName: true } } }
    });
    
    const totalEntries = activities.filter(a => a.action === 'BO_CREATE_ENTRY').length;
    const processingTimes = activities
      .filter(a => a.details?.processingTime)
      .map(a => a.details.processingTime as number);
    
    const avgProcessingTime = processingTimes.length > 0 ? 
      processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length : 0;
    
    const errors = activities.filter(a => a.action === 'BO_ERROR').length;
    const errorRate = totalEntries > 0 ? (errors / totalEntries) * 100 : 0;
    
    const hoursInPeriod = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    const entrySpeed = hoursInPeriod > 0 ? totalEntries / hoursInPeriod : 0;
    
    return {
      period,
      totalEntries,
      avgProcessingTime: Math.round(avgProcessingTime),
      errorRate: Math.round(errorRate * 100) / 100,
      entrySpeed: Math.round(entrySpeed * 100) / 100,
      activities: activities.slice(0, 50)
    };
  }

  async getBODashboard(userId: string) {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const todayEntries = await this.prisma.bordereau.count({
      where: {
        createdAt: { gte: startOfDay }
      }
    });
    
    const pendingEntries = await this.prisma.bordereau.count({
      where: { statut: 'EN_ATTENTE' }
    });
    
    const recentEntries = await this.prisma.bordereau.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { name: true } },
        contract: { select: { clientName: true } }
      }
    });
    
    const documentTypes = await this.prisma.bordereau.groupBy({
      by: ['statut'],
      _count: { id: true },
      where: {
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }
    });
    
    return {
      todayEntries,
      pendingEntries,
      recentEntries,
      documentTypes,
      performance: await this.getBOPerformance(userId, 'daily')
    };
  }

  async trackPhysicalDocument(trackingData: {
    reference: string;
    location: string;
    status: string;
    notes?: string;
  }) {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { reference: trackingData.reference }
    });
    
    if (!bordereau) {
      throw new BadRequestException('Bordereau not found');
    }
    
    await this.prisma.auditLog.create({
      data: {
        userId: 'SYSTEM',
        action: 'PHYSICAL_DOCUMENT_TRACKING',
        details: {
          bordereauId: bordereau.id,
          reference: trackingData.reference,
          location: trackingData.location,
          status: trackingData.status,
          notes: trackingData.notes,
          timestamp: new Date().toISOString()
        }
      }
    });
    
    return { success: true, message: 'Document tracking updated' };
  }
}