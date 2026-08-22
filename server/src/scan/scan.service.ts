import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { calculateAllSLAs } from '../utils/sla-calculator';

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

const SUPPORTED_SCAN_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.tif'];

@Injectable()
export class ScanService {
  private readonly logger = new Logger(ScanService.name);
  private readonly activeScanJobs = new Map<string, any>();
  // Lazily require()'d (not a top-level import) because chokidar is only
  // needed by the optional PaperStream folder-watcher feature.
  private paperStreamWatcher: any = null;

  constructor(private prisma: PrismaService) {}

  async initializePaperStreamIntegration() {
    try {
      const inputDir = path.join(process.cwd(), 'paperstream-input');
      const processedDir = path.join(process.cwd(), 'paperstream-processed');

      if (!fs.existsSync(inputDir)) fs.mkdirSync(inputDir, { recursive: true });
      if (!fs.existsSync(processedDir)) fs.mkdirSync(processedDir, { recursive: true });

      this.startPaperStreamWatcher();

      return {
        status: 'initialized',
        inputFolder: inputDir,
        processedFolder: processedDir,
        scanners: await this.detectScanners(),
      };
    } catch (error) {
      this.logger.error('PaperStream initialization failed:', error);
      throw new BadRequestException('Scanner initialization failed');
    }
  }

  async detectScanners() {
    try {
      return [
        {
          id: 'paperstream_integration',
          name: 'PaperStream Integration (Folder Watcher)',
          status: 'ready',
          capabilities: ['batch-processing', 'hierarchical-folders', 'auto-linking', 'metadata-extraction'],
          type: 'integration',
          inputFolder: './paperstream-input',
          processedFolder: './paperstream-processed',
        },
        {
          id: 'paperstream_fi7600',
          name: 'Fujitsu fi-7600 (via PaperStream)',
          status: 'ready',
          capabilities: ['duplex', 'color', 'grayscale', 'bw', 'auto-detect', 'imprinter'],
          type: 'physical',
          model: 'fi-7600',
        },
      ];
    } catch (error) {
      this.logger.error('Scanner detection failed:', error);
      return [
        {
          id: 'paperstream_integration',
          name: 'PaperStream Integration (Folder Watcher)',
          status: 'ready',
          capabilities: ['batch-processing', 'folder-monitoring'],
          type: 'integration',
        },
      ];
    }
  }

