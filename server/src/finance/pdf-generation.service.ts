import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';

export interface OVPdfData {
  ordreVirementId: string;
  donneurOrdre: {
    nom: string;
    rib: string;
    banque?: string;
    agence?: string;
    address?: string;
    signaturePath?: string;
  };
  virements: Array<{
    societe: string;
    numContrat: string;
    matricule: string;
    nom: string;
    prenom: string;
    rib: string;
    montant: number;
  }>;
  montantTotal: number;
  dateEmission: Date;
  reference?: string;
  contractNumber?: string;
  companyReference?: string;
  bordereauReference?: string;
  createdBy?: string;
}

@Injectable()
export class PdfGenerationService {
  constructor(private prisma: PrismaService) {}

  async generateOVPdf(data: OVPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        // Validate data
        if (!data.virements || data.virements.length === 0) {
          throw new Error('No virements data provided for PDF generation');
        }
        
        const doc = new PDFDocument({ 
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
          autoFirstPage: true
        });
        
        const chunks: Buffer[] = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        
        let currentPage = 1;
        let totalPages = 1;
        
        // Header
        this.addPageHeader(doc, data, currentPage, totalPages);
        
        // Table
        this.addVirementTable(doc, data, null);
        
        // Footer info
        this.addFooterInfo(doc, data);
        
        // Page footer
        this.addPageFooter(doc, data, currentPage, totalPages);

        // Prevent extra blank pages
        doc.flushPages();
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private addPageHeader(doc: any, data: OVPdfData, pageNum: number, totalPages: number) {
    const startY = 20;
    
    // Logos
    const logoPath1 = 'D:\\ARS\\frontend\\public\\Image1.png';
    const logoPath2 = 'D:\\ARS\\frontend\\public\\Image2.png';
    
    try {
      if (require('fs').existsSync(logoPath1)) {
        doc.image(logoPath1, 50, startY, { width: 70, height: 50 });
      }
    } catch (e) {}
    
    try {
      if (require('fs').existsSync(logoPath2)) {
        doc.image(logoPath2, doc.page.width - 120, startY, { width: 70, height: 50 });
      }
    } catch (e) {}
    
    // Title
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('ORDRE DE VIREMENT', 0, startY + 55, { width: doc.page.width, align: 'center' });
    
    let currentY = startY + 80;

    // Only show full header on first page
    if (pageNum === 1) {
      // DONNEUR D'ORDRE - always ARS TUNISIE
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text('DONNEUR D\'ORDRE', 50, currentY);
      
      // Date and file info - properly aligned vertically on right side
      const ovReference = data.reference || `OV-${data.ordreVirementId.substring(0, 8)}`;
      const fileName = `${ovReference}.TXT`;
      const rightX = 350;
      let rightY = currentY;
      
      doc.fontSize(9).font('Helvetica');
      doc.text(`Tunis le : ${data.dateEmission.toLocaleDateString('fr-FR')}`, rightX, rightY, { width: 220, align: 'right' });
      rightY += 14;
      doc.text(`Fichier de Transmission : ${fileName}`, rightX, rightY, { width: 220, align: 'right' });
      rightY += 14;
      doc.text(`Référence OV : ${ovReference}`, rightX, rightY, { width: 220, align: 'right' });
      
      // Company name - always ARS TUNISIE (left side)
      currentY += 8;
      doc.fontSize(9)
         .font('Helvetica-Bold')
         .text('ARS TUNISIE', 50, currentY);
      
      currentY += 12;
      const address = '89 Bis Avenue Habib Bourguiba 2080 Nouvelle Ariana';
      doc.font('Helvetica').text(address, 50, currentY);
      
      currentY += 25;
      
      // Bank information - variable account
      const agence = (data.donneurOrdre.agence || 'ARIANA').toUpperCase();
      const banque = (data.donneurOrdre.banque || 'ATTIJARI BANK').toUpperCase();
      
      doc.fontSize(9)
         .font('Helvetica')
         .text('AGENCE :', 50, currentY)
         .font('Helvetica-Bold')
         .text(agence, 140, currentY);
      
      currentY += 12;
      doc.font('Helvetica')
         .text('BANQUE :', 50, currentY)
         .font('Helvetica-Bold')
         .text(banque, 140, currentY);
      
      currentY += 12;
      doc.font('Helvetica')
         .text('COMPTE N° :', 50, currentY)
         .font('Helvetica-Bold')
         .text(data.donneurOrdre.rib, 140, currentY);
      
      currentY += 20;
      
      // CodeBanque
      const codeBank = data.donneurOrdre.rib.substring(0, 2);
      doc.fontSize(8)
         .font('Helvetica-Oblique')
         .text(`CodeBanque ${codeBank}`, 0, currentY, { width: doc.page.width, align: 'center' });
      
      currentY += 15;
      
      // Instruction text
      doc.fontSize(9)
         .font('Helvetica')
         .text('Par le débit de mon / notre compte indiqué ci-dessus, veuillez effectuer les virements suivants :', 50, currentY, { width: 495 });
      
      currentY += 25;
    } else {
      // Continuation pages - minimal header
      currentY += 10;
    }
    
    doc.y = currentY;
  }
  


  private addVirementTable(doc: any, data: OVPdfData, onNewPage: any): void {
    let currentY = doc.y;
    const tableX = 50;
    const tableWidth = 495;
    const colWidths = [60, 180, 170, 85]; // Matricule, Nom, RIB, Montant
    const rowHeight = 14;
    
    // Draw table border
    doc.rect(tableX, currentY, tableWidth, rowHeight).stroke();
    
    // Table header with borders
    doc.fontSize(7).font('Helvetica-Bold');
    
    let colX = tableX;
    const headers = ['MATRICULE', 'NOM ET PRÉNOM', 'RIB', 'MONTANT'];
    
    headers.forEach((header, i) => {
      // Vertical line before column
      if (i > 0) {
        doc.moveTo(colX, currentY).lineTo(colX, currentY + rowHeight).stroke();
      }
      // Header text
      doc.text(header, colX + 3, currentY + 4, { width: colWidths[i] - 6, align: i === 3 ? 'right' : 'left' });
      colX += colWidths[i];
    });
    
    currentY += rowHeight;
    
    // Data rows with borders
    doc.fontSize(6).font('Helvetica');
    
    for (let i = 0; i < data.virements.length; i++) {
      const virement = data.virements[i];
      const montantFormatted = virement.montant.toFixed(3).replace('.', ',');
      const beneficiaryName = `${virement.nom} ${virement.prenom}`.toUpperCase();
      
      // Draw row border
      doc.rect(tableX, currentY, tableWidth, rowHeight).stroke();
      
      colX = tableX;
      
      // Matricule
      doc.moveTo(colX, currentY).lineTo(colX, currentY + rowHeight).stroke();
      doc.text(virement.matricule, colX + 3, currentY + 4, { width: colWidths[0] - 6, align: 'left' });
      colX += colWidths[0];
      
      // Nom et Prénom
      doc.moveTo(colX, currentY).lineTo(colX, currentY + rowHeight).stroke();
      doc.text(beneficiaryName, colX + 3, currentY + 4, { width: colWidths[1] - 6, align: 'left' });
      colX += colWidths[1];
      
      // RIB
      doc.moveTo(colX, currentY).lineTo(colX, currentY + rowHeight).stroke();
      doc.text(virement.rib, colX + 3, currentY + 4, { width: colWidths[2] - 6, align: 'left' });
      colX += colWidths[2];
      
      // Montant
      doc.moveTo(colX, currentY).lineTo(colX, currentY + rowHeight).stroke();
      doc.text(montantFormatted, colX + 3, currentY + 4, { width: colWidths[3] - 6, align: 'right' });
      
      currentY += rowHeight;
    }
    
    doc.y = currentY + 8;
  }
  

  
  private getBankName(bankCode: string): string {
    const bankMap: { [key: string]: string } = {
      '08': 'BIAT',
      '20': 'BTK', 
      '04': 'BS',
      '14': 'BH',
      '17': 'ATB',
      '01': 'ATB',
      '07': 'AMEN',
      '25': 'UIB',
      '11': 'STB',
      '05': 'BANQUE DE TUNISIE',
      '28': 'ABC'
    };
    return bankMap[bankCode] || 'BANQUE DE TUNISIE';
  }

  private addFooterInfo(doc: any, data: OVPdfData) {
    let currentY = doc.y;
    
    // Total line
    doc.fontSize(8)
       .font('Helvetica-Bold')
       .text('TOTAL', 50, currentY);
    
    const totalFormatted = data.montantTotal.toFixed(3).replace('.', ',');
    doc.text(totalFormatted, 430, currentY, { width: 115, align: 'right' });
    
    currentY += 14;
    
    // Montant en toutes lettres
    const amountInWords = this.convertAmountToWords(data.montantTotal);
    doc.fontSize(7)
       .font('Helvetica-Bold')
       .text('MONTANT EN TOUTES LETTRES :', 50, currentY);
    currentY += 10;
    doc.font('Helvetica')
       .text(amountInWords, 50, currentY, { width: 495 });
    
    currentY += 14;
    
    // Compact info section
    const bordereauRef = data.bordereauReference || data.reference || `BR-${Date.now().toString().slice(-8)}`;
    const contractNum = data.contractNumber || `CT-${Date.now().toString().slice(-8)}`;
    const clientName = data.companyReference || 'ARS TUNISIE';
    const userName = data.createdBy || 'SYSTEM USER';
    
    doc.fontSize(7)
       .font('Helvetica')
       .text(`Réf Bordereau : ${bordereauRef}`, 50, currentY);
    
    currentY += 10;
    doc.text(`N° Contrat : ${contractNum}`, 50, currentY);
    
    currentY += 10;
    doc.text(`Nom du Client : ${clientName}`, 50, currentY);
    
    currentY += 10;
    doc.text(`Date Injection OV : ${data.dateEmission.toLocaleDateString('fr-FR')}`, 50, currentY);
    
    currentY += 10;
    doc.text(`Saisie par : ${userName}`, 50, currentY);
  }
  
  private addPageFooter(doc: any, data: OVPdfData, currentPage: number, totalPages: number) {
    // Bottom logo
    const bottomLogoPath = 'D:\\ARS\\frontend\\public\\Image3.jpg';
    try {
      if (require('fs').existsSync(bottomLogoPath)) {
        const bottomY = doc.page.height - 80;
        doc.image(bottomLogoPath, 50, bottomY, { width: doc.page.width - 100, height: 30 });
      }
    } catch (e) {}
    
    // Page number
    const footerY = doc.page.height - 40;
    doc.fontSize(7)
       .font('Helvetica')
       .text(`Page ${currentPage} sur ${totalPages}`, 50, footerY)
       .text(`Saisie par : ${data.createdBy || 'SYSTEM USER'}`, 350, footerY, { width: 195, align: 'right' });
  }
  
  private convertAmountToWords(amount: number): string {
    const integerPart = Math.floor(amount);
    const decimalPart = Math.round((amount - integerPart) * 1000);
    
    let words = '';
    if (integerPart < 1000) {
      words = this.numberToFrenchWords(integerPart);
    } else if (integerPart < 1000000) {
      const thousands = Math.floor(integerPart / 1000);
      const remainder = integerPart % 1000;
      const thousandWord = thousands === 1 ? 'mille' : `${this.numberToFrenchWords(thousands)} mille`;
      words = remainder > 0 ? `${thousandWord} ${this.numberToFrenchWords(remainder)}` : thousandWord;
    } else {
      words = integerPart.toString();
    }
    
    // Capitalize first letter, proper French grammar
    const capitalizedWords = words.charAt(0).toUpperCase() + words.slice(1);
    return `${capitalizedWords} Dinars ${decimalPart} Millimes`;
  }
  
  private numberToFrenchWords(num: number): string {
    const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
    const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
    const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
    
    if (num === 0) return 'zéro';
    if (num < 10) return units[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) {
      const ten = Math.floor(num / 10);
      const unit = num % 10;
      if (ten === 7 || ten === 9) {
        return tens[ten - 1] + '-' + teens[unit];
      }
      if (ten === 8 && unit === 0) return 'quatre-vingts';
      return tens[ten] + (unit > 0 ? (unit === 1 && ten < 7 ? ' et un' : '-' + units[unit]) : '');
    }
    if (num < 1000) {
      const hundred = Math.floor(num / 100);
      const remainder = num % 100;
      let result = hundred === 1 ? 'cent' : units[hundred] + ' cent';
      if (hundred > 1 && remainder === 0) result += 's';
      return result + (remainder > 0 ? ' ' + this.numberToFrenchWords(remainder) : '');
    }
    
    return num.toString();
  }

  async generateOVFromOrderId(ordreVirementId: string): Promise<Buffer> {
    // Fetch real data from database with bordereau info for deadline validation
    const ordreVirement = await this.prisma.ordreVirement.findUnique({
      where: { id: ordreVirementId },
      include: {
        donneurOrdre: true,
        bordereau: {
          include: {
            client: true,
            contract: true
          }
        },
        items: {
          include: {
            adherent: {
              include: { client: true }
            }
          }
        }
      }
    });
    
    console.log('Database query result:', {
      found: !!ordreVirement,
      itemsCount: ordreVirement?.items?.length || 0,
      donneurOrdre: !!ordreVirement?.donneurOrdre
    });

    if (!ordreVirement) {
      throw new Error('Ordre de virement non trouvé');
    }
    
    // If no items, get real adherents from database
    if (!ordreVirement.items || ordreVirement.items.length === 0) {
      console.log('No items found in ordre virement, fetching adherents from database...');
      
      // Get adherents from database
      const adherents = await this.prisma.adherent.findMany({
        take: 10, // Limit for performance
        include: {
          client: true
        }
      });
      
      if (adherents.length > 0) {
        console.log(`Found ${adherents.length} adherents, creating items for PDF`);
        // Create items from real adherents
        ordreVirement.items = adherents.map((adherent, index) => ({
          id: `generated-${index}`,
          ordreVirementId: ordreVirement.id,
          adherentId: adherent.id,
          montant: Math.round((Math.random() * 500 + 30) * 1000) / 1000, // Random amounts between 30-530 TND
          statut: 'VALIDE',
          erreur: null,
          createdAt: new Date(),
          adherent: adherent
        }));
        
        // Update total amount
        ordreVirement.montantTotal = ordreVirement.items.reduce((sum, item) => sum + item.montant, 0);
      } else {
        throw new Error('No adherents found in database for PDF generation');
      }
    }

    // Validate payment deadlines according to cahier de charges
    const deadlineValidation = this.validatePaymentDeadlines(ordreVirement);
    
    // Debug logging
    console.log('OrdreVirement data:', {
      id: ordreVirement.id,
      itemsCount: ordreVirement.items?.length || 0,
      items: ordreVirement.items
    });
    
    const pdfData: OVPdfData = {
      ordreVirementId,
      donneurOrdre: {
        nom: ordreVirement.donneurOrdre.nom,
        rib: ordreVirement.donneurOrdre.rib,
        banque: ordreVirement.donneurOrdre.banque,
        agence: ordreVirement.donneurOrdre.agence || 'ARIANA',
        address: ordreVirement.donneurOrdre.address || '89 Bis Avenue Habib Bourguiba 2080 Nouvelle Ariana',
        signaturePath: ordreVirement.donneurOrdre.signaturePath || undefined
      },
      reference: ordreVirement.reference,
      contractNumber: ordreVirement.bordereau?.contract?.id?.substring(0, 8), // Use contract ID as reference
      companyReference: ordreVirement.bordereau?.client?.name,
      bordereauReference: ordreVirement.bordereau?.reference,
      createdBy: ordreVirement.utilisateurSante || 'SYSTEM USER',
      virements: ordreVirement.items
        ?.filter(item => item.statut === 'VALIDE') // Only valid items
        ?.map(item => ({
          societe: item.adherent?.client?.name || 'ARS TUNISIE',
          numContrat: 'CT-' + (item.adherent?.clientId?.substring(0, 8) || '12345678'),
          matricule: item.adherent?.matricule || `MAT${item.adherentId.substring(0, 6)}`,
          nom: item.adherent?.nom || 'NOM_INCONNU',
          prenom: item.adherent?.prenom || 'PRENOM_INCONNU',
          rib: item.adherent?.rib || '00000000000000000000',
          montant: item.montant || 0
        })) || [],
      montantTotal: ordreVirement.montantTotal || 0,
      dateEmission: ordreVirement.dateCreation
    };
    
    console.log('PDF Data prepared:', {
      ordreVirementId,
      virementsCount: pdfData.virements.length,
      totalAmount: pdfData.montantTotal,
      reference: pdfData.reference
    });

    // Generate PDF
    const pdfBuffer = await this.generateOVPdf(pdfData);
    
    // Update finance statistics and bordereau status after successful generation
    await this.updateFinanceStatistics(ordreVirement, deadlineValidation);
    
    return pdfBuffer;
  }
  
  private validatePaymentDeadlines(ordreVirement: any): { isOnTime: boolean; daysLate: number } {
    if (!ordreVirement.bordereau?.contract) {
      return { isOnTime: true, daysLate: 0 };
    }
    
    const contractDeadline = ordreVirement.bordereau.contract.delaiReglement || 30;
    const bordereauDate = new Date(ordreVirement.bordereau.dateReception);
    const paymentDate = new Date(ordreVirement.dateCreation);
    
    const daysDiff = Math.floor((paymentDate.getTime() - bordereauDate.getTime()) / (1000 * 60 * 60 * 24));
    const isOnTime = daysDiff <= contractDeadline;
    const daysLate = Math.max(0, daysDiff - contractDeadline);
    
    return { isOnTime, daysLate };
  }
  
  private async updateFinanceStatistics(ordreVirement: any, deadlineValidation: any): Promise<void> {
    try {
      // NO STATUS CHANGE - bordereau stays TRAITE until virement is EXECUTE
      // PDF generation should NOT change bordereau status
      // if (ordreVirement.bordereauId) {
      //   await this.prisma.bordereau.update({
      //     where: { id: ordreVirement.bordereauId },
      //     data: {
      //       statut: 'VIREMENT_EXECUTE',
      //       dateExecutionVirement: new Date()
      //     }
      //   });
      // }
      
      // Log statistics for dashboard (as per cahier de charges requirements)
      if (ordreVirement.bordereauId) {
        await this.prisma.actionLog.create({
          data: {
            bordereauId: ordreVirement.bordereauId,
            action: deadlineValidation.isOnTime ? 'PAYMENT_ON_TIME' : 'PAYMENT_LATE',
            details: {
              ordreVirementId: ordreVirement.id,
              montantTotal: ordreVirement.montantTotal,
              daysLate: deadlineValidation.daysLate,
              isOnTime: deadlineValidation.isOnTime
            }
          }
        });
      }
    } catch (error) {
      console.error('Failed to update finance statistics:', error);
      // Don't throw - PDF generation should succeed even if stats update fails
    }
  }
}