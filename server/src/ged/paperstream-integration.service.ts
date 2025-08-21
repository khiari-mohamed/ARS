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
      const files = fs.readdirSync(this.watchFolder);
      const imageFiles = files.filter(file => 
        /\.(pdf|jpg|jpeg|png|tiff|tif)$/i.test(file)
      );

      for (const file of imageFiles) {
        await this.processScannedFile(file);
      }
    } catch (error) {
      this.logger.error('Error processing scanned files:', error);
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

      // Create document record
      await this.prisma.document.create({
        data: {
          name: fileName,
          type: 'SCANNED_DOCUMENT',
          path: filePath,
          uploadedById: 'PAPERSTREAM_SYSTEM',
          bordereauId,
          status: 'UPLOADED'
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