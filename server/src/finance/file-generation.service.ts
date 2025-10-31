import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

export interface GenerateFilesDto {
  ordreVirementId: string;
  donneurOrdreId: string;
  virementData: any[];
}

@Injectable()
export class FileGenerationService {
  private readonly logger = new Logger(FileGenerationService.name);

  constructor(private prisma: PrismaService) {}

  async generateFiles(dto: GenerateFilesDto): Promise<{ pdfPath: string; txtPath: string }> {
    const ordreVirement = await this.prisma.ordreVirement.findUnique({
      where: { id: dto.ordreVirementId },
      include: {
        donneurOrdre: true,
        items: {
          include: {
            adherent: {
              include: {
                client: true
              }
            }
          }
        }
      }
    });

    if (!ordreVirement) {
      throw new Error('Ordre virement not found');
    }

    const pdfPath = await this.generatePDF(ordreVirement);
    const txtPath = await this.generateTXT(ordreVirement);

    return { pdfPath, txtPath };
  }

  private async generatePDF(ordreVirement: any): Promise<string> {
    const { PdfGenerationService } = require('./pdf-generation.service');
    const pdfService = new PdfGenerationService(this.prisma);
    
    const fileName = `virement_${ordreVirement.reference}_${Date.now()}.pdf`;
    const filePath = path.join(process.cwd(), 'uploads', 'virements', fileName);

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const pdfBuffer = await pdfService.generateOVFromOrderId(ordreVirement.id);
    fs.writeFileSync(filePath, pdfBuffer);
    return filePath;
  }

  private async generatePDF_OLD(ordreVirement: any): Promise<string> {
    const doc = new PDFDocument();
    const fileName = `virement_${ordreVirement.reference}_${Date.now()}.pdf`;
    const filePath = path.join(process.cwd(), 'uploads', 'virements', fileName);

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    doc.pipe(fs.createWriteStream(filePath));

    // Header
    doc.fontSize(16).text('ORDRE DE VIREMENT BANCAIRE', { align: 'center' });
    doc.moveDown();

    // Donneur d'ordre info
    doc.fontSize(12)
       .text(`Émetteur: ${ordreVirement.donneurOrdre.nom}`)
       .text(`RIB: ${ordreVirement.donneurOrdre.rib}`)
       .text(`Banque: ${ordreVirement.donneurOrdre.banque}`)
       .text(`Date: ${new Date().toLocaleDateString('fr-FR')}`)
       .text(`Référence: ${ordreVirement.reference}`);

    doc.moveDown();

    // Table header
    const startY = doc.y;
    const colWidths = [80, 120, 80, 120, 80];
    const headers = ['Société', 'Matricule', 'Nom', 'RIB', 'Montant'];

    let currentX = 50;
    headers.forEach((header, i) => {
      doc.rect(currentX, startY, colWidths[i], 20).stroke();
      doc.text(header, currentX + 5, startY + 5, { width: colWidths[i] - 10 });
      currentX += colWidths[i];
    });

    // Table rows
    let currentY = startY + 20;
    let totalAmount = 0;

    ordreVirement.items.forEach((item: any) => {
      currentX = 50;
      const rowData = [
        item.adherent.client.name,
        item.adherent.matricule,
        `${item.adherent.nom} ${item.adherent.prenom}`,
        item.adherent.rib,
        `${item.montant.toFixed(2)} TND`
      ];

      rowData.forEach((data, i) => {
        doc.rect(currentX, currentY, colWidths[i], 20).stroke();
        doc.text(data, currentX + 5, currentY + 5, { width: colWidths[i] - 10 });
        currentX += colWidths[i];
      });

      totalAmount += item.montant;
      currentY += 20;
    });

    // Total
    doc.moveDown();
    doc.fontSize(14).text(`Total: ${totalAmount.toFixed(2)} TND`, { align: 'right' });
    doc.text(`Nombre d'adhérents: ${ordreVirement.items.length}`, { align: 'right' });

    // Donneur signature/tampon (stamp at footer right)
    const signaturePath = ordreVirement.donneurOrdre?.signaturePath;
    if (!signaturePath) {
      // Add placeholder text if no signature
      const footerY = doc.page.height - 60;
      doc.fontSize(10).text('Signature Donneur d\'Ordre', doc.page.width - 160, footerY, {
        width: 110, align: 'center'
      });
      doc.rect(doc.page.width - 170, footerY + 15, 120, 40).stroke();
      doc.end();
      return filePath;
    }
    const signatureFullPath = path.isAbsolute(signaturePath)
      ? signaturePath
      : path.join(process.cwd(), signaturePath.replace(/[\\/]/g, path.sep));
    if (fs.existsSync(signatureFullPath)) {
      // Draw signature in bottom right on the last page
      const footerY = doc.page.height - 60;
      doc.image(signatureFullPath, doc.page.width - 170, footerY, { width: 120, height: 40 });
      doc.fontSize(8).text('Signature Donneur d’Ordre', doc.page.width - 160, footerY + 42, {
        width: 110, align: 'center'
      });
    } else {
      // Add placeholder if signature file not found
      const footerY = doc.page.height - 60;
      doc.fontSize(10).text('Signature Donneur d\'Ordre', doc.page.width - 160, footerY, {
        width: 110, align: 'center'
      });
      doc.rect(doc.page.width - 170, footerY + 15, 120, 40).stroke();
    }

    doc.end();

    return filePath;
  }

  private async generateTXT(ordreVirement: any): Promise<string> {
    const fileName = `virement_${ordreVirement.reference}_${Date.now()}.txt`;
    const filePath = path.join(process.cwd(), 'uploads', 'virements', fileName);

    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let content = '';

    switch (ordreVirement.donneurOrdre.structureTxt) {
      case 'STRUCTURE_1':
        content = this.generateStructure1(ordreVirement);
        break;
      case 'STRUCTURE_2':
        content = this.generateStructure2(ordreVirement);
        break;
      case 'STRUCTURE_3':
        content = this.generateStructure3(ordreVirement);
        break;
      default:
        content = this.generateStructure1(ordreVirement); // Default
    }

    fs.writeFileSync(filePath, content, 'utf8');
    return filePath;
  }

  private generateStructure1(ordreVirement: any): string {
    // Structure 1: Format exact from company example
    let content = '';
    
    if (!ordreVirement.items || ordreVirement.items.length === 0) {
      return content; // Return empty if no items
    }
    
    const totalAmount = ordreVirement.items.reduce((sum: number, item: any) => sum + item.montant, 0);
    const totalAmountMillimes = Math.round(totalAmount * 1000);
    const dateFormatted = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = ordreVirement.items.length.toString().padStart(2, '0');
    
    // Header line - exact format from example
    const headerLine = `110104   ${dateFormatted}0001${count}${totalAmountMillimes.toString().padStart(15, '0')}000000000${count}${' '.repeat(139)}`;
    content += headerLine + '\n';

    // Detail lines - exact format from example
    ordreVirement.items.forEach((item: any, index: number) => {
      const montantMillimes = Math.round(item.montant * 1000);
      const bankCode = item.adherent.rib.substring(0, 2);
      const fullName = (item.adherent.nom + item.adherent.prenom).substring(0, 30).padEnd(30, ' ');
      const sequenceNum = (index + 1).toString();
      
      // Build line exactly as in example
      let detailLine = '110104   '; // 9 chars
      detailLine += dateFormatted; // 8 chars
      detailLine += '0001'; // 4 chars
      detailLine += sequenceNum; // 1 char
      detailLine += montantMillimes.toString().padStart(15, '0'); // 15 chars
      detailLine += '000000000'; // 9 chars
      detailLine += '4001007404700411649'; // 19 chars
      detailLine += 'ARS EX  "AON TUNISIE S.A."'; // 26 chars
      detailLine += '    '; // 4 spaces
      detailLine += bankCode; // 2 chars
      detailLine += '   '; // 3 spaces
      detailLine += item.adherent.rib; // 20 chars
      detailLine += fullName; // 30 chars
      detailLine += '00000000000000001'; // 17 zeros
      detailLine += montantMillimes.toString().padStart(6, '0'); // 6 chars
      detailLine += '000'; // 3 chars
      detailLine += 'AIRBUS BORD 18-25'; // 17 chars
      detailLine += ' '.repeat(28); // 28 spaces
      detailLine += dateFormatted; // 8 chars
      detailLine += '00000000010'; // 11 chars
      detailLine += ' '.repeat(38); // 38 spaces
      
      content += detailLine + '\n';
    });

    return content;
  }

  private generateStructure2(ordreVirement: any): string {
    // Structure 2: Format Banque Populaire
    let content = '';
    
    // Header with different format
    content += `01${ordreVirement.donneurOrdre.rib}${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${ordreVirement.reference}\n`;

    // Details with different positioning
    ordreVirement.items.forEach((item: any) => {
      content += `02${item.adherent.rib}${item.montant.toFixed(2).replace('.', '')}${item.adherent.matricule}${item.adherent.nom} ${item.adherent.prenom}\n`;
    });

    // Footer
    const totalAmount = ordreVirement.items.reduce((sum: number, item: any) => sum + item.montant, 0);
    content += `03${ordreVirement.items.length}${totalAmount.toFixed(2).replace('.', '')}\n`;

    return content;
  }

  private generateStructure3(ordreVirement: any): string {
    // Structure 3: Format AMEN
    let content = '';
    
    // AMEN specific format
    content += `HEADER|${ordreVirement.donneurOrdre.rib}|${ordreVirement.donneurOrdre.nom}|${new Date().toISOString().slice(0, 10)}|${ordreVirement.reference}\n`;

    ordreVirement.items.forEach((item: any) => {
      content += `DETAIL|${item.adherent.rib}|${item.adherent.nom}|${item.adherent.prenom}|${item.montant}|${item.adherent.matricule}\n`;
    });

    const totalAmount = ordreVirement.items.reduce((sum: number, item: any) => sum + item.montant, 0);
    content += `FOOTER|${ordreVirement.items.length}|${totalAmount}\n`;

    return content;
  }

  async getFileContent(filePath: string): Promise<Buffer> {
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }
    return fs.readFileSync(filePath);
  }

  async deleteFile(filePath: string): Promise<void> {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}