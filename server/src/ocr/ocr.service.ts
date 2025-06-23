import { Injectable, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OcrRequestDto } from './dto/ocr-request.dto';
import { OcrResponseDto } from './dto/ocr-response.dto';
import * as Tesseract from 'tesseract.js';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class OcrService {
  /**
   * Extract text from an image or PDF using Tesseract.js
   * Supports local file paths and URLs (downloads to temp file if needed)
   */
  async extractText(documentUrl: string): Promise<string> {
    let filePath = documentUrl;
    // If documentUrl is a URL, download to temp file
    if (/^https?:\/\//.test(documentUrl)) {
      const axios = require('axios');
      const tmp = require('tmp');
      const tempFile = tmp.fileSync({ postfix: path.extname(documentUrl) });
      const writer = fs.createWriteStream(tempFile.name);
      const response = await axios({ url: documentUrl, method: 'GET', responseType: 'stream' });
      await new Promise<void>((resolve, reject) => {
        response.data.pipe(writer);
        writer.on('finish', () => resolve());
        writer.on('error', (err) => reject(err));
      });
      filePath = tempFile.name;
    }
    // Run Tesseract OCR
    try {
      const { data } = await Tesseract.recognize(filePath, 'fra+eng');
      return data.text;
    } catch (e) {
      this.logger.error('OCR extraction failed', e);
      throw new Error('OCR extraction failed: ' + e.message);
    }
  }
  private readonly logger = new Logger(OcrService.name);
  constructor(private prisma: PrismaService) {}

  private checkOcrRole(user: any) {
    if (!['SCAN', 'SUPER_ADMIN', 'CHEF_EQUIPE'].includes(user.role)) {
      throw new ForbiddenException('Access denied');
    }
  }

  async processOcr(file: Express.Multer.File, dto: OcrRequestDto, user: any): Promise<OcrResponseDto> {
    this.checkOcrRole(user);
    // Find document
    const document = await this.prisma.document.findUnique({ where: { id: dto.documentId } });
    if (!document) throw new NotFoundException('Document not found');
    // OCR
    let rawText = '';
    let status: 'SUCCESS' | 'FAILED' = 'SUCCESS';
    let error = undefined;
    try {
      const result = await Tesseract.recognize(file.path, 'eng+fra');
      rawText = result.data.text;
    } catch (e) {
      status = 'FAILED';
      error = e.message;
      rawText = '';
    }
    // Extract fields
    const extracted = this.parseFields(rawText);
    // Save OCR result in DB (attach to document)
    await this.prisma.document.update({
      where: { id: dto.documentId },
      data: {
        // Save as JSON in a new ocrResult field (add to schema if not present)
        ocrResult: {
          rawText,
          extracted,
          ocrAt: new Date().toISOString(),
          status,
          error,
        },
      },
    });
    // Log attempt
    await this.prisma.oCRLog.create({
      data: {
        documentId: dto.documentId,
        userId: user.id,
        processedById: user.id,
        status,
        error,
        ocrAt: new Date(),
      },
    });
    return {
      rawText,
      extracted,
      ocrAt: new Date().toISOString(),
      status,
      error,
    };
  }

  parseFields(rawText: string) {
    // Simple regex-based extraction
    const reference = /Ref[:\s]*([\w\d]+)/i.exec(rawText)?.[1];
    const client = /Client[:\s]*([\w\s]+)/i.exec(rawText)?.[1];
    const date = /Date[:\s]*([\d\/\-]+)/i.exec(rawText)?.[1];
    const montant = /Montant[:\s]*([\d\.,]+)/i.exec(rawText)?.[1];
    return {
      reference,
      client,
      date: date ? this.parseDate(date) : undefined,
      montant: montant ? parseFloat(montant.replace(',', '.')) : undefined,
    };
  }

  parseDate(dateStr: string) {
    // Convert DD/MM/YYYY or DD-MM-YYYY to YYYY-MM-DD
    const m = /([0-9]{2})[\/\-]([0-9]{2})[\/\-]([0-9]{4})/.exec(dateStr);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    return dateStr;
  }

  async getOcrResult(documentId: string, user: any) {
    this.checkOcrRole(user);
    const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Document not found');
    return doc.ocrResult;
  }

  async patchOcrResult(documentId: string, correction: any, user: any) {
    this.checkOcrRole(user);
    const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Document not found');
    const ocrResult = typeof doc.ocrResult === 'string'
      ? JSON.parse(doc.ocrResult)
      : doc.ocrResult || {};
    const corrected = { ...ocrResult.extracted, ...correction };
    await this.prisma.document.update({
      where: { id: documentId },
      data: {
        ocrResult: {
          ...ocrResult,
          corrected,
        },
      },
    });
    return { ...ocrResult, corrected };
  }

  async getOcrLogs(user: any) {
    if (user.role !== 'SUPER_ADMIN') throw new ForbiddenException('Admin only');
    return this.prisma.oCRLog.findMany({
      orderBy: { ocrAt: 'desc' },
      include: { document: true, processedBy: true }, // FIXED
    });
  }
}

