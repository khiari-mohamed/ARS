import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DocumentPreviewService {
  constructor(private prisma: PrismaService) {}

  async getDocumentPreview(documentId: string) {
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!document || !fs.existsSync(document.path)) {
      throw new Error('Document not found');
    }

    const stats = fs.statSync(document.path);
    const ext = path.extname(document.path).toLowerCase();
    
    return {
      id: document.id,
      name: document.name,
      type: document.type,
      size: stats.size,
      extension: ext,
      canPreview: ['.pdf', '.jpg', '.jpeg', '.png'].includes(ext),
      uploadedAt: document.uploadedAt,
      path: document.path
    };
  }

  async createDocumentVersion(documentId: string, newFile: Express.Multer.File, userId: string) {
    const originalDoc = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!originalDoc) throw new Error('Original document not found');

    const timestamp = Date.now();
    const ext = path.extname(newFile.originalname);
    const versionPath = originalDoc.path.replace(ext, `_v${timestamp}${ext}`);
    
    fs.writeFileSync(versionPath, newFile.buffer);

    return this.prisma.document.create({
      data: {
        name: `${originalDoc.name} (v${timestamp})`,
        type: originalDoc.type,
        path: versionPath,
        uploadedById: userId,
        hash: require('crypto').createHash('sha256').update(newFile.buffer).digest('hex')
      }
    });
  }
}