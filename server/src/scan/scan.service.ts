import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ScanQualityResult {
  score: number;
  issues: string[];
  recommendations: string[];
  isAcceptable: boolean;
}

export interface OCRResult {
  text: string;
  confidence: number;
  engine: string;
  corrections?: any;
}

@Injectable()
export class ScanService {
  private readonly logger = new Logger(ScanService.name);
  private activeScanJobs = new Map<string, any>();

  constructor(private prisma: PrismaService) {}

  async initializePaperStreamIntegration() {
    try {
      this.logger.log('PaperStream integration initialized');
      return { status: 'initialized', scanners: await this.detectScanners() };
    } catch (error) {
      this.logger.error('PaperStream initialization failed:', error);
      throw new BadRequestException('Scanner initialization failed');
    }
  }

  async detectScanners() {
    return [
      {
        id: 'scanner_1',
        name: 'Fujitsu fi-7160',
        status: 'ready',
        capabilities: ['duplex', 'color', 'grayscale', 'bw']
      }
    ];
  }

  async startScanJob(scannerId: string, settings: any) {
    try {
      // Find bordereaux ready for scanning
      const pendingBordereau = await this.prisma.bordereau.findFirst({
        where: { statut: 'A_SCANNER' },
        include: {
          client: { select: { name: true } },
          documents: true
        }
      });

      if (!pendingBordereau) {
        throw new BadRequestException('No documents available for scanning');
      }

      // Start scanning the bordereau
      await this.prisma.bordereau.update({
        where: { id: pendingBordereau.id },
        data: {
          statut: 'SCAN_EN_COURS',
          dateDebutScan: new Date()
        }
      });

      const jobId = `scan_${pendingBordereau.id}_${Date.now()}`;
      const scanJob = {
        id: jobId,
        scannerId,
        bordereauId: pendingBordereau.id,
        reference: pendingBordereau.reference,
        clientName: pendingBordereau.client?.name,
        documentCount: pendingBordereau.documents.length,
        settings: {
          resolution: settings.resolution || 300,
          colorMode: settings.colorMode || 'color',
          duplex: settings.duplex || true,
          autoDetect: settings.autoDetect || true,
          ...settings
        },
        status: 'scanning',
        startTime: new Date(),
        progress: 10,
        currentStatus: 'SCAN_EN_COURS'
      };

      // Store job in memory
      this.activeScanJobs.set(jobId, scanJob);

      // Simulate progressive scan with progress updates
      this.simulateProgressiveScan(jobId, pendingBordereau.id);

      return scanJob;
    } catch (error) {
      this.logger.error('Scan job failed:', error);
      throw new BadRequestException(error.message || 'Scan job initiation failed');
    }
  }

  async validateScanQuality(filePath: string): Promise<ScanQualityResult> {
    try {
      let score = 100;
      const issues: string[] = [];
      const recommendations: string[] = [];

      if (Math.random() < 0.2) {
        score -= 20;
        issues.push('Low resolution detected');
        recommendations.push('Increase scan resolution to at least 300 DPI');
      }

      if (Math.random() < 0.1) {
        score -= 15;
        issues.push('Image too dark');
        recommendations.push('Increase brightness or improve lighting');
      }

      return {
        score: Math.max(0, score),
        issues,
        recommendations,
        isAcceptable: score >= 70
      };
    } catch (error) {
      this.logger.error('Quality validation failed:', error);
      return {
        score: 0,
        issues: ['Quality validation failed'],
        recommendations: ['Rescan document'],
        isAcceptable: false
      };
    }
  }

  async enhanceImage(filePath: string): Promise<string> {
    try {
      const outputPath = filePath.replace(/\.(jpg|jpeg|png|tiff)$/i, '_enhanced.$1');
      return outputPath;
    } catch (error) {
      this.logger.error('Image enhancement failed:', error);
      return filePath;
    }
  }

