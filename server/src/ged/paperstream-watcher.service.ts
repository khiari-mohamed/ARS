import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from './notification.service';
import { OcrService } from '../ocr/ocr.service';
import * as chokidar from 'chokidar';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class PaperStreamWatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaperStreamWatcherService.name);
  private watcher: chokidar.FSWatcher | null = null;
  private readonly watchDir = process.env.PAPERSTREAM_WATCH_DIR || 'D:/PAPERSTREAM-INBOX'; // configurable
  private readonly allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png'];
  private readonly maxSize = 10 * 1024 * 1024; // 10MB

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private ocrService: OcrService,
  ) {}

  async onModuleInit() {
    this.logger.log(`Starting PaperStream watcher on: ${this.watchDir}`);
    this.watcher = chokidar.watch(this.watchDir, { persistent: true, ignoreInitial: false });
    this.watcher.on('add', this.handleFileAdd.bind(this));
    this.watcher.on('error', (err) => this.logger.error('Watcher error', err));
  }

  async onModuleDestroy() {
    if (this.watcher) await this.watcher.close();
  }

  private async handleFileAdd(filePath: string) {
    this.logger.log(`Detected new file: ${filePath}`);
    try {
      const ext = path.extname(filePath).toLowerCase();
      if (!this.allowedTypes.includes(ext)) {
        this.logger.warn(`File type not allowed: ${filePath}`);
        await this.logAction('REJECTED_TYPE', filePath, `Type: ${ext}`);
        return;
      }
      const stat = fs.statSync(filePath);
      if (stat.size > this.maxSize) {
        this.logger.warn(`File too large: ${filePath}`);
        await this.logAction('REJECTED_SIZE', filePath, `Size: ${stat.size}`);
        return;
      }
      // Duplicate detection by hash
      const hash = await this.computeFileHash(filePath);
      const existing = await this.prisma.document.findFirst({ where: { hash } });
      if (existing) {
        this.logger.warn(`Duplicate file detected: ${filePath}`);
        await this.logAction('DUPLICATE', filePath, `Hash: ${hash}`);
        return;
      }
      // Move file to uploads dir
      const uploadsDir = path.resolve('uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
      const destPath = path.join(uploadsDir, path.basename(filePath));
      fs.renameSync(filePath, destPath);
      // OCR and metadata extraction
      let ocrText = '';
      let ocrResult: any = {};
      try {
        ocrText = await this.ocrService.extractText(destPath);
        ocrResult = this.ocrService.parseFields(ocrText);
      } catch (e) {
        this.logger.warn(`OCR failed for ${destPath}: ${e.message}`);
      }
      // Try to find bordereau by reference
      let bordereau: any = null;
      if (ocrResult.reference) {
        bordereau = await this.prisma.bordereau.findFirst({ where: { reference: ocrResult.reference } });
      }
      // Create document in DB, link to bordereau if found
      const doc = await this.prisma.document.create({
        data: {
          name: path.basename(destPath),
          type: ext.replace('.', ''),
          path: destPath,
          uploadedById: '0ce7d8c7-64ee-45a6-b8a5888', // System import
          status: 'UPLOADED',
          hash,
          bordereauId: bordereau && bordereau.id ? bordereau.id : undefined,
          ocrText,
          ocrResult,
        },
      });
      await this.logAction('IMPORTED', destPath, `Hash: ${hash}`);
      // If linked to bordereau, update status and auto-assign
      if (bordereau && bordereau.id) {
        await this.prisma.bordereau.update({
          where: { id: bordereau.id },
          data: { statut: 'SCAN_TERMINE' },
        });
        // Auto-assign to team lead based on client/account manager
        const contract = await this.prisma.contract.findUnique({ where: { id: bordereau.contractId } });
        if (contract && contract.assignedManagerId) {
          await this.prisma.bordereau.update({
            where: { id: bordereau.id },
            data: { teamId: contract.assignedManagerId },
          });
          // Check overload: count open bordereaux for this team
          const openCount = await this.prisma.bordereau.count({ where: { teamId: contract.assignedManagerId, statut: { not: 'CLOTURE' } } });
          const threshold = contract.escalationThreshold || 50;
          if (openCount > threshold) {
            await this.notificationService.notify('team_overload', { teamId: contract.assignedManagerId, bordereauId: bordereau.id });
          }
        }
      }
      // Trigger workflow (auto-assign to SCAN or Team Lead)
      await this.notificationService.notify('document_uploaded', { document: doc, user: null });
      this.logger.log(`Imported and triggered workflow for: ${destPath}`);
    } catch (err) {
      this.logger.error(`Error importing file: ${filePath}`, err);
      await this.logAction('ERROR', filePath, err?.message || String(err));
    }
  }

  private async computeFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  private async logAction(action: string, filePath: string, details: string) {
    await this.prisma.auditLog.create({
      data: {
        userId: null,
        action: `PAPERSTREAM_${action}`,
        details: { filePath, details },
        timestamp: new Date(),
      },
    });
  }
}
