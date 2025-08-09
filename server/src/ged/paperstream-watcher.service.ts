import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BordereauxService } from '../bordereaux/bordereaux.service';
import { AlertsService } from '../alerts/alerts.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class PaperStreamWatcherService {
  private readonly logger = new Logger(PaperStreamWatcherService.name);
  private readonly watchFolder = process.env.PAPERSTREAM_WATCH_FOLDER || './watch-folder';

  constructor(
    private prisma: PrismaService,
    private bordereauxService: BordereauxService,
    private alertsService: AlertsService,
  ) {
    this.ensureWatchFolder();
  }

  private ensureWatchFolder() {
    if (!fs.existsSync(this.watchFolder)) {
      fs.mkdirSync(this.watchFolder, { recursive: true });
    }
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async watchForNewFiles() {
    try {
      const files = fs.readdirSync(this.watchFolder);
      for (const filename of files) {
        if (this.isValidFile(filename)) {
          await this.processFile(filename);
        }
      }
    } catch (error) {
      this.logger.error('Error watching folder:', error);
    }
  }

  private isValidFile(filename: string): boolean {
    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.tiff'];
    return validExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  }

  private async processFile(filename: string) {
    const filePath = path.join(this.watchFolder, filename);
    
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

      // Create document record
      const document = await this.prisma.document.create({
        data: {
          name: filename,
          type: this.getDocumentType(filename),
          path: permanentPath,
          hash,
          status: 'UPLOADED',
          uploadedById: 'SYSTEM', // System user for auto-imports
          bordereauId,
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
}