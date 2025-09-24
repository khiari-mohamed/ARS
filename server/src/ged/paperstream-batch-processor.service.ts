import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as xml2js from 'xml2js';

const processingLocks = new Set<string>();

interface PaperStreamBatch {
  batchId: string;
  operatorId: string;
  scannerModel: string;
  timestamp: Date;
  files: PaperStreamFile[];
  metadata: any;
}

interface PaperStreamFile {
  fileName: string;
  filePath: string;
  fileType: 'PDF' | 'TIFF' | 'TXT' | 'XML' | 'CSV';
  pageCount?: number;
  resolution?: number;
  colorMode?: string;
  barcodes?: string[];
  imprinterIds?: string[];
}

@Injectable()
export class PaperStreamBatchProcessor {
  private readonly logger = new Logger(PaperStreamBatchProcessor.name);

  constructor(private prisma: PrismaService) {}

  async processBatchFolder(batchFolderPath: string, hierarchyInfo?: { clientName?: string; scanDate?: string }): Promise<void> {
    // Prevent duplicate processing
    if (processingLocks.has(batchFolderPath)) {
      this.logger.warn(`Batch already being processed: ${batchFolderPath}`);
      return;
    }
    
    processingLocks.add(batchFolderPath);
    
    try {
      this.logger.log(`Processing PaperStream batch: ${batchFolderPath}`);
      
      const batch = await this.parseBatchFolder(batchFolderPath);
      if (!batch) {
        this.logger.warn(`Invalid batch folder: ${batchFolderPath}`);
        return;
      }

      // Find bordereau by barcode auto-linking
      const bordereauId = await this.findBordereauByBarcodes(batch);
      
      if (!bordereauId) {
        this.logger.warn(`No bordereau found for batch ${batch.batchId}`);
        await this.quarantineBatch(batchFolderPath, 'NO_BORDEREAU_MATCH');
        return;
      }

      // Process all files in batch together
      await this.ingestBatchFiles(batch, bordereauId, hierarchyInfo);
      
      // Update bordereau status
      await this.updateBordereauScanStatus(bordereauId, batch);
      
      // Move batch to processed
      await this.moveBatchToProcessed(batchFolderPath, batch.batchId);
      
      this.logger.log(`Batch ${batch.batchId} processed successfully`);
    } catch (error) {
      this.logger.error(`Batch processing failed: ${error.message}`);
      await this.quarantineBatch(batchFolderPath, 'PROCESSING_ERROR', error.message);
    } finally {
      processingLocks.delete(batchFolderPath);
    }
  }

  private async parseBatchFolder(batchFolderPath: string): Promise<PaperStreamBatch | null> {
    const files = fs.readdirSync(batchFolderPath);
    
    // Find index file (XML or CSV)
    const indexFile = files.find(f => f.toLowerCase().endsWith('.xml') || f.toLowerCase().endsWith('.csv'));
    if (!indexFile) {
      this.logger.warn(`No index file found in batch: ${batchFolderPath}`);
      return null;
    }

    const indexPath = path.join(batchFolderPath, indexFile);
    const metadata = await this.parseIndexFile(indexPath);
    
    if (!metadata) return null;

    const batchFiles: PaperStreamFile[] = [];
    
    for (const file of files) {
      if (file === indexFile) continue;
      
      const filePath = path.join(batchFolderPath, file);
      const fileType = this.getFileType(file);
      
      const batchFile: PaperStreamFile = {
        fileName: file,
        filePath,
        fileType,
        pageCount: metadata.files?.[file]?.pageCount,
        resolution: metadata.files?.[file]?.resolution,
        colorMode: metadata.files?.[file]?.colorMode,
        barcodes: metadata.files?.[file]?.barcodes || [],
        imprinterIds: metadata.files?.[file]?.imprinterIds || []
      };
      
      batchFiles.push(batchFile);
    }

    return {
      batchId: metadata.batchId || path.basename(batchFolderPath),
      operatorId: metadata.operatorId || 'UNKNOWN',
      scannerModel: metadata.scannerModel || 'fi-7600',
      timestamp: new Date(metadata.timestamp || Date.now()),
      files: batchFiles,
      metadata
    };
  }