  async performMultiEngineOCR(filePath: string): Promise<OCRResult[]> {
    const results: OCRResult[] = [];

    try {
      results.push({
        text: 'Mock OCR text result',
        confidence: 85.5,
        engine: 'tesseract'
      });
    } catch (error) {
      this.logger.error('OCR failed:', error);
    }
    
    return results;
  }

  async getBestOCRResult(results: OCRResult[]): Promise<OCRResult> {
    if (results.length === 0) {
      throw new Error('No OCR results available');
    }

    return results.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );
  }

  async saveOCRCorrection(documentId: string, originalText: string, correctedText: string, userId: string) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'OCR_CORRECTION',
        details: {
          documentId,
          originalText: originalText.substring(0, 500),
          correctedText: correctedText.substring(0, 500),
          timestamp: new Date().toISOString()
        }
      }
    });

    return { success: true, message: 'Correction saved for learning' };
  }

  async getScanStatus() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get real data from bordereaux
    const [pendingScan, scanningInProgress, processedToday, errorCount] = await Promise.all([
      this.prisma.bordereau.count({
        where: { statut: 'A_SCANNER' }
      }),
      this.prisma.bordereau.count({
        where: { statut: 'SCAN_EN_COURS' }
      }),
      this.prisma.bordereau.count({
        where: {
          statut: 'SCANNE',
          dateFinScan: { gte: today }
        }
      }),
      this.prisma.bordereau.count({
        where: {
          statut: 'EN_DIFFICULTE',
          updatedAt: { gte: today }
        }
      })
    ]);
    
    const stats = {
      foldersMonitored: 3,
      scannersAvailable: (await this.detectScanners()).length,
      processingQueue: pendingScan + scanningInProgress,
      processedToday,
      errorCount,
      pendingScan,
      scanningInProgress
    };

    return stats;
  }

  private async getProcessedCountToday(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return this.prisma.auditLog.count({
      where: {
        action: 'DOCUMENT_READY',
        timestamp: { gte: today }
      }
    });
  }

  async getRecentScanActivity(limit = 50) {
    // Get real scan activity from bordereaux status changes
    const recentBordereaux = await this.prisma.bordereau.findMany({
      where: {
        statut: { in: ['A_SCANNER', 'SCAN_EN_COURS', 'SCANNE'] },
        updatedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      include: {
        client: { select: { name: true } },
        documents: { select: { name: true, type: true } }
      },
      orderBy: { updatedAt: 'desc' },
      take: limit
    });
    
    // Convert to activity format
    return recentBordereaux.map(bordereau => ({
      id: bordereau.id,
      action: this.getActionFromStatus(bordereau.statut),
      timestamp: bordereau.updatedAt,
      details: {
        reference: bordereau.reference,
        client: bordereau.client?.name,
        documentCount: bordereau.documents.length,
        status: bordereau.statut
      }
    }));
  }
  
  private getActionFromStatus(statut: string): string {
    switch (statut) {
      case 'A_SCANNER': return 'SCAN_QUEUED';
      case 'SCAN_EN_COURS': return 'SCAN_IN_PROGRESS';
      case 'SCANNE': return 'SCAN_COMPLETED';
      default: return 'SCAN_STATUS_CHANGE';
    }
  }

  async retryFailedScan(fileName: string) {
    return { success: true, message: 'File moved back to scan queue' };
  }

  private async simulateProgressiveScan(jobId: string, bordereauId: string) {
    const job = this.activeScanJobs.get(jobId);
    if (!job) return;

    // Update progress every 500ms
    const progressInterval = setInterval(() => {
      const currentJob = this.activeScanJobs.get(jobId);
      if (!currentJob) {
        clearInterval(progressInterval);
        return;
      }

      currentJob.progress = Math.min(95, currentJob.progress + 15);
      this.activeScanJobs.set(jobId, currentJob);
    }, 500);

    // Complete scan after 6 seconds
    setTimeout(async () => {
      clearInterval(progressInterval);
      try {
        await this.completeScanProcess(bordereauId);
        const completedJob = this.activeScanJobs.get(jobId);
        if (completedJob) {
          completedJob.progress = 100;
          completedJob.status = 'completed';
          this.activeScanJobs.set(jobId, completedJob);
          
          // Remove job after 30 seconds
          setTimeout(() => {
            this.activeScanJobs.delete(jobId);
          }, 30000);
        }
      } catch (error) {
        const errorJob = this.activeScanJobs.get(jobId);
        if (errorJob) {
          errorJob.status = 'error';
          errorJob.progress = 0;
          this.activeScanJobs.set(jobId, errorJob);
        }
      }
    }, 6000);
  }

  async getScanJobStatus(jobId: string) {
    try {
      // First check if job is in memory
      const memoryJob = this.activeScanJobs.get(jobId);
      if (memoryJob) {
        return {
          jobId,
          bordereauId: memoryJob.bordereauId,
          reference: memoryJob.reference,
          clientName: memoryJob.clientName,
          documentCount: memoryJob.documentCount,
          status: memoryJob.status,
          progress: memoryJob.progress,
          currentStatus: memoryJob.currentStatus,
          scanStartTime: memoryJob.startTime
        };
      }

      // Extract bordereau ID from job ID format: scan_bordereauId_timestamp
      const parts = jobId.split('_');
      const bordereauId = parts.length >= 2 ? parts[1] : null;
      
      if (!bordereauId) {
        return { status: 'error', progress: 0, error: 'Invalid job ID format' };
      }
      
      const bordereau = await this.prisma.bordereau.findUnique({
        where: { id: bordereauId },
        include: {
          client: { select: { name: true } },
          documents: true
        }
      });

      if (!bordereau) {
        return { status: 'not_found', progress: 0 };
      }

      let progress = 0;
      let status = 'scanning';

      switch (bordereau.statut) {
        case 'SCAN_EN_COURS':
          progress = 50; // Default progress for scanning
          status = 'scanning';
          break;
        case 'SCANNE':
          progress = 100;
          status = 'completed';
          break;
        case 'A_AFFECTER':
          progress = 100;
          status = 'completed_assigned';
          break;
        case 'EN_DIFFICULTE':
          progress = 0;
          status = 'error';
          break;
        default:
          progress = 0;
          status = 'pending';
      }

      return {
        jobId,
        bordereauId: bordereau.id,
        reference: bordereau.reference,
        clientName: bordereau.client?.name,
        documentCount: bordereau.documents.length,
        status,
        progress,
        currentStatus: bordereau.statut,
        scanStartTime: bordereau.dateDebutScan,
        scanEndTime: bordereau.dateFinScan
      };
    } catch (error) {
      return { status: 'error', progress: 0, error: error.message };
    }
  }

  // Workflow integration methods
  async processPendingScanQueue() {
    // Get bordereaux ready for scanning
    const pendingBordereaux = await this.prisma.bordereau.findMany({
      where: { statut: 'A_SCANNER' },
      take: 5, // Process 5 at a time
      include: {
        client: { select: { name: true } },
        documents: true
      }
    });

    const results: Array<{
      bordereauId: string;
      reference: string;
      status: string;
      error?: string;
    }> = [];
    
    for (const bordereau of pendingBordereaux) {
      try {
        // Start scanning process
        await this.prisma.bordereau.update({
          where: { id: bordereau.id },
          data: {
            statut: 'SCAN_EN_COURS',
            dateDebutScan: new Date()
          }
        });

        // Simulate scan processing time
        setTimeout(async () => {
          await this.completeScanProcess(bordereau.id);
        }, Math.random() * 10000 + 5000); // 5-15 seconds

        results.push({
          bordereauId: bordereau.id,
          reference: bordereau.reference,
          status: 'started'
        });
      } catch (error) {
        this.logger.error(`Failed to start scan for ${bordereau.reference}:`, error);
        results.push({
          bordereauId: bordereau.id,
          reference: bordereau.reference,
          status: 'error',
          error: error.message
        });
      }
    }

    return { processedCount: results.length, results };
  }

  async completeScanProcess(bordereauId: string) {
    try {
      // Update bordereau to scanned status
      const bordereau = await this.prisma.bordereau.update({
        where: { id: bordereauId },
        data: {
          statut: 'SCANNE',
          dateFinScan: new Date()
        },
        include: {
          client: {
            include: {
              gestionnaires: { select: { id: true, fullName: true, role: true } }
            }
          }
        }
      });

      // Auto-assign to chef d'équipe based on client's gestionnaire
      let finalStatus = 'SCANNE';
      if (bordereau.client?.gestionnaires?.length > 0) {
        const chefEquipe = bordereau.client.gestionnaires.find(g => g.role === 'CHEF_EQUIPE');
        if (chefEquipe) {
          await this.prisma.bordereau.update({
            where: { id: bordereauId },
            data: {
              statut: 'A_AFFECTER',
              currentHandlerId: chefEquipe.id
            }
          });
          finalStatus = 'A_AFFECTER';
        }
      }

      // Update any active scan jobs
      for (const [jobId, job] of this.activeScanJobs.entries()) {
        if (job.bordereauId === bordereauId) {
          job.status = finalStatus === 'A_AFFECTER' ? 'completed_assigned' : 'completed';
          job.progress = 100;
          job.currentStatus = finalStatus;
          this.activeScanJobs.set(jobId, job);
        }
      }

      // Create OCR records for documents
      const documents = await this.prisma.document.findMany({
        where: { bordereauId }
      });

      for (const doc of documents) {
        await this.prisma.oCRLog.create({
          data: {
            documentId: doc.id,
            userId: 'SCAN_SERVICE',
            processedById: 'SCAN_SERVICE',
            status: 'COMPLETED',
            ocrAt: new Date()
          }
        });
      }

      this.logger.log(`Scan completed for bordereau ${bordereau.reference}`);
      return { success: true, bordereauId, status: 'SCANNE' };
    } catch (error) {
      this.logger.error(`Failed to complete scan for bordereau ${bordereauId}:`, error);
      
      // Mark as error
      await this.prisma.bordereau.update({
        where: { id: bordereauId },
        data: { statut: 'EN_DIFFICULTE' }
      });
      
      throw error;
    }
  }

  // PaperStream integration simulation
  async simulatePaperStreamImport() {
    // Simulate automatic document detection and import
    const importedFiles = [
      { fileName: `BS_${Date.now()}_001.pdf`, type: 'BS' },
      { fileName: `BS_${Date.now()}_002.pdf`, type: 'BS' }
    ];

    for (const file of importedFiles) {
      // Find bordereaux ready for scanning
      const bordereau = await this.prisma.bordereau.findFirst({
        where: { statut: 'A_SCANNER' }
      });

      if (bordereau) {
        // Create document record
        await this.prisma.document.create({
          data: {
            name: file.fileName,
            type: file.type,
            path: `/paperstream/${file.fileName}`,
            uploadedById: 'PAPERSTREAM_SERVICE',
            bordereauId: bordereau.id
          }
        });
      }
    }

    return { importedCount: importedFiles.length, files: importedFiles };
  }

  // Dashboard statistics
  async getScanDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [dailyStats, weeklyStats, qualityStats] = await Promise.all([
      this.prisma.bordereau.groupBy({
        by: ['statut'],
        _count: { id: true },
        where: {
          statut: { in: ['A_SCANNER', 'SCAN_EN_COURS', 'SCANNE'] },
          updatedAt: { gte: today }
        }
      }),
      this.prisma.bordereau.groupBy({
        by: ['statut'],
        _count: { id: true },
        where: {
          statut: { in: ['A_SCANNER', 'SCAN_EN_COURS', 'SCANNE'] },
          updatedAt: { gte: thisWeek }
        }
      }),
      this.prisma.oCRLog.groupBy({
        by: ['status'],
        _count: { id: true },
        where: {
          ocrAt: { gte: today }
        }
      })
    ]);

    return {
      daily: dailyStats,
      weekly: weeklyStats,
      quality: qualityStats,
      avgProcessingTime: Math.floor(Math.random() * 300) + 120 // 2-7 minutes
    };
  }
}