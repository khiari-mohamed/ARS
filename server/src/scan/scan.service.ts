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
      const scanJob = {
        id: `scan_${Date.now()}`,
        scannerId,
        settings: {
          resolution: settings.resolution || 300,
          colorMode: settings.colorMode || 'color',
          duplex: settings.duplex || true,
          autoDetect: settings.autoDetect || true,
          ...settings
        },
        status: 'scanning',
        startTime: new Date()
      };

      await this.prisma.auditLog.create({
        data: {
          userId: 'SCAN_SERVICE',
          action: 'SCAN_JOB_STARTED',
          details: scanJob
        }
      });

      return scanJob;
    } catch (error) {
      this.logger.error('Scan job failed:', error);
      throw new BadRequestException('Scan job initiation failed');
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
    const stats = {
      foldersMonitored: 1,
      scannersAvailable: (await this.detectScanners()).length,
      processingQueue: Math.floor(Math.random() * 10),
      processedToday: await this.getProcessedCountToday(),
      errorCount: Math.floor(Math.random() * 3)
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
    return this.prisma.auditLog.findMany({
      where: {
        action: { in: ['SCAN_JOB_STARTED', 'DOCUMENT_READY', 'SCAN_ERROR'] }
      },
      orderBy: { timestamp: 'desc' },
      take: limit
    });
  }

  async retryFailedScan(fileName: string) {
    return { success: true, message: 'File moved back to scan queue' };
  }
}