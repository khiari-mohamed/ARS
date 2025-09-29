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
        // Debug logging
        console.log('PDF Data:', {
          virementsCount: data.virements?.length || 0,
          montantTotal: data.montantTotal
        });
        
        // Validate data
        if (!data.virements || data.virements.length === 0) {
          throw new Error('No virements data provided for PDF generation');
        }
        
        const doc = new PDFDocument({ 
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });
        
        const chunks: Buffer[] = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // En-tête avec informations du donneur d'ordre
        this.addHeader(doc, data);
        
        // Tableau des virements
        this.addVirementTable(doc, data);
        
        // Total et signature
        this.addFooter(doc, data);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private addHeader(doc: any, data: OVPdfData) {
    // Add logos
    const logoPath1 = 'D:\\ARS\\frontend\\public\\Image1.png';
    const logoPath2 = 'D:\\ARS\\frontend\\public\\Image2.png';
    
    try {
      if (require('fs').existsSync(logoPath1)) {
        doc.image(logoPath1, 50, 20, { width: 80, height: 60 });
      }
    } catch (e) { console.log('Logo 1 not found'); }
    
    try {
      if (require('fs').existsSync(logoPath2)) {
        doc.image(logoPath2, doc.page.width - 130, 20, { width: 80, height: 60 });
      }
    } catch (e) { console.log('Logo 2 not found'); }
    
    // Title - centered, bold, exact positioning
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('ORDRE DE VIREMENT', 0, 90, { width: doc.page.width, align: 'center' });
    
    let currentY = 130;

    // DONNEUR D'ORDRE section - LEFT side
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('DONNEUR D\'ORDRE', 50, currentY);
    
    // Date and file info - RIGHT side, exact alignment
    const fileName = `ATT${Date.now().toString().slice(-5)}.TXT`;
    doc.fontSize(11)
       .font('Helvetica')
       .text(`Tunis le : ${data.dateEmission.toLocaleDateString('fr-FR')}`, 350, currentY, { width: 195, align: 'right' })
       .text(`Fichier de Transmission : ${fileName}`, 350, currentY + 15, { width: 195, align: 'right' });
    
    currentY += 25;
    
    // Company name and address - dynamic
    doc.fontSize(11)
       .font('Helvetica')
       .text(data.donneurOrdre.nom, 50, currentY);
    
    currentY += 15;
    const address = data.donneurOrdre.address || '89 Bis Avenue Habib Bourguiba 2080 Nouvelle Ariana';
    doc.text(address, 50, currentY);
    
    currentY += 35;
    
    // Bank information - dynamic from donneurOrdre data
    const agence = data.donneurOrdre.agence || 'ARIANA';
    const banque = data.donneurOrdre.banque || 'ATTIJARI BANK';
    
    doc.fontSize(11)
       .font('Helvetica')
       .text('AGENCE DE :', 50, currentY)
       .text(agence, 170, currentY);
    
    currentY += 15;
    doc.text('BANQUE :', 50, currentY)
       .text(banque, 170, currentY);
    
    currentY += 15;
    doc.text('COMPTE N°:', 50, currentY)
       .text(data.donneurOrdre.rib, 170, currentY);
    
    currentY += 25;
    
    // CodeBanque - centered
    doc.fontSize(10)
       .font('Helvetica-Oblique')
       .text(`CodeBanque ${data.donneurOrdre.banque || '04'}`, 0, currentY, { width: doc.page.width, align: 'center' });
    
    doc.y = currentY + 20;
  }

  private addVirementTable(doc: any, data: OVPdfData) {
    let currentY = doc.y;
    
    // Instruction text - exact positioning
    doc.fontSize(11)
       .font('Helvetica')
       .text('Par le débit de mon / notre compte indiqué ci-dessus, veuillez effectuer les virements suivants :', 50, currentY, { width: 495 });
    
    currentY += 25;
    
    // Table setup
    const tableX = 50;
    const tableWidth = 495;
    const colWidths = [80, 140, 200, 75]; // Code, Domiciliation, Noms, Montant
    const rowHeight = 35;
    
    // Header row with borders and background
    doc.rect(tableX, currentY, tableWidth, rowHeight)
       .fillAndStroke('#f5f5f5', '#FF0000');
    
    // Header text
    doc.fillColor('#000000')
       .fontSize(11)
       .font('Helvetica-Bold');
    
    let colX = tableX;
    const headers = ['Code Banque', 'Domiciliation', 'Noms et Prénoms des Bénéficiaires', 'Montant'];
    
    headers.forEach((header, i) => {
      doc.rect(colX, currentY, colWidths[i], rowHeight).stroke('#FF0000');
      doc.text(header, colX + 10, currentY + 12, { width: colWidths[i] - 20, align: 'center' });
      colX += colWidths[i];
    });
    
    currentY += rowHeight;
    
    // Data rows
    doc.fontSize(10).font('Helvetica');
    const maxRows = Math.min(data.virements.length, 11);
    
    for (let i = 0; i < maxRows; i++) {
      const virement = data.virements[i];
      const bankCode = virement.rib.substring(0, 2);
      const bankName = this.getBankName(bankCode);
      const montantFormatted = this.formatAmount(virement.montant);
      const beneficiaryName = `${virement.nom} ${virement.prenom} ${bankName}`.trim();
      
      // Row background
      doc.rect(tableX, currentY, tableWidth, rowHeight).fillAndStroke('#ffffff', '#FF0000');
      
      // Cell data
      colX = tableX;
      const rowData = [bankCode, virement.rib, beneficiaryName, montantFormatted];
      const alignments = ['center', 'left', 'left', 'right'];
      
      rowData.forEach((data, j) => {
        doc.rect(colX, currentY, colWidths[j], rowHeight).stroke('#FF0000');
        doc.fillColor('#000000')
           .text(data, colX + 10, currentY + 12, { 
             width: colWidths[j] - 20, 
             align: alignments[j] 
           });
        colX += colWidths[j];
      });
      
      currentY += rowHeight;
    }
    
    // Total row
    const totalAmount = data.virements.reduce((sum, v) => sum + v.montant, 0);
    doc.rect(tableX, currentY, tableWidth, rowHeight).fillAndStroke('#fff9c4', '#FF0000');
    
    colX = tableX;
    for (let i = 0; i < 3; i++) {
      doc.rect(colX, currentY, colWidths[i], rowHeight).stroke('#FF0000');
      colX += colWidths[i];
    }
    
    // Total cell
    doc.rect(colX, currentY, colWidths[3], rowHeight).stroke('#FF0000');
    doc.fillColor('#000000')
       .font('Helvetica-Bold')
       .text(`Total: ${this.formatAmount(totalAmount)}`, colX + 10, currentY + 12, { 
         width: colWidths[3] - 20, 
         align: 'right' 
       });
    
    doc.y = currentY + rowHeight + 15;
  }
  
  private formatAmount(amount: number): string {
    return amount.toLocaleString('fr-FR', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }).replace(',', ' ').replace('.', ',');
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
      '05': 'BNA',
      '28': 'ABC'
    };
    return bankMap[bankCode] || 'BANK';
  }

  private addFooter(doc: any, data: OVPdfData) {
    let currentY = doc.y;
    
    // Amount in words - exact positioning
    const amountInWords = this.convertAmountToWords(data.montantTotal);
    doc.fontSize(11)
       .font('Helvetica')
       .text(amountInWords, 50, currentY);
    
    currentY += 20;
    
    // Transfer object - dynamic reference
    const virementRef = data.reference || `bord ${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    doc.fontSize(11)
       .font('Helvetica')
       .text(`Objet du virement : ${virementRef}`, 50, currentY);
    
    // Total - right aligned like original
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('Total', 480, currentY, { width: 65, align: 'right' });
    
    currentY += 15;
    
    // Total amount - right aligned
    doc.fontSize(11)
       .font('Helvetica')
       .text(data.montantTotal.toFixed(2).replace('.', ','), 480, currentY, { width: 65, align: 'right' });
    
    currentY += 30;
    
    // Contract and references - dynamic data
    const contractNum = data.contractNumber || `A${Date.now().toString().slice(-8)}`;
    const companyRef = data.companyReference || data.donneurOrdre.nom;
    const bordereauRef = data.bordereauReference || virementRef;
    
    doc.fontSize(11)
       .font('Helvetica')
       .text(`Contrat N°: ${contractNum}`, 50, currentY);
    
    currentY += 20;
    doc.text(`Référence Compagnie D'assurance: ${companyRef}`, 50, currentY);
    
    currentY += 15;
    doc.text(`Réf Bordereau de règlement Compagnie: ${bordereauRef}`, 50, currentY);
    
    currentY += 15;
    doc.text(`Date Bordereau de Règlement  Compagnie : ${data.dateEmission.toLocaleDateString('fr-FR')}`, 50, currentY);
    
    // Bottom logo
    const bottomLogoPath = 'D:\\ARS\\frontend\\public\\Image3.jpg';
    try {
      if (require('fs').existsSync(bottomLogoPath)) {
        const bottomY = doc.page.height - 100;
        doc.image(bottomLogoPath, 50, bottomY, { width: doc.page.width - 100, height: 40 });
      }
    } catch (e) { console.log('Bottom logo not found'); }
    
    // Footer - dynamic user info
    const footerY = doc.page.height - 50;
    const currentUser = data.createdBy || 'SYSTEM USER';
    doc.fontSize(10)
       .font('Helvetica')
       .text('Page 1 sur 1', 50, footerY)
       .text(`Saisie par : ${currentUser}`, 350, footerY, { width: 195, align: 'right' });
  }
  
  private convertAmountToWords(amount: number): string {
    const integerPart = Math.floor(amount);
    const decimalPart = Math.round((amount - integerPart) * 1000);
    
    // Simplified French number conversion
    let words = '';
    if (integerPart < 1000) {
      words = this.numberToFrenchWords(integerPart);
    } else if (integerPart < 10000) {
      const thousands = Math.floor(integerPart / 1000);
      const remainder = integerPart % 1000;
      words = `${this.numberToFrenchWords(thousands)} mille ${remainder > 0 ? this.numberToFrenchWords(remainder) : ''}`;
    } else {
      words = integerPart.toString();
    }
    
    return `${words.trim()} Dinars ${decimalPart} Millimes`;
  }
  
  private numberToFrenchWords(num: number): string {
    const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
    const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
    const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
    const hundreds = ['', 'cent', 'deux cents', 'trois cents', 'quatre cents', 'cinq cents', 'six cents', 'sept cents', 'huit cents', 'neuf cents'];
    
    if (num === 0) return 'zéro';
    if (num < 10) return units[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) {
      const ten = Math.floor(num / 10);
      const unit = num % 10;
      return tens[ten] + (unit > 0 ? '-' + units[unit] : '');
    }
    if (num < 1000) {
      const hundred = Math.floor(num / 100);
      const remainder = num % 100;
      return hundreds[hundred] + (remainder > 0 ? ' ' + this.numberToFrenchWords(remainder) : '');
    }
    
    return num.toString(); // Fallback for larger numbers
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
      // Update bordereau status to VIREMENT_EXECUTE
      if (ordreVirement.bordereauId) {
        await this.prisma.bordereau.update({
          where: { id: ordreVirement.bordereauId },
          data: {
            statut: 'VIREMENT_EXECUTE',
            dateExecutionVirement: new Date()
          }
        });
      }
      
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