  private async parseIndexFile(indexPath: string): Promise<any> {
    try {
      const content = fs.readFileSync(indexPath, 'utf8');
      
      if (indexPath.toLowerCase().endsWith('.xml')) {
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(content);
        return this.extractMetadataFromXML(result);
      } else if (indexPath.toLowerCase().endsWith('.csv')) {
        return this.extractMetadataFromCSV(content);
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Failed to parse index file ${indexPath}: ${error.message}`);
      return null;
    }
  }

  private extractMetadataFromXML(xmlData: any): any {
    try {
      const batch = xmlData.PaperStreamBatch || xmlData.Batch || xmlData;
      
      return {
        batchId: batch.BatchID?.[0] || batch.batchId?.[0],
        operatorId: batch.OperatorID?.[0] || batch.operatorId?.[0],
        scannerModel: batch.ScannerModel?.[0] || batch.scannerModel?.[0] || 'fi-7600',
        timestamp: batch.Timestamp?.[0] || batch.timestamp?.[0],
        files: this.extractFileMetadataFromXML(batch.Files?.[0] || batch.files?.[0])
      };
    } catch (error) {
      this.logger.error(`XML metadata extraction failed: ${error.message}`);
      return null;
    }
  }

  private extractFileMetadataFromXML(filesData: any): Record<string, any> {
    const files: Record<string, any> = {};
    
    if (!filesData || !filesData.File) return files;
    
    const fileList = Array.isArray(filesData.File) ? filesData.File : [filesData.File];
    
    for (const file of fileList) {
      const fileName = file.FileName?.[0] || file.fileName?.[0];
      if (!fileName) continue;
      
      files[fileName] = {
        pageCount: parseInt(file.PageCount?.[0] || file.pageCount?.[0] || '1'),
        resolution: parseInt(file.Resolution?.[0] || file.resolution?.[0] || '300'),
        colorMode: file.ColorMode?.[0] || file.colorMode?.[0] || 'color',
        barcodes: this.extractBarcodesFromXML(file.Barcodes?.[0] || file.barcodes?.[0]),
        imprinterIds: this.extractImprinterIdsFromXML(file.ImprinterIDs?.[0] || file.imprinterIds?.[0])
      };
    }
    
    return files;
  }

  private extractBarcodesFromXML(barcodesData: any): string[] {
    if (!barcodesData) return [];
    
    const barcodes: string[] = [];
    const barcodeList = Array.isArray(barcodesData.Barcode) ? barcodesData.Barcode : [barcodesData.Barcode];
    
    for (const barcode of barcodeList) {
      if (barcode && typeof barcode === 'string') {
        barcodes.push(barcode);
      } else if (barcode && barcode.Value) {
        barcodes.push(barcode.Value[0] || barcode.Value);
      }
    }
    
    return barcodes;
  }

  private extractImprinterIdsFromXML(imprinterData: any): string[] {
    if (!imprinterData) return [];
    
    const ids: string[] = [];
    const idList = Array.isArray(imprinterData.ID) ? imprinterData.ID : [imprinterData.ID];
    
    for (const id of idList) {
      if (id && typeof id === 'string') {
        ids.push(id);
      }
    }
    
    return ids;
  }

  private extractMetadataFromCSV(csvContent: string): any {
    try {
      const lines = csvContent.split('\n').filter(line => line.trim());
      if (lines.length < 2) return null;
      
      const headers = lines[0].split(',').map(h => h.trim());
      const metadata: any = { files: {} };
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        
        if (row.FileName) {
          metadata.files[row.FileName] = {
            pageCount: parseInt(row.PageCount || '1'),
            resolution: parseInt(row.Resolution || '300'),
            colorMode: row.ColorMode || 'color',
            barcodes: row.Barcodes ? row.Barcodes.split(';') : [],
            imprinterIds: row.ImprinterIDs ? row.ImprinterIDs.split(';') : []
          };
        }
        
        // Extract batch-level metadata from first row
        if (i === 1) {
          metadata.batchId = row.BatchID || row.batchId;
          metadata.operatorId = row.OperatorID || row.operatorId;
          metadata.scannerModel = row.ScannerModel || row.scannerModel || 'fi-7600';
          metadata.timestamp = row.Timestamp || row.timestamp;
        }
      }
      
      return metadata;
    } catch (error) {
      this.logger.error(`CSV metadata extraction failed: ${error.message}`);
      return null;
    }
  }

  private async findBordereauByBarcodes(batch: PaperStreamBatch): Promise<string | null> {
    // Extract all barcodes from all files in batch
    const allBarcodes: string[] = [];
    for (const file of batch.files) {
      if (file.barcodes) {
        allBarcodes.push(...file.barcodes);
      }
    }
    
    if (allBarcodes.length === 0) {
      this.logger.warn(`No barcodes found in batch ${batch.batchId}`);
      return null;
    }
    
    // Try to find bordereau by reference matching barcodes
    for (const barcode of allBarcodes) {
      const bordereau = await this.prisma.bordereau.findFirst({
        where: {
          OR: [
            { reference: barcode },
            { reference: { contains: barcode } },
            // Try different barcode formats
            { reference: barcode.replace(/[^A-Z0-9]/g, '') },
            { reference: { contains: barcode.replace(/[^A-Z0-9]/g, '') } }
          ],
          statut: { in: ['A_SCANNER', 'SCAN_EN_COURS'] }
        }
      });
      
      if (bordereau) {
        this.logger.log(`Found bordereau ${bordereau.reference} for barcode ${barcode}`);
        return bordereau.id;
      }
    }
    
    this.logger.warn(`No bordereau found for barcodes: ${allBarcodes.join(', ')}`);
    return null;
  }

  private async ingestBatchFiles(batch: PaperStreamBatch, bordereauId: string, hierarchyInfo?: { clientName?: string; scanDate?: string }): Promise<void> {
    const systemUser = await this.prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' }
    });
    
    if (!systemUser) {
      throw new Error('No system user found for document ingestion');
    }
    
    for (const file of batch.files) {
      if (file.fileType === 'XML' || file.fileType === 'CSV') continue;
      
      // Calculate file hash for deduplication
      const fileBuffer = fs.readFileSync(file.filePath);
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      
      // Check for duplicates (primary: hash, secondary: barcode + pageCount + batchId)
      const existingDoc = await this.findDuplicateDocument(fileHash, file, batch.batchId);
      if (existingDoc) {
        this.logger.warn(`Duplicate document detected: ${file.fileName}`);
        await this.quarantineFile(file.filePath, 'DUPLICATE', `Original: ${existingDoc.id}`);
        continue;
      }
      
      // Move file to permanent storage with proper naming
      const permanentPath = await this.moveFileToStorage(file, batch, hierarchyInfo);
      
      // Create document record with all PaperStream metadata
      await this.prisma.document.create({
        data: {
          name: file.fileName,
          type: this.mapToDocumentType(this.getDocumentTypeFromFile(file.fileName)),
          path: permanentPath,
          uploadedById: systemUser.id,
          bordereauId,
          hash: fileHash,
          status: 'UPLOADED',
          batchId: batch.batchId,
          barcodeValues: file.barcodes || [],
          pageCount: file.pageCount,
          resolution: file.resolution,
          colorMode: file.colorMode,
          operatorId: batch.operatorId,
          scannerModel: batch.scannerModel,
          imprinterIds: file.imprinterIds || [],
          ingestStatus: 'INGESTED',
          ingestTimestamp: new Date()
        }
      });
      
      this.logger.log(`Ingested document: ${file.fileName} (batch: ${batch.batchId})`);
    }
  }

  private async findDuplicateDocument(fileHash: string, file: PaperStreamFile, batchId: string): Promise<any> {
    // Primary deduplication: file hash
    let existing = await this.prisma.document.findUnique({
      where: { hash: fileHash }
    });
    
    if (existing) return existing;
    
    // Secondary deduplication: barcode + pageCount + different batchId
    if (file.barcodes && file.barcodes.length > 0 && file.pageCount) {
      existing = await this.prisma.document.findFirst({
        where: {
          barcodeValues: { hasSome: file.barcodes },
          pageCount: file.pageCount,
          batchId: { not: batchId }
        }
      });
    }
    
    return existing;
  }

  private async moveFileToStorage(file: PaperStreamFile, batch: PaperStreamBatch, hierarchyInfo?: { clientName?: string; scanDate?: string }): Promise<string> {
    let storageDir: string;
    
    if (hierarchyInfo?.clientName && hierarchyInfo?.scanDate) {
      // Use hierarchical structure: client/date/batch
      storageDir = path.join(process.cwd(), 'uploads', 'paperstream', 
        hierarchyInfo.clientName,
        hierarchyInfo.scanDate,
        batch.batchId
      );
    } else {
      // Fallback to timestamp-based structure
      storageDir = path.join(process.cwd(), 'uploads', 'paperstream', 
        batch.timestamp.getFullYear().toString(),
        String(batch.timestamp.getMonth() + 1).padStart(2, '0'),
        batch.batchId
      );
    }
    
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    
    const targetPath = path.join(storageDir, file.fileName);
    fs.copyFileSync(file.filePath, targetPath);
    
    return path.relative(process.cwd(), targetPath);
  }

  private async updateBordereauScanStatus(bordereauId: string, batch: PaperStreamBatch): Promise<void> {
    await this.prisma.bordereau.update({
      where: { id: bordereauId },
      data: {
        statut: 'SCANNE',
        dateFinScan: new Date()
      }
    });
    
    // Create audit log with proper user reference
    try {
      const systemUser = await this.prisma.user.findFirst({
        where: { role: 'SUPER_ADMIN' }
      });
      
      await this.prisma.auditLog.create({
        data: {
          action: 'PAPERSTREAM_BATCH_PROCESSED',
          entityType: 'BATCH',
          entityId: batch.batchId,
          details: `PaperStream batch processed: ${batch.batchId} (${batch.files.length} files)`,
          userId: systemUser?.id || null,
          timestamp: new Date(),
        }
      });
    } catch (auditError) {
      this.logger.warn(`Failed to create batch audit log: ${auditError.message}`);
    }
  }

  private async moveBatchToProcessed(batchFolderPath: string, batchId: string): Promise<void> {
    const processedDir = path.join(process.cwd(), 'paperstream-processed', 'success');
    if (!fs.existsSync(processedDir)) {
      fs.mkdirSync(processedDir, { recursive: true });
    }
    
    const targetPath = path.join(processedDir, `${batchId}_${Date.now()}`);
    fs.renameSync(batchFolderPath, targetPath);
  }

  private async quarantineBatch(batchFolderPath: string, errorType: string, details?: string): Promise<void> {
    const quarantineDir = path.join(process.cwd(), 'paperstream-processed', 'quarantine', errorType);
    if (!fs.existsSync(quarantineDir)) {
      fs.mkdirSync(quarantineDir, { recursive: true });
    }
    
    const batchName = path.basename(batchFolderPath);
    const targetPath = path.join(quarantineDir, `${batchName}_${Date.now()}`);
    fs.renameSync(batchFolderPath, targetPath);
    
    // Log quarantine action
    try {
      const systemUser = await this.prisma.user.findFirst({
        where: { role: 'SUPER_ADMIN' }
      });
      
      await this.prisma.auditLog.create({
        data: {
          action: 'PAPERSTREAM_BATCH_QUARANTINED',
          details: `Batch quarantined: ${errorType} - ${details || 'No details'} (Batch: ${batchName})`,
          userId: systemUser?.id || null,
          timestamp: new Date(),
        }
      });
    } catch (auditError) {
      this.logger.warn(`Failed to create quarantine audit log: ${auditError.message}`);
    }
  }

  private async quarantineFile(filePath: string, errorType: string, details?: string): Promise<void> {
    const quarantineDir = path.join(process.cwd(), 'paperstream-processed', 'quarantine', errorType);
    if (!fs.existsSync(quarantineDir)) {
      fs.mkdirSync(quarantineDir, { recursive: true });
    }
    
    const fileName = path.basename(filePath);
    const targetPath = path.join(quarantineDir, `${Date.now()}_${fileName}`);
    fs.copyFileSync(filePath, targetPath);
  }

  private getFileType(fileName: string): PaperStreamFile['fileType'] {
    const ext = path.extname(fileName).toLowerCase();
    switch (ext) {
      case '.pdf': return 'PDF';
      case '.tif':
      case '.tiff': return 'TIFF';
      case '.txt': return 'TXT';
      case '.xml': return 'XML';
      case '.csv': return 'CSV';
      default: return 'PDF';
    }
  }

  private getDocumentTypeFromFile(fileName: string): string {
    const name = fileName.toLowerCase();
    if (name.includes('bs') || name.includes('bulletin')) return 'BS';
    if (name.includes('facture')) return 'FACTURE';
    if (name.includes('contrat')) return 'CONTRAT';
    if (name.includes('recu')) return 'RECU';
    return 'DOCUMENT';
  }

  // NEW: Map old document types to new enum
  private mapToDocumentType(oldType?: string): any {
    if (!oldType) return 'BULLETIN_SOIN';
    
    const mapping: Record<string, string> = {
      'BS': 'BULLETIN_SOIN',
      'BULLETIN_SOIN': 'BULLETIN_SOIN',
      'FACTURE': 'COMPLEMENT_INFORMATION',
      'CONTRAT': 'CONTRAT_AVENANT',
      'RECU': 'COMPLEMENT_INFORMATION',
      'DOCUMENT': 'BULLETIN_SOIN'
    };
    
    return mapping[oldType.toUpperCase()] || 'BULLETIN_SOIN';
  }
}