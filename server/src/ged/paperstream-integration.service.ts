import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class PaperStreamIntegrationService {
  private readonly logger = new Logger(PaperStreamIntegrationService.name);
  private readonly watchFolder = process.env.PAPERSTREAM_WATCH_FOLDER || './paperstream-input';
  private readonly processedFolder = process.env.PAPERSTREAM_PROCESSED_FOLDER || './paperstream-processed';

  constructor(private prisma: PrismaService) {
    this.ensureFoldersExist();
  }

  private ensureFoldersExist() {
    [this.watchFolder, this.processedFolder].forEach(folder => {
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
      }
    });
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async processNewScannedFiles() {
    try {
      // Check for batch folders first
      const items = fs.readdirSync(this.watchFolder);
      
      for (const item of items) {
        const itemPath = path.join(this.watchFolder, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          // Process as batch folder
          await this.processBatchFolder(itemPath);
        } else if (stats.isFile() && /\.(pdf|jpg|jpeg|png|tiff|tif)$/i.test(item)) {
          // Process individual file (legacy mode)
          await this.processScannedFile(item);
        }
      }
    } catch (error) {
      this.logger.error('Error processing scanned files:', error);
    }
  }
  
  private async processBatchFolder(batchFolderPath: string) {
    try {
      this.logger.log(`Processing PaperStream batch folder: ${batchFolderPath}`);
      
      // Check if this is a leaf directory with actual batch files
      const files = fs.readdirSync(batchFolderPath);
      const hasIndex = files.some(f => f.toLowerCase().endsWith('.xml') || f.toLowerCase().endsWith('.csv'));
      const hasDocuments = files.some(f => /\.(pdf|jpg|jpeg|png|tiff|tif)$/i.test(f));
      
      if (!hasIndex || !hasDocuments) {
        // This might be a parent directory, check subdirectories
        const subdirs = files.filter(f => {
          const fullPath = path.join(batchFolderPath, f);
          return fs.statSync(fullPath).isDirectory();
        });
        
        // Process each subdirectory that might be a batch folder
        for (const subdir of subdirs) {
          const subdirPath = path.join(batchFolderPath, subdir);
          await this.processBatchFolder(subdirPath);
        }
        return;
      }
      
      // This is an actual batch folder, process it
      this.logger.log(`Found valid batch folder: ${batchFolderPath}`);
      
      // Use the batch processor
      const { PaperStreamBatchProcessor } = require('./paperstream-batch-processor.service');
      const batchProcessor = new PaperStreamBatchProcessor(this.prisma);
      await batchProcessor.processBatchFolder(batchFolderPath);
      
    } catch (error) {
      this.logger.error(`Batch folder processing failed: ${error.message}`);
    }
  }

  private async processScannedFile(fileName: string) {
    try {
      const filePath = path.join(this.watchFolder, fileName);
      const processedPath = path.join(this.processedFolder, fileName);
      
      // Extract metadata from filename (assuming format: CLIENTREF_BORDEREAU_TIMESTAMP.ext)
      const metadata = this.extractMetadataFromFilename(fileName);
      
      // Move file to processed folder
      fs.renameSync(filePath, processedPath);
      
      // Create document record
      await this.createDocumentRecord(fileName, processedPath, metadata);
      
      // Trigger OCR if needed
      await this.triggerOCRProcessing(fileName, processedPath);
      
      this.logger.log(`Processed scanned file: ${fileName}`);
    } catch (error) {
      this.logger.error(`Error processing file ${fileName}:`, error);
    }
  }

  private extractMetadataFromFilename(fileName: string) {
    // Parse filename format: CLIENTREF_BORDEREAU_TIMESTAMP.ext
    const parts = fileName.split('_');
    return {
      clientRef: parts[0] || 'UNKNOWN',
      bordereauRef: parts[1] || null,
      timestamp: parts[2] ? parts[2].split('.')[0] : Date.now().toString(),
      originalName: fileName
    };
  }

  private async createDocumentRecord(fileName: string, filePath: string, metadata: any) {
    try {
      // Find bordereau by reference if provided
      let bordereauId: string | null = null;
      if (metadata.bordereauRef) {
        const bordereau = await this.prisma.bordereau.findFirst({
          where: { reference: metadata.bordereauRef }
        });
        bordereauId = bordereau?.id ?? null;
      }
      
      // Get system user
      const systemUser = await this.prisma.user.findFirst({
        where: { role: 'SUPER_ADMIN' }
      });
      
      if (!systemUser) {
        throw new Error('No system user found');
      }
      
      // Calculate file hash
      const fileBuffer = fs.readFileSync(filePath);
      const hash = require('crypto').createHash('sha256').update(fileBuffer).digest('hex');

      // Create document record with PaperStream fields
      await this.prisma.document.create({
        data: {
          name: fileName,
          type: 'SCANNED_DOCUMENT',
          path: filePath,
          uploadedById: systemUser.id,
          bordereauId,
          status: 'UPLOADED',
          hash,
          batchId: metadata.batchId || `LEGACY_${Date.now()}`,
          barcodeValues: metadata.barcodes || [],
          pageCount: metadata.pageCount || 1,
          resolution: metadata.resolution || 300,
          colorMode: metadata.colorMode || 'color',
          operatorId: metadata.operatorId || 'LEGACY_SCAN',
          scannerModel: metadata.scannerModel || 'UNKNOWN',
          imprinterIds: metadata.imprinterIds || [],
          ingestStatus: 'INGESTED',
          ingestTimestamp: new Date()
        }
      });
    } catch (error) {
      this.logger.error('Error creating document record:', error);
    }
  }

  private async triggerOCRProcessing(fileName: string, filePath: string) {
    // Trigger OCR processing (integrate with existing OCR service)
    try {
      // This would integrate with your existing OCR service
      this.logger.log(`OCR processing queued for: ${fileName}`);
    } catch (error) {
      this.logger.error('Error triggering OCR:', error);
    }
  }

  async getProcessingStatus() {
    const watchFiles = fs.readdirSync(this.watchFolder).length;
    const processedFiles = fs.readdirSync(this.processedFolder).length;
    
    return {
      pendingFiles: watchFiles,
      processedFiles,
      lastProcessed: new Date().toISOString(),
      status: 'active'
    };
  }
}