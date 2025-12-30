import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as PDFDocument from 'pdfkit';
import * as ExcelJS from 'exceljs';

export interface OVGenerationRequest {
  bordereauIds: string[];
  format: 'PDF' | 'EXCEL';
  includeDetails: boolean;
}

@Injectable()
export class OVGeneratorService {
  private readonly logger = new Logger(OVGeneratorService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generateOV(request: OVGenerationRequest): Promise<Buffer> {
    const bordereaux = await this.prisma.bordereau.findMany({
      where: { id: { in: request.bordereauIds } },
      include: {
        client: true,
        contract: true,
        BulletinSoin: true,
        virement: true
      }
    });

    if (request.format === 'PDF') {
      return this.generatePDFOV(bordereaux, request.includeDetails);
    } else {
      return this.generateExcelOV(bordereaux, request.includeDetails);
    }
  }

  private async generatePDFOV(bordereaux: any[], includeDetails: boolean): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('Ordre de Virement (OV)', 50, 50);
      doc.fontSize(12).text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 50, 80);
      doc.text(`Nombre de bordereaux: ${bordereaux.length}`, 50, 100);

      let yPosition = 140;

      bordereaux.forEach((bordereau, index) => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }

        doc.fontSize(14).text(`${index + 1}. Bordereau ${bordereau.reference}`, 50, yPosition);
        yPosition += 20;
        
        doc.fontSize(10)
          .text(`Client: ${bordereau.client?.name || 'N/A'}`, 70, yPosition)
          .text(`Statut: ${bordereau.statut}`, 300, yPosition);
        yPosition += 15;
        
        doc.text(`Date réception: ${new Date(bordereau.dateReception).toLocaleDateString('fr-FR')}`, 70, yPosition)
          .text(`Nombre BS: ${bordereau.nombreBS}`, 300, yPosition);
        yPosition += 15;

        if (includeDetails && bordereau.BulletinSoin?.length > 0) {
          const totalMontant = bordereau.BulletinSoin.reduce((sum: number, bs: any) => sum + (bs.montant || 0), 0);
          doc.text(`Montant total: ${totalMontant.toFixed(2)} €`, 70, yPosition);
          yPosition += 15;
        }

        yPosition += 10;
      });

      // Footer
      const totalMontant = bordereaux.reduce((sum, b) => {
        return sum + (b.BulletinSoin?.reduce((bsSum: number, bs: any) => bsSum + (bs.montant || 0), 0) || 0);
      }, 0);

      doc.fontSize(14).text(`Montant total OV: ${totalMontant.toFixed(2)} €`, 50, yPosition + 20);

      doc.end();
    });
  }

  private async generateExcelOV(bordereaux: any[], includeDetails: boolean): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Ordre de Virement');

    // Headers
    worksheet.columns = [
      { header: 'Référence', key: 'reference', width: 15 },
      { header: 'Client', key: 'client', width: 25 },
      { header: 'Statut', key: 'statut', width: 15 },
      { header: 'Date Réception', key: 'dateReception', width: 15 },
      { header: 'Nombre BS', key: 'nombreBS', width: 10 },
      { header: 'Montant', key: 'montant', width: 12 }
    ];

    // Data
    bordereaux.forEach(bordereau => {
      const totalMontant = bordereau.BulletinSoin?.reduce((sum: number, bs: any) => sum + (bs.montant || 0), 0) || 0;
      
      worksheet.addRow({
        reference: bordereau.reference,
        client: bordereau.client?.name || 'N/A',
        statut: bordereau.statut,
        dateReception: new Date(bordereau.dateReception).toLocaleDateString('fr-FR'),
        nombreBS: bordereau.nombreBS,
        montant: totalMontant.toFixed(2)
      });
    });

    // Total row
    const totalMontant = bordereaux.reduce((sum, b) => {
      return sum + (b.BulletinSoin?.reduce((bsSum: number, bs: any) => bsSum + (bs.montant || 0), 0) || 0);
    }, 0);

    worksheet.addRow({});
    worksheet.addRow({
      reference: 'TOTAL',
      montant: totalMontant.toFixed(2)
    });

    return await workbook.xlsx.writeBuffer() as unknown as Buffer;
  }
}