  async startScanJob(scannerId: string, settings: any) {
    try {
      const pendingBordereau = await this.prisma.bordereau.findFirst({
        where: { statut: 'A_SCANNER' },
        include: {
          client: { select: { name: true } },
          documents: true,
        },
      });

      if (!pendingBordereau) {
        throw new BadRequestException('No documents available for scanning');
      }

      await this.prisma.bordereau.update({
        where: { id: pendingBordereau.id },
        data: {
          statut: 'SCAN_EN_COURS',
          dateDebutScan: new Date(),
        },
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
          ...settings,
        },
        status: 'scanning',
        startTime: new Date(),
        progress: 10,
        currentStatus: 'SCAN_EN_COURS',
      };

      this.activeScanJobs.set(jobId, scanJob);
      this.simulateProgressiveScan(jobId, pendingBordereau.id);

      return scanJob;
    } catch (error: any) {
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
        isAcceptable: score >= 70,
      };
    } catch (error) {
      this.logger.error('Quality validation failed:', error);
      return {
        score: 0,
        issues: ['Quality validation failed'],
        recommendations: ['Rescan document'],
        isAcceptable: false,
      };
    }
  }

  async enhanceImage(file: Express.Multer.File): Promise<string> {
    try {
      if (!file || !file.originalname) {
        throw new Error('No file provided for enhancement');
      }

      const enhancedDir = path.join(process.cwd(), 'uploads', 'enhanced');
      if (!fs.existsSync(enhancedDir)) {
        fs.mkdirSync(enhancedDir, { recursive: true });
      }

      const ext = path.extname(file.originalname);
      const baseName = path.basename(file.originalname, ext);
      const enhancedFileName = `${baseName}_enhanced${ext}`;
      const enhancedPath = path.join(enhancedDir, enhancedFileName);

      fs.writeFileSync(enhancedPath, file.buffer);

      return path.relative(process.cwd(), enhancedPath);
    } catch (error) {
      this.logger.error('Image enhancement failed:', error);
      throw error;
    }
  }

  async performMultiEngineOCR(filePath: string): Promise<OCRResult[]> {
    const results: OCRResult[] = [];

    try {
      results.push({
        text: 'Mock OCR text result',
        confidence: 85.5,
        engine: 'tesseract',
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

    return results.reduce((best, current) => (current.confidence > best.confidence ? current : best));
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
          timestamp: new Date().toISOString(),
        },
      },
    });

    return { success: true, message: 'Correction saved for learning' };
  }

  async getScanStatus() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pendingScan, scanningInProgress, processedToday, errorCount, scanners] = await Promise.all([
      this.prisma.bordereau.count({ where: { statut: 'A_SCANNER' } }),
      this.prisma.bordereau.count({ where: { statut: 'SCAN_EN_COURS' } }),
      this.prisma.bordereau.count({ where: { statut: 'SCANNE', dateFinScan: { gte: today } } }),
      this.prisma.bordereau.count({ where: { statut: 'EN_DIFFICULTE', updatedAt: { gte: today } } }),
      this.detectScanners(),
    ]);

    return {
      foldersMonitored: 3,
      scannersAvailable: scanners.length,
      processingQueue: pendingScan + scanningInProgress,
      processedToday,
      errorCount,
      pendingScan,
      scanningInProgress,
    };
  }

  async getRecentScanActivity(limit = 50) {
    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        action: { in: ['SCAN_STARTED', 'SCAN_COMPLETED', 'MANUAL_SCAN_STARTED', 'MANUAL_SCAN_COMPLETED', 'OCR_COMPLETED'] },
        timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return auditLogs.map((log) => {
      const details: any = log.details || {};
      return {
        id: log.id,
        action: this.getActionFromAuditLog(log.action),
        timestamp: log.timestamp,
        details: {
          reference: details.reference || 'N/A',
          client: details.client || 'N/A',
          // Fixed: operator precedence previously made this always evaluate
          // to 1 or 0, discarding the real documentsCount value.
          documentCount: details.documentsCount ?? (details.documentName ? 1 : 0),
          status: this.getStatusFromAction(log.action),
        },
      };
    });
  }

  async getScanActivityChart() {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const activities = await this.prisma.auditLog.findMany({
      where: {
        action: { in: ['SCAN_STARTED', 'SCAN_COMPLETED', 'MANUAL_SCAN_STARTED', 'MANUAL_SCAN_COMPLETED', 'OCR_COMPLETED'] },
        timestamp: { gte: last24Hours },
      },
      orderBy: { timestamp: 'asc' },
    });

    const hourlyData = new Map<string, number>();

    for (let i = 0; i < 24; i++) {
      const hour = new Date(Date.now() - (23 - i) * 60 * 60 * 1000);
      const hourKey = hour.toISOString().substring(0, 13) + ':00:00.000Z';
      hourlyData.set(hourKey, 0);
    }

    activities.forEach((activity) => {
      const hourKey = activity.timestamp.toISOString().substring(0, 13) + ':00:00.000Z';
      hourlyData.set(hourKey, (hourlyData.get(hourKey) || 0) + 1);
    });

    return Array.from(hourlyData.entries()).map(([timestamp, count]) => ({
      timestamp,
      count,
      hour: new Date(timestamp).getHours(),
    }));
  }

  private getActionFromAuditLog(action: string): string {
    switch (action) {
      case 'SCAN_STARTED':
        return 'SCAN_IN_PROGRESS';
      case 'SCAN_VALIDATED':
        return 'SCAN_COMPLETED';
      case 'OCR_COMPLETED':
        return 'OCR_PROCESSED';
      default:
        return 'SCAN_ACTIVITY';
    }
  }

  private getStatusFromAction(action: string): string {
    switch (action) {
      case 'SCAN_STARTED':
        return 'scanning';
      case 'SCAN_VALIDATED':
        return 'completed';
      case 'OCR_COMPLETED':
        return 'processed';
      default:
        return 'active';
    }
  }

  async retryFailedScan(fileName: string) {
    return { success: true, message: 'File moved back to scan queue' };
  }

  private async simulateProgressiveScan(jobId: string, bordereauId: string) {
    const job = this.activeScanJobs.get(jobId);
    if (!job) return;

    const progressInterval = setInterval(() => {
      const currentJob = this.activeScanJobs.get(jobId);
      if (!currentJob) {
        clearInterval(progressInterval);
        return;
      }
      currentJob.progress = Math.min(95, currentJob.progress + 15);
      this.activeScanJobs.set(jobId, currentJob);
    }, 500);

    setTimeout(async () => {
      clearInterval(progressInterval);
      try {
        await this.completeScanProcess(bordereauId);
        const completedJob = this.activeScanJobs.get(jobId);
        if (completedJob) {
          completedJob.progress = 100;
          completedJob.status = 'completed';
          this.activeScanJobs.set(jobId, completedJob);

          setTimeout(() => {
            this.activeScanJobs.delete(jobId);
          }, 30000);
        }
      } catch (error) {
        this.logger.error(`Progressive scan failed for job ${jobId}:`, error);
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
          scanStartTime: memoryJob.startTime,
        };
      }

      const parts = jobId.split('_');
      const bordereauId = parts.length >= 2 ? parts[1] : null;

      if (!bordereauId) {
        return { status: 'error', progress: 0, error: 'Invalid job ID format' };
      }

      const bordereau = await this.prisma.bordereau.findUnique({
        where: { id: bordereauId },
        include: {
          client: { select: { name: true } },
          documents: true,
        },
      });

      if (!bordereau) {
        return { status: 'not_found', progress: 0 };
      }

      let progress = 0;
      let status = 'scanning';

      switch (bordereau.statut) {
        case 'SCAN_EN_COURS':
          progress = 50;
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
        scanEndTime: bordereau.dateFinScan,
      };
    } catch (error: any) {
      return { status: 'error', progress: 0, error: error.message };
    }
  }

  async processPendingScanQueue() {
    const pendingBordereaux = await this.prisma.bordereau.findMany({
      where: { statut: 'A_SCANNER' },
      take: 5,
      include: {
        client: { select: { name: true } },
        documents: true,
      },
    });

    const results: Array<{ bordereauId: string; reference: string; status: string; error?: string }> = [];

    for (const bordereau of pendingBordereaux) {
      try {
        await this.prisma.bordereau.update({
          where: { id: bordereau.id },
          data: {
            statut: 'SCAN_EN_COURS',
            dateDebutScan: new Date(),
          },
        });

        setTimeout(async () => {
          await this.completeScanProcess(bordereau.id);
        }, Math.random() * 10000 + 5000);

        results.push({ bordereauId: bordereau.id, reference: bordereau.reference, status: 'started' });
      } catch (error: any) {
        this.logger.error(`Failed to start scan for ${bordereau.reference}:`, error);
        results.push({ bordereauId: bordereau.id, reference: bordereau.reference, status: 'error', error: error.message });
      }
    }

    return { processedCount: results.length, results };
  }

  async completeScanProcess(bordereauId: string) {
    try {
      const bordereau = await this.prisma.bordereau.update({
        where: { id: bordereauId },
        data: {
          statut: 'SCANNE', // Always set to SCANNE as per requirements
          dateFinScan: new Date(),
        },
        include: {
          client: {
            include: {
              gestionnaires: { select: { id: true, fullName: true, role: true } },
            },
          },
        },
      });

      // Status stays SCANNE — no auto-assignment to A_AFFECTER within the SCAN module.
      const finalStatus = 'SCANNE';

      for (const [jobId, job] of this.activeScanJobs.entries()) {
        if (job.bordereauId === bordereauId) {
          job.status = 'completed';
          job.progress = 100;
          job.currentStatus = finalStatus;
          this.activeScanJobs.set(jobId, job);
        }
      }

      await this.prisma.document.updateMany({
        where: { bordereauId },
        data: { status: 'TRAITE' },
      });

      await this.prisma.traitementHistory
        .create({
          data: {
            bordereauId,
            userId: 'SYSTEM',
            action: 'SCAN_COMPLETED',
            fromStatus: 'SCAN_EN_COURS',
            toStatus: finalStatus,
          },
        })
        .catch((err) => {
          this.logger.warn('Failed to create completion history:', err);
        });

      await this.prisma.auditLog
        .create({
          data: {
            userId: 'SYSTEM',
            action: 'SCAN_COMPLETED',
            details: {
              bordereauId,
              reference: bordereau.reference,
              finalStatus,
              timestamp: new Date().toISOString(),
            },
          },
        })
        .catch((err) => {
          this.logger.warn('Failed to create completion audit log:', err);
        });

      return { success: true, bordereauId, status: finalStatus };
    } catch (error) {
      this.logger.error(`Failed to complete scan for bordereau ${bordereauId}:`, error);

      await this.prisma.bordereau.update({
        where: { id: bordereauId },
        data: { statut: 'EN_DIFFICULTE' },
      });

      throw error;
    }
  }

  private startPaperStreamWatcher() {
    // chokidar is intentionally lazy-loaded via require() rather than a
    // top-level import: it's only needed by this optional folder-watcher
    // feature, so app startup shouldn't hard-depend on it being installed.
    const chokidar = require('chokidar');

    const inputDir = path.join(process.cwd(), 'paperstream-input');

    if (this.paperStreamWatcher) {
      this.paperStreamWatcher.close();
    }

    this.paperStreamWatcher = chokidar.watch(inputDir, {
      ignored: /^\./,
      persistent: true,
      ignoreInitial: false,
    });

    this.paperStreamWatcher.on('add', async (filePath: string) => {
      await this.processPaperStreamFile(filePath);
    });
  }

  private async processPaperStreamFile(filePath: string) {
    try {
      const fileName = path.basename(filePath);
      const fileExt = path.extname(fileName).toLowerCase();

      if (!SUPPORTED_SCAN_EXTENSIONS.includes(fileExt)) {
        this.logger.warn(`Unsupported file type: ${fileName}`);
        return;
      }

      // Shorter wait for bulk imports (200ms instead of 1s)
      await new Promise((resolve) => setTimeout(resolve, 200));

      const fileHash = await this.calculateFileHashStream(filePath);

      const existingDoc = await this.prisma.document.findUnique({ where: { hash: fileHash } }).catch(() => null);

      if (existingDoc) {
        this.logger.warn(`Duplicate file detected: ${fileName}`);
        this.moveToProcessed(filePath, 'duplicate');
        return;
      }

      const bordereau = await this.prisma.bordereau.findFirst({
        where: { statut: 'A_SCANNER' },
        include: { client: true },
      });

      if (!bordereau) {
        this.logger.warn('No bordereau available for new document');
        this.moveToProcessed(filePath, 'no-bordereau');
        return;
      }

      const processedPath = this.moveToProcessed(filePath);

      const user = await this.prisma.user.findFirst();
      if (!user) {
        this.logger.warn('No user found for document creation');
        this.moveToProcessed(filePath, 'no-user');
        return;
      }

      const document = await this.prisma.document.create({
        data: {
          name: fileName,
          type: this.mapToDocumentType(this.getDocumentType(fileName)),
          path: processedPath,
          uploadedById: user.id,
          bordereauId: bordereau.id,
          hash: fileHash,
          status: 'UPLOADED',
        },
      });

      await this.prisma.bordereau.update({
        where: { id: bordereau.id },
        data: {
          statut: 'SCAN_EN_COURS',
          dateDebutScan: new Date(),
        },
      });

      setTimeout(() => this.processDocumentOCR(document.id), 2000);
    } catch (error) {
      this.logger.error(`PaperStream processing failed for ${filePath}:`, error);
      this.moveToProcessed(filePath, 'error');
    }
  }

  private async calculateFileHashStream(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('md5');
      const stream = fs.createReadStream(filePath);

      stream.on('error', reject);
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
    });
  }

  private moveToProcessed(filePath: string, subfolder?: string): string {
    const fileName = path.basename(filePath);
    const processedDir = path.join(process.cwd(), 'paperstream-processed');

    let targetDir = processedDir;
    if (subfolder) {
      targetDir = path.join(processedDir, subfolder);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
    }

    const targetPath = path.join(targetDir, fileName);
    fs.renameSync(filePath, targetPath);

    return path.relative(process.cwd(), targetPath);
  }

  private getDocumentType(fileName: string): string {
    const name = fileName.toLowerCase();
    if (name.includes('bs') || name.includes('bulletin')) return 'BS';
    if (name.includes('facture')) return 'FACTURE';
    if (name.includes('contrat')) return 'CONTRAT';
    return 'DOCUMENT';
  }

  private async processDocumentOCR(documentId: string) {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: { bordereau: true },
      });

      if (!document) return;

      const ocrText = `OCR processed document: ${document.name}\nProcessed at: ${new Date().toISOString()}`;

      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          ocrText,
          status: 'TRAITE',
        },
      });

      await this.prisma.auditLog
        .create({
          data: {
            userId: 'PAPERSTREAM_SERVICE',
            action: 'OCR_COMPLETED',
            details: {
              documentId,
              documentName: document.name,
              ocrTextLength: ocrText.length,
              processedAt: new Date().toISOString(),
            },
          },
        })
        .catch(() => {
          this.logger.warn(`Failed to log OCR completion for document ${documentId}`);
        });

      if (document.bordereau) {
        await this.completeScanProcess(document.bordereau.id);
      }
    } catch (error) {
      this.logger.error(`OCR processing failed for document ${documentId}:`, error);
    }
  }

  async triggerPaperStreamImport() {
    try {
      const inputDir = path.join(process.cwd(), 'paperstream-input');

      if (!fs.existsSync(inputDir)) {
        fs.mkdirSync(inputDir, { recursive: true });
      }

      const files = fs.readdirSync(inputDir);
      const validFiles = files.filter((file) => {
        const filePath = path.join(inputDir, file);
        const stats = fs.statSync(filePath);
        const ext = path.extname(file).toLowerCase();
        return stats.isFile() && SUPPORTED_SCAN_EXTENSIONS.includes(ext);
      });

      const results: Array<{ fileName: string; status: string }> = [];

      // Process in batches of 5 to avoid overwhelming the DB.
      const PARALLEL_LIMIT = 5;
      for (let i = 0; i < validFiles.length; i += PARALLEL_LIMIT) {
        const batch = validFiles.slice(i, i + PARALLEL_LIMIT);
        const promises = batch.map((file) => {
          const filePath = path.join(inputDir, file);
          return this.processPaperStreamFile(filePath)
            .then(() => {
              results.push({ fileName: file, status: 'processed' });
            })
            .catch((error) => {
              this.logger.error(`Failed to process file ${file}:`, error);
              results.push({ fileName: file, status: 'error' });
            });
        });

        await Promise.all(promises);
      }

      const folders = files.filter((item) => {
        const itemPath = path.join(inputDir, item);
        return fs.statSync(itemPath).isDirectory() && !item.startsWith('.');
      });

      for (const folder of folders) {
        const folderPath = path.join(inputDir, folder);
        try {
          const folderFiles = fs.readdirSync(folderPath);
          const hasDocuments = folderFiles.some((f) => /\.(pdf|jpg|jpeg|png|tiff|tif)$/i.test(f));
          const hasIndex = folderFiles.some((f) => f.toLowerCase().endsWith('.xml') || f.toLowerCase().endsWith('.csv'));

          if (hasDocuments && hasIndex) {
            // Batch folder — the watcher handles ingestion, we just report it.
            results.push({ fileName: `${folder}/ (batch)`, status: 'batch_detected' });
          }
        } catch (error) {
          this.logger.error(`Failed to process folder ${folder}:`, error);
        }
      }

      return {
        importedCount: results.filter((r) => r.status === 'processed').length,
        files: results,
        message: results.length > 0 ? 'Files processed successfully' : 'No new files to process',
      };
    } catch (error: any) {
      this.logger.error('Manual PaperStream import failed:', error);
      return {
        importedCount: 0,
        files: [],
        error: error.message,
        message: 'Import failed',
      };
    }
  }

  async getScanQueue() {
    return this.prisma.bordereau.findMany({
      where: { statut: { in: ['A_SCANNER', 'SCAN_EN_COURS', 'SCANNE', 'A_AFFECTER'] } },
      include: {
        client: {
          select: {
            name: true,
            gestionnaires: { select: { id: true, fullName: true, role: true } },
          },
        },
        contract: {
          select: { delaiReglement: true, delaiReclamation: true },
        },
        documents: {
          select: { name: true, type: true, status: true },
        },
      },
      orderBy: { dateReception: 'asc' },
    });
  }

  async getReturnedBordereaux() {
    const bordereaux = await this.prisma.bordereau.findMany({
      where: { documentStatus: 'RETOURNER_AU_SCAN' },
      include: {
        client: {
          select: {
            name: true,
            gestionnaires: { select: { id: true, fullName: true, role: true } },
          },
        },
        contract: { select: { delaiReglement: true, delaiReclamation: true } },
        documents: { select: { id: true, name: true, type: true, status: true, uploadedAt: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const returnedDocuments = await this.prisma.document.findMany({
      where: { status: 'RETOURNER_AU_SCAN' },
      include: {
        bordereau: {
          include: {
            client: {
              select: {
                name: true,
                gestionnaires: { select: { id: true, fullName: true, role: true } },
              },
            },
            contract: { select: { delaiReglement: true, delaiReclamation: true } },
            documents: { select: { id: true, name: true, type: true, status: true, uploadedAt: true } },
          },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    return [
      ...bordereaux.map((b) => ({
        ...b,
        returnType: 'BORDEREAU',
        scanStatus: 'SCAN_EN_COURS',
      })),
      ...returnedDocuments.map((doc) => ({
        id: doc.bordereauId,
        reference: doc.bordereau?.reference || 'N/A',
        clientId: doc.bordereau?.clientId,
        client: doc.bordereau?.client,
        contract: doc.bordereau?.contract,
        documents: doc.bordereau?.documents || [],
        dateReception: doc.bordereau?.dateReception,
        updatedAt: doc.uploadedAt,
        returnType: 'DOCUMENT',
        returnedDocument: {
          id: doc.id,
          name: doc.name,
          type: doc.type,
          status: doc.status,
          uploadedAt: doc.uploadedAt,
        },
        scanStatus: 'SCAN_EN_COURS',
      })),
    ];
  }

  async startScanning(bordereauId: string, userId: string) {
    const bordereau = await this.prisma.bordereau.update({
      where: { id: bordereauId },
      data: {
        statut: 'SCAN_EN_COURS',
        dateDebutScan: new Date(),
        currentHandlerId: userId,
      },
      include: { client: true },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'SCAN_STARTED',
        details: {
          bordereauId,
          reference: bordereau.reference,
          client: bordereau.client?.name,
          timestamp: new Date().toISOString(),
        },
      },
    });

    await this.prisma.traitementHistory
      .create({
        data: {
          bordereauId,
          userId,
          action: 'SCAN_STARTED',
          fromStatus: bordereau.statut,
          toStatus: 'SCAN_EN_COURS',
        },
      })
      .catch((err) => {
        this.logger.warn('Failed to create traitement history:', err);
      });

    return bordereau;
  }

  async validateScanning(bordereauId: string, userId: string) {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: {
        client: {
          include: {
            gestionnaires: { where: { role: 'CHEF_EQUIPE' }, select: { id: true, fullName: true } },
          },
        },
        documents: true,
      },
    });

    if (!bordereau) {
      throw new BadRequestException('Bordereau not found');
    }

    const updatedBordereau = await this.prisma.bordereau.update({
      where: { id: bordereauId },
      data: {
        statut: 'SCANNE',
        dateFinScan: new Date(),
        currentHandlerId: userId,
      },
    });

    // Every document tied to this bordereau — whether by bordereauId, or by
    // name matching/containing the bordereau reference (legacy linking) —
    // moves to SCANNE. Collapsed from 4 sequential, heavily overlapping
    // updateMany calls into 1: the end state is identical, but this is a
    // single round trip instead of four.
    await this.prisma.document.updateMany({
      where: {
        OR: [
          { bordereauId },
          { name: bordereau.reference },
          { name: { contains: bordereau.reference } },
        ],
      },
      data: { status: 'SCANNE' },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'SCAN_VALIDATED',
        details: {
          bordereauId,
          reference: bordereau.reference,
          documentsCount: bordereau.documents.length,
          timestamp: new Date().toISOString(),
          scanStartTime: bordereau.dateDebutScan?.toISOString(),
          scanEndTime: new Date().toISOString(),
        },
      },
    });

    await this.prisma.traitementHistory
      .create({
        data: {
          bordereauId,
          userId,
          action: 'SCAN_COMPLETED',
          fromStatus: 'SCAN_EN_COURS',
          toStatus: 'SCANNE',
        },
      })
      .catch((err) => {
        this.logger.warn('Failed to create traitement history:', err);
      });

    return {
      success: true,
      message: 'Scanning validated and completed',
      bordereau: updatedBordereau,
    };
  }

  async checkScanOverload() {
    const [pendingCount, inProgressCount] = await Promise.all([
      this.prisma.bordereau.count({ where: { statut: 'A_SCANNER' } }),
      this.prisma.bordereau.count({ where: { statut: 'SCAN_EN_COURS' } }),
    ]);

    const totalWorkload = pendingCount + inProgressCount;
    const overloadThreshold = 20;

    if (totalWorkload > overloadThreshold) {
      const scanQueue = await this.prisma.bordereau.findMany({
        where: { statut: { in: ['A_SCANNER', 'SCAN_EN_COURS'] } },
        include: {
          client: { select: { name: true } },
          contract: { select: { delaiReglement: true } },
        },
      });

      const slaAtRisk = scanQueue.filter((b) => {
        const scan = calculateAllSLAs({
          dateReception: b.dateReception,
          delaiReglement: b.delaiReglement || b.contract?.delaiReglement || 30,
          statut: b.statut,
          dateDebutScan: b.dateDebutScan,
          dateFinScan: b.dateFinScan,
          dateCloture: b.dateCloture,
          dateExecutionVirement: b.dateExecutionVirement,
        }).scan;
        return scan.statusColor === 'ORANGE' || scan.statusColor === 'RED';
      });

      await this.prisma.alertLog.create({
        data: {
          alertType: 'SCAN_OVERLOAD',
          alertLevel: 'HIGH',
          message: `SCAN service overloaded: ${totalWorkload} items in queue (threshold: ${overloadThreshold})`,
          notifiedRoles: ['SUPER_ADMIN'],
          resolved: false,
        },
      });

      return {
        overloaded: true,
        totalWorkload,
        threshold: overloadThreshold,
        slaAtRisk: slaAtRisk.length,
        details: slaAtRisk.map((b) => ({
          reference: b.reference,
          client: b.client?.name,
          daysPending: calculateAllSLAs({
            dateReception: b.dateReception,
            delaiReglement: b.delaiReglement || b.contract?.delaiReglement || 30,
            statut: b.statut,
            dateDebutScan: b.dateDebutScan,
            dateFinScan: b.dateFinScan,
            dateCloture: b.dateCloture,
            dateExecutionVirement: b.dateExecutionVirement,
          }).scan.daysElapsed,
        })),
      };
    }

    return { overloaded: false, totalWorkload, threshold: overloadThreshold };
  }

  async getBordereauForScan(bordereauId: string) {
    return this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: {
        client: {
          select: {
            name: true,
            gestionnaires: { select: { id: true, fullName: true, role: true } },
          },
        },
        contract: {
          select: {
            id: true,
            clientName: true,
            delaiReglement: true,
            delaiReclamation: true,
            escalationThreshold: true,
            assignedManager: { select: { id: true, fullName: true, role: true } },
            teamLeader: { select: { id: true, fullName: true, role: true } },
          },
        },
        documents: {
          select: { id: true, name: true, type: true, status: true, ocrText: true, uploadedAt: true },
        },
        traitementHistory: {
          where: { action: { in: ['SCAN_STARTED', 'SCAN_COMPLETED'] } },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });
  }

  async updateBordereauDetails(bordereauId: string, updateData: any, userId: string) {
    const bordereau = await this.prisma.bordereau.findUnique({ where: { id: bordereauId } });

    if (!bordereau) {
      throw new BadRequestException('Bordereau not found');
    }

    const data: any = {};
    if (updateData.type !== undefined) data.type = updateData.type;
    if (updateData.clientId !== undefined) data.clientId = updateData.clientId;
    if (updateData.reference !== undefined) data.reference = updateData.reference;

    const updatedBordereau = await this.prisma.bordereau.update({
      where: { id: bordereauId },
      data,
      include: {
        client: { select: { name: true } },
        contract: { select: { clientName: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'BORDEREAU_DETAILS_UPDATED',
        details: {
          bordereauId,
          reference: updatedBordereau.reference,
          changes: updateData,
          updatedBy: userId,
        },
      },
    });

    return updatedBordereau;
  }

  async getScanDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [dailyStats, weeklyStats, qualityStats, overloadCheck] = await Promise.all([
      this.prisma.bordereau.groupBy({
        by: ['statut'],
        _count: { id: true },
        where: { statut: { in: ['A_SCANNER', 'SCAN_EN_COURS', 'SCANNE'] }, updatedAt: { gte: today } },
      }),
      this.prisma.bordereau.groupBy({
        by: ['statut'],
        _count: { id: true },
        where: { statut: { in: ['A_SCANNER', 'SCAN_EN_COURS', 'SCANNE'] }, updatedAt: { gte: thisWeek } },
      }),
      this.prisma.oCRLog
        .groupBy({
          by: ['status'],
          _count: { id: true },
          where: { ocrAt: { gte: today } },
        })
        .catch(() => []),
      this.checkScanOverload(),
    ]);

    return {
      daily: dailyStats,
      weekly: weeklyStats,
      quality: qualityStats,
      overload: overloadCheck,
      avgProcessingTime: Math.floor(Math.random() * 300) + 120,
    };
  }

  async debugBordereauxStatus() {
    const [statusCounts, allBordereaux, totalCount] = await Promise.all([
      this.prisma.bordereau.groupBy({ by: ['statut'], _count: { id: true } }),
      this.prisma.bordereau.findMany({
        select: {
          id: true,
          reference: true,
          statut: true,
          dateReception: true,
          client: { select: { name: true } },
        },
        orderBy: { dateReception: 'desc' },
        take: 10,
      }),
      this.prisma.bordereau.count(),
    ]);

    return {
      statusCounts,
      recentBordereaux: allBordereaux,
      totalCount,
    };
  }

  async createTestBordereau() {
    try {
      const client = await this.prisma.client.findFirst();
      if (!client) {
        throw new Error('No client found. Please create a client first.');
      }

      const bordereau = await this.prisma.bordereau.create({
        data: {
          reference: `TEST-SCAN-${Date.now()}`,
          clientId: client.id,
          dateReception: new Date(),
          delaiReglement: 30,
          nombreBS: 1,
          statut: 'A_SCANNER', // Should appear in SCAN queue
        },
        include: { client: { select: { name: true } } },
      });

      const user = await this.prisma.user.findFirst();
      if (!user) {
        throw new Error('No user found. Please create a user first.');
      }

      await this.prisma.document.create({
        data: {
          name: `test-document-${Date.now()}.pdf`,
          type: 'BULLETIN_SOIN',
          path: `/test/documents/test-document-${Date.now()}.pdf`,
          uploadedById: user.id,
          bordereauId: bordereau.id,
          status: 'UPLOADED',
        },
      });

      return {
        success: true,
        bordereau: {
          id: bordereau.id,
          reference: bordereau.reference,
          status: bordereau.statut,
          client: bordereau.client?.name,
          dateReception: bordereau.dateReception,
        },
        message: 'Test bordereau created successfully. It should now appear in SCAN queue.',
      };
    } catch (error: any) {
      this.logger.error('Failed to create test bordereau:', error);
      throw new BadRequestException(`Failed to create test bordereau: ${error.message}`);
    }
  }

  async updateBordereauToScan(bordereauId: string) {
    try {
      const bordereau = await this.prisma.bordereau.update({
        where: { id: bordereauId },
        data: { statut: 'A_SCANNER' },
        include: { client: { select: { name: true } } },
      });

      return {
        success: true,
        bordereau: {
          id: bordereau.id,
          reference: bordereau.reference,
          status: bordereau.statut,
          client: bordereau.client?.name,
        },
        message: 'Bordereau updated to A_SCANNER status. It should now appear in SCAN queue.',
      };
    } catch (error: any) {
      throw new BadRequestException(`Failed to update bordereau: ${error.message}`);
    }
  }

  async getDocumentStatsByType() {
    const documentStats = await this.prisma.document.groupBy({
      by: ['type', 'status'],
      _count: { id: true },
    });

    const typeMapping = {
      BULLETIN_SOIN: 'Bulletins de Soins',
      COMPLEMENT_INFORMATION: 'Compléments Info',
      ADHESION: 'Adhésions',
      RECLAMATION: 'Réclamations',
      CONTRAT_AVENANT: 'Contrats/Avenants',
      DEMANDE_RESILIATION: 'Demandes Résiliation',
      // Fixed: previously 'CONVENTION_TIERS', which doesn't match the actual
      // DocumentType enum value — every document of this type was silently
      // excluded from these stats.
      CONVENTION_TIERS_PAYANT: 'Conventions Tiers',
    };

    const result: Record<string, any> = {};

    Object.keys(typeMapping).forEach((type) => {
      result[type] = {
        name: typeMapping[type],
        total: 0,
        aScanner: 0,
        enCours: 0,
        scanne: 0,
        progression: 0,
      };
    });

    documentStats.forEach((stat) => {
      const type = stat.type;
      if (!result[type]) return;

      result[type].total += stat._count.id;

      switch (stat.status) {
        case 'UPLOADED':
          result[type].aScanner += stat._count.id;
          break;
        case 'TRAITE':
          result[type].enCours += stat._count.id;
          break;
        case 'SCANNE':
          result[type].scanne += stat._count.id;
          break;
      }
    });

    Object.keys(result).forEach((type) => {
      const stats = result[type];
      if (stats.total > 0) {
        stats.progression = Math.round(((stats.enCours + stats.scanne) / stats.total) * 100);
      }
    });

    return result;
  }

  async replaceDocument(bordereauId: string, documentName: string, newFile: Express.Multer.File, userId: string) {
    try {
      const existingDoc = await this.prisma.document.findFirst({
        where: { bordereauId, name: documentName },
      });

      if (!existingDoc) {
        throw new Error('Document original non trouvé');
      }

      const fileHash = crypto.createHash('md5').update(newFile.buffer).digest('hex');

      const uploadsDir = path.join(process.cwd(), 'uploads', 'corrections');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const newFilePath = path.join(uploadsDir, `${Date.now()}_${newFile.originalname}`);
      fs.writeFileSync(newFilePath, newFile.buffer);

      const updatedDoc = await this.prisma.document.update({
        where: { id: existingDoc.id },
        data: {
          name: newFile.originalname,
          path: path.relative(process.cwd(), newFilePath),
          hash: fileHash,
          status: 'UPLOADED',
          uploadedAt: new Date(),
        },
      });

      // Independent of each other — run together instead of sequentially.
      await Promise.all([
        this.prisma.auditLog.create({
          data: {
            userId,
            action: 'DOCUMENT_REPLACED',
            details: {
              bordereauId,
              documentId: existingDoc.id,
              documentName,
              originalPath: existingDoc.path,
              newPath: updatedDoc.path,
              newFileName: newFile.originalname,
            },
          },
        }),
        this.prisma.bordereau.updateMany({
          where: { id: bordereauId, documentStatus: 'RETOURNER_AU_SCAN' },
          data: { documentStatus: 'NORMAL' },
        }),
      ]);

      return { success: true, document: updatedDoc };
    } catch (error) {
      this.logger.error('Document replacement failed:', error);
      throw error;
    }
  }

  async addMissingDocument(bordereauId: string, newFile: Express.Multer.File, documentType: string, userId: string) {
    try {
      const fileHash = crypto.createHash('md5').update(newFile.buffer).digest('hex');

      const uploadsDir = path.join(process.cwd(), 'uploads', 'missing-docs');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filePath = path.join(uploadsDir, `${Date.now()}_${newFile.originalname}`);
      fs.writeFileSync(filePath, newFile.buffer);

      const newDoc = await this.prisma.document.create({
        data: {
          name: newFile.originalname,
          type: this.mapToDocumentType(documentType),
          path: path.relative(process.cwd(), filePath),
          uploadedById: userId,
          bordereauId,
          hash: fileHash,
          status: 'UPLOADED',
        },
      });

      await Promise.all([
        this.prisma.auditLog.create({
          data: {
            userId,
            action: 'MISSING_DOCUMENT_ADDED',
            details: {
              bordereauId,
              documentId: newDoc.id,
              documentName: newFile.originalname,
              documentType,
            },
          },
        }),
        this.prisma.bordereau.updateMany({
          where: { id: bordereauId, documentStatus: 'RETOURNER_AU_SCAN' },
          data: { documentStatus: 'NORMAL' },
        }),
      ]);

      return { success: true, document: newDoc };
    } catch (error) {
      this.logger.error('Missing document addition failed:', error);
      throw error;
    }
  }

  async getBordereauDocuments(bordereauId: string) {
    return this.prisma.document.findMany({
      where: { bordereauId },
      orderBy: { uploadedAt: 'asc' },
    });
  }

  async completeCorrections(bordereauId: string, userId: string) {
    try {
      const updatedBordereau = await this.prisma.bordereau.update({
        where: { id: bordereauId },
        data: {
          documentStatus: 'NORMAL',
          statut: 'SCAN_EN_COURS', // Return to scan en cours for validation, not A_SCANNER
        },
      });

      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'CORRECTIONS_COMPLETED',
          details: {
            bordereauId,
            reference: updatedBordereau.reference,
            completedAt: new Date().toISOString(),
          },
        },
      });

      return {
        success: true,
        message: 'Corrections terminées - Bordereau en cours de scan pour validation',
        bordereau: updatedBordereau,
      };
    } catch (error) {
      this.logger.error('Failed to complete corrections:', error);
      throw error;
    }
  }

  private mapToDocumentType(oldType?: string): any {
    if (!oldType) return 'BULLETIN_SOIN';

    const mapping: Record<string, string> = {
      BS: 'BULLETIN_SOIN',
      BULLETIN_SOIN: 'BULLETIN_SOIN',
      FACTURE: 'COMPLEMENT_INFORMATION',
      CONTRAT: 'CONTRAT_AVENANT',
      DOCUMENT: 'BULLETIN_SOIN',
    };

    return mapping[oldType.toUpperCase()] || 'BULLETIN_SOIN';
  }

  async ensureScanHistoryExists(bordereauId: string) {
    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: {
        traitementHistory: true,
        currentHandler: true,
      },
    });

    if (!bordereau) return;

    if (bordereau.traitementHistory.length === 0 && bordereau.dateDebutScan) {
      const userId = bordereau.currentHandler?.id || 'SYSTEM';

      try {
        await this.prisma.traitementHistory.create({
          data: {
            bordereauId,
            userId,
            action: 'SCAN_STARTED',
            fromStatus: 'A_SCANNER',
            toStatus: 'SCAN_EN_COURS',
            createdAt: bordereau.dateDebutScan,
          },
        });

        if (bordereau.dateFinScan && ['SCANNE', 'A_AFFECTER'].includes(bordereau.statut)) {
          await this.prisma.traitementHistory.create({
            data: {
              bordereauId,
              userId,
              action: 'SCAN_COMPLETED',
              fromStatus: 'SCAN_EN_COURS',
              toStatus: bordereau.statut,
              createdAt: bordereau.dateFinScan,
            },
          });
        }
      } catch (error) {
        this.logger.warn(`Failed to create scan history for ${bordereauId}:`, error);
      }
    }
  }

  async getBordereauScanHistory(bordereauId: string) {
    await this.ensureScanHistoryExists(bordereauId);

    const bordereau = await this.prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: {
        client: { select: { name: true } },
        documents: { select: { id: true, name: true, uploadedAt: true } },
        currentHandler: { select: { fullName: true, email: true, role: true } },
        traitementHistory: {
          include: {
            user: { select: { id: true, email: true, fullName: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!bordereau) {
      throw new BadRequestException('Bordereau not found');
    }

    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        OR: [
          { details: { path: ['bordereauId'], equals: bordereauId } },
          { details: { path: ['reference'], equals: bordereau.reference } },
        ],
      },
      include: {
        user: { select: { id: true, email: true, fullName: true, role: true } },
      },
      orderBy: { timestamp: 'asc' },
    });

    const timeline: any[] = [];

    bordereau.traitementHistory.forEach((history, index) => {
      const nextHistory = bordereau.traitementHistory[index + 1];
      const duration = nextHistory ? (nextHistory.createdAt.getTime() - history.createdAt.getTime()) / (1000 * 60) : null;

      timeline.push({
        action: history.action,
        timestamp: history.createdAt,
        user: history.user
          ? { id: history.user.id, username: history.user.email, fullName: history.user.fullName, role: history.user.role }
          : null,
        details: `${history.fromStatus} → ${history.toStatus}`,
        duration: duration ? Math.round(duration) : null,
        source: 'traitement_history',
      });
    });

    if (timeline.length === 0) {
      for (let i = 0; i < auditLogs.length; i++) {
        const log = auditLogs[i];
        const nextLog = auditLogs[i + 1];

        const duration = nextLog ? (nextLog.timestamp.getTime() - log.timestamp.getTime()) / (1000 * 60) : null;

        timeline.push({
          action: log.action,
          timestamp: log.timestamp,
          user: log.user ? { id: log.user.id, username: log.user.email, fullName: log.user.fullName, role: log.user.role } : null,
          details: log.details,
          duration: duration ? Math.round(duration) : null,
          source: 'audit_log',
        });
      }
    }

    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const scanStartTime = bordereau.dateDebutScan || bordereau.createdAt;
    const scanEndTime = bordereau.dateFinScan || bordereau.updatedAt;
    const totalDuration = scanStartTime && scanEndTime ? (scanEndTime.getTime() - scanStartTime.getTime()) / (1000 * 60) : null;

    const scanUser = bordereau.currentHandler || timeline.find((t) => t.user)?.user;

    return {
      bordereauId,
      reference: bordereau.reference,
      client: bordereau.client?.name,
      timeline,
      summary: {
        documentsScanned: bordereau.documents.length,
        totalDuration: totalDuration ? Math.round(totalDuration) : null,
        scanStartTime,
        scanEndTime,
        slaStatus: bordereau.statut,
        slaImpact: totalDuration && totalDuration > 60 ? 'At Risk' : 'On Track',
        scanUser: scanUser ? { fullName: scanUser.fullName, email: scanUser.email, role: scanUser.role } : null,
      },
      dataSource: timeline.length > 0 ? timeline[0].source : 'none',
      persistenceStatus: 'enhanced',
    };
  }

  async modifyBordereau(bordereauId: string, data: { reference?: string; clientId?: any; dateReception?: string }, userId: string) {
    try {
      const bordereau = await this.prisma.bordereau.findUnique({
        where: { id: bordereauId },
        include: { client: true },
      });

      if (!bordereau) {
        throw new BadRequestException('Bordereau non trouvé');
      }

      const updateData: any = {};
      if (data.reference) updateData.reference = data.reference;
      if (data.dateReception) updateData.dateReception = new Date(data.dateReception);

      if (data.clientId) {
        const clientIdStr = typeof data.clientId === 'string' ? data.clientId : data.clientId.toString();
        const clientExists = await this.prisma.client.findUnique({ where: { id: clientIdStr } });

        if (!clientExists) {
          throw new BadRequestException(`Client avec ID ${clientIdStr} n'existe pas`);
        }

        updateData.clientId = clientIdStr;
      }

      const updatedBordereau = await this.prisma.bordereau.update({
        where: { id: bordereauId },
        data: updateData,
        include: { client: { select: { name: true } } },
      });

      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'BORDEREAU_MODIFIED',
          details: {
            bordereauId,
            oldReference: bordereau.reference,
            newReference: data.reference,
            oldClientId: bordereau.clientId,
            newClientId: data.clientId?.toString(),
          },
        },
      });

      return { success: true, bordereau: updatedBordereau };
    } catch (error) {
      this.logger.error('Modify bordereau failed:', error);
      throw error;
    }
  }

  async backfillAllScanHistory() {
    try {
      const bordereaux = await this.prisma.bordereau.findMany({
        where: {
          OR: [
            { dateDebutScan: { not: null } },
            { dateFinScan: { not: null } },
            { statut: { in: ['SCANNE', 'A_AFFECTER', 'ASSIGNE', 'EN_COURS', 'TRAITE'] } },
          ],
        },
        include: {
          traitementHistory: true,
          currentHandler: true,
        },
      });

      let backfilledCount = 0;

      for (const bordereau of bordereaux) {
        const hasScanHistory = bordereau.traitementHistory.some((h) => h.action.includes('SCAN'));
        if (hasScanHistory) continue;

        const userId = bordereau.currentHandler?.id || 'SYSTEM';

        try {
          if (bordereau.dateDebutScan) {
            await this.prisma.traitementHistory.create({
              data: {
                bordereauId: bordereau.id,
                userId,
                action: 'SCAN_STARTED',
                fromStatus: 'A_SCANNER',
                toStatus: 'SCAN_EN_COURS',
                createdAt: bordereau.dateDebutScan,
              },
            });
          }

          if (bordereau.dateFinScan || ['SCANNE', 'A_AFFECTER'].includes(bordereau.statut)) {
            const completionDate = bordereau.dateFinScan || bordereau.updatedAt;
            await this.prisma.traitementHistory.create({
              data: {
                bordereauId: bordereau.id,
                userId,
                action: 'SCAN_COMPLETED',
                fromStatus: 'SCAN_EN_COURS',
                toStatus: bordereau.statut,
                createdAt: completionDate,
              },
            });
          }

          backfilledCount++;
        } catch (error) {
          this.logger.warn(`Failed to backfill history for ${bordereau.reference}:`, error);
        }
      }

      return {
        success: true,
        message: `Backfilled scan history for ${backfilledCount} bordereaux`,
        backfilledCount,
        totalChecked: bordereaux.length,
      };
    } catch (error: any) {
      this.logger.error('Backfill scan history failed:', error);
      throw new BadRequestException(`Backfill failed: ${error.message}`);
    }
  }
}