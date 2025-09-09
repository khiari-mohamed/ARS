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
    const doc = new PDFDocument();
    const fileName = `virement_${ordreVirement.reference}_${Date.now()}.pdf`;
    const filePath = path.join(process.cwd(), 'uploads', 'virements', fileName);

    // Ensure directory exists
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
      doc.end();
      throw new Error('Signature/tampon obligatoire pour exporter ce PDF');
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
      doc.end();
      throw new Error('Image de signature introuvable : ' + signatureFullPath);
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
    // Structure 1: Format Standard
    let content = '';
    
    // Header
    content += `H${ordreVirement.donneurOrdre.rib.padEnd(20)}${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${ordreVirement.reference.padEnd(20)}\n`;

    // Details
    ordreVirement.items.forEach((item: any, index: number) => {
      const line = `D${(index + 1).toString().padStart(6, '0')}${item.adherent.rib.padEnd(20)}${item.montant.toFixed(2).padStart(12, '0')}${item.adherent.nom.padEnd(30)}${item.adherent.prenom.padEnd(30)}\n`;
      content += line;
    });

    // Footer
    const totalAmount = ordreVirement.items.reduce((sum: number, item: any) => sum + item.montant, 0);
    content += `F${ordreVirement.items.length.toString().padStart(6, '0')}${totalAmount.toFixed(2).padStart(15, '0')}\n`;

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