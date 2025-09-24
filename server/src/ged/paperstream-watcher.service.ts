import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BordereauxService } from '../bordereaux/bordereaux.service';
import { AlertsService } from '../alerts/alerts.service';
import { PaperStreamBatchProcessor } from './paperstream-batch-processor.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Cron, CronExpression } from '@nestjs/schedule';
const chokidar = require('chokidar');

@Injectable()
export class PaperStreamWatcherService {
  private readonly logger = new Logger(PaperStreamWatcherService.name);
  private readonly watchFolder = process.env.PAPERSTREAM_WATCH_FOLDER || './paperstream-input';
  private folderWatcher: any = null;

  constructor(
    private prisma: PrismaService,
    private bordereauxService: BordereauxService,
    private alertsService: AlertsService,
    private batchProcessor: PaperStreamBatchProcessor,
  ) {
    this.ensureWatchFolder();
    this.startFolderWatcher();
  }

  private ensureWatchFolder() {
    if (!fs.existsSync(this.watchFolder)) {
      fs.mkdirSync(this.watchFolder, { recursive: true });
    }
  }

  private startFolderWatcher() {
    if (this.folderWatcher) {
      this.folderWatcher.close();
    }
    
    this.folderWatcher = chokidar.watch(this.watchFolder, {
      ignored: /^\./,
      persistent: true,
      ignoreInitial: true,
      depth: 3
    });
    
    this.folderWatcher.on('addDir', async (dirPath: string) => {
      if (this.isBatchFolder(dirPath)) {
        setTimeout(() => this.processBatchFolder(dirPath), 5000);
      }
    });
    
    this.folderWatcher.on('add', async (filePath: string) => {
      if (this.isValidFile(path.basename(filePath))) {
        await this.processIndividualFile(filePath);
      }
    });
    
    this.logger.log(`PaperStream folder watcher started: ${this.watchFolder}`);
  }
  
  private isBatchFolder(dirPath: string): boolean {
    const relativePath = path.relative(this.watchFolder, dirPath);
    const parts = relativePath.split(path.sep);
    
    // Support both hierarchical (client/date/batch) and flat (batch) structures
    // Expected: client/date/batchID (3 levels) or just batchID (1 level)
    if (parts.length !== 3 && parts.length !== 1) return false;
    if (parts[parts.length - 1].startsWith('.')) return false;
    
    // For hierarchical structure, validate date format in middle part
    if (parts.length === 3) {
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(parts[1])) return false;
    }
    
    // Check if it contains batch files
    try {
      const files = require('fs').readdirSync(dirPath);
      const hasDocuments = files.some(f => /\.(pdf|jpg|jpeg|png|tiff|tif)$/i.test(f));
      const hasIndex = files.some(f => f.toLowerCase().endsWith('.xml') || f.toLowerCase().endsWith('.csv'));
      return hasDocuments && hasIndex;
    } catch {
      return false;
    }
  }
  
  private async processBatchFolder(batchFolderPath: string) {
    try {
      this.logger.log(`New batch folder detected: ${batchFolderPath}`);
      if (!this.validateBatchFolder(batchFolderPath)) {
        this.logger.warn(`Invalid batch folder: ${batchFolderPath}`);
        return;
      }
      
      // Extract client and date from hierarchical path if present
      const relativePath = path.relative(this.watchFolder, batchFolderPath);
      const parts = relativePath.split(path.sep);
      
      let clientName: string | undefined;
      let scanDate: string | undefined;
      
      if (parts.length === 3) {
        // Hierarchical structure: client/date/batch
        clientName = parts[0];
        scanDate = parts[1];
        this.logger.log(`Processing hierarchical batch - Client: ${clientName}, Date: ${scanDate}, Batch: ${parts[2]}`);
      }
      
      await (this.batchProcessor as any).processBatchFolder(batchFolderPath, { clientName, scanDate });
    } catch (error) {
      this.logger.error(`Batch folder processing failed: ${error.message}`);
    }
  }
  
  private validateBatchFolder(batchFolderPath: string): boolean {
    try {
      const files = fs.readdirSync(batchFolderPath);
      const hasDocuments = files.some(f => this.isValidFile(f));
      const hasIndex = files.some(f => f.toLowerCase().endsWith('.xml') || f.toLowerCase().endsWith('.csv'));
      return hasDocuments && hasIndex;
    } catch (error) {
      return false;
    }
  }
  
  @Cron(CronExpression.EVERY_30_SECONDS)
  async watchForNewFiles() {
    try {
      const files = fs.readdirSync(this.watchFolder);
      for (const filename of files) {
        const filePath = path.join(this.watchFolder, filename);
        const stats = fs.statSync(filePath);
        if (stats.isFile() && this.isValidFile(filename)) {
          await this.processIndividualFile(filePath);
        }
      }
    } catch (error) {
      this.logger.error('Error in legacy file watching:', error);
    }
  }

  private isValidFile(filename: string): boolean {
    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.tiff'];
    return validExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  }

  private async processIndividualFile(filePath: string) {
    const filename = path.basename(filePath);
    
    try {
      // Calculate file hash for deduplication
      const fileBuffer = fs.readFileSync(filePath);
      const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // Check for duplicates
      const existingDoc = await this.prisma.document.findUnique({
        where: { hash }
      });

      if (existingDoc) {
        this.logger.warn(`Duplicate file detected: ${filename}`);
        await this.logImportError(filename, 'DUPLICATE_FILE', 'File already exists in system');
        fs.unlinkSync(filePath); // Remove duplicate
        return;
      }

      // Extract bordereau reference from filename (pattern: REF_YYYY_NNN_*)
      const bordereauRef = this.extractBordereauReference(filename);
      let bordereauId: string | null = null;

      if (bordereauRef) {
        const bordereau = await this.prisma.bordereau.findFirst({
          where: { reference: bordereauRef }
        });
        bordereauId = bordereau?.id || null;
      }

      // Move file to permanent storage
      const permanentPath = await this.moveToStorage(filePath, filename);

      const systemUser = await this.prisma.user.findFirst({
        where: { role: 'SUPER_ADMIN' }
      });
      
      if (!systemUser) {
        throw new Error('No system user found');
      }
      
      const document = await this.prisma.document.create({
        data: {
          name: filename,
          type: this.mapToDocumentType(this.getDocumentType(filename)),
          path: permanentPath,
          hash,
          status: 'UPLOADED',
          uploadedById: systemUser.id,
          bordereauId,
          batchId: `LEGACY_${Date.now()}`,
          barcodeValues: [],
          pageCount: 1,
          resolution: 300,
          colorMode: 'color',
          operatorId: 'LEGACY_IMPORT',
          scannerModel: 'UNKNOWN',
          imprinterIds: [],
          ingestStatus: 'INGESTED',
          ingestTimestamp: new Date()
        }
      });

      // Update bordereau status if linked
      if (bordereauId) {
        await this.bordereauxService.update(bordereauId, {
          statut: 'SCAN_TERMINE' as any,
          dateFinScan: new Date().toISOString()
        });
      }

      // Trigger OCR processing
      await this.triggerOCR(document.id);

      this.logger.log(`Successfully processed file: ${filename}`);

    } catch (error) {
      this.logger.error(`Error processing file ${filename}:`, error);
      await this.logImportError(filename, 'PROCESSING_ERROR', error.message);
      
      // Alert SCAN admin
      await this.alertsService.triggerAlert({
        type: 'SCAN_IMPORT_ERROR',
        bsId: filename
      });
    }
  }

  private extractBordereauReference(filename: string): string | null {
    // Pattern: REF_2025_001_document.pdf -> REF/2025/001
    const match = filename.match(/^([A-Z0-9]+)_(\d{4})_(\d{3})/);
    return match ? `${match[1]}/${match[2]}/${match[3]}` : null;
  }

  private getDocumentType(filename: string): string {
    if (filename.toLowerCase().includes('bs')) return 'BS';
    if (filename.toLowerCase().includes('contrat')) return 'CONTRAT';
    if (filename.toLowerCase().includes('recu')) return 'RECU';
    return 'AUTRE';
  }

  private async moveToStorage(sourcePath: string, filename: string): Promise<string> {
    const storageDir = path.join(process.cwd(), 'uploads', 'documents');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    const timestamp = Date.now();
    const newFilename = `${timestamp}_${filename}`;
    const destPath = path.join(storageDir, newFilename);
    
    fs.renameSync(sourcePath, destPath);
    return path.relative(process.cwd(), destPath);
  }

  private async triggerOCR(documentId: string) {
    // Placeholder for OCR integration
    // In production, this would call OCR service
    await this.prisma.document.update({
      where: { id: documentId },
      data: {
        ocrText: 'OCR processing queued...',
        status: 'EN_COURS'
      }
    });
  }

  private async logImportError(filename: string, errorType: string, details: string) {
    await this.prisma.auditLog.create({
      data: {
        userId: 'SYSTEM',
        action: 'PAPERSTREAM_IMPORT_ERROR',
        details: { filename, errorType, details }
      }
    }).catch(() => {
      // Fallback to console if audit log fails
      this.logger.error(`Import error: ${filename} - ${errorType}: ${details}`);
    });
  }

  // NEW: Map old document types to new enum
  private mapToDocumentType(oldType?: string): any {
    if (!oldType) return 'BULLETIN_SOIN';
    
    const mapping: Record<string, string> = {
      'BS': 'BULLETIN_SOIN',
      'BULLETIN_SOIN': 'BULLETIN_SOIN',
      'CONTRAT': 'CONTRAT_AVENANT',
      'RECU': 'COMPLEMENT_INFORMATION',
      'AUTRE': 'BULLETIN_SOIN'
    };
    
    return mapping[oldType.toUpperCase()] || 'BULLETIN_SOIN';
  }

  async triggerBatchProcessing(): Promise<any> {
    try {
      const batchFolders = fs.readdirSync(this.watchFolder, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => path.join(this.watchFolder, dirent.name));
      
      let processedCount = 0;
      for (const batchFolder of batchFolders) {
        if (this.isBatchFolder(batchFolder)) {
          await this.processBatchFolder(batchFolder);
          processedCount++;
        }
      }
      
      return {
        success: true,
        message: `Processed ${processedCount} batch folders`,
        processedCount
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}