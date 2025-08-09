import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

interface OVGenerationRequest {
  bordereauIds: string[];
  donneurOrdreId: string;
  bankCode: string;
}

interface BankFormat {
  txtTemplate: (data: any) => string;
  pdfTemplate: (doc: any, data: any) => void;
}

@Injectable()
export class OVGeneratorService {
  private readonly logger = new Logger(OVGeneratorService.name);
  private readonly outputDir = path.join(process.cwd(), 'generated', 'virements');

  constructor(
    private prisma: PrismaService,
    private alertsService: AlertsService,
  ) {
    this.ensureOutputDir();
  }

  private ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async generateOV(request: OVGenerationRequest) {
    const { bordereauIds, donneurOrdreId, bankCode } = request;

    // Fetch bordereau data with BS details
    const bordereaux = await this.prisma.bordereau.findMany({
      where: { 
        id: { in: bordereauIds },
        statut: 'TRAITE'
      },
      include: {
        client: true,
        BulletinSoin: {
          where: { etat: 'VALIDATED' },
          include: { owner: true }
        }
      }
    });

    if (bordereaux.length === 0) {
      throw new Error('No valid bordereaux found for OV generation');
    }

    // Get donneur d'ordre details
    const donneurOrdre = await this.prisma.donneurDOrdre.findUnique({
      where: { id: donneurOrdreId },
      include: { society: true }
    });

    if (!donneurOrdre) {
      throw new Error('Donneur d\'ordre not found');
    }

    // Aggregate payments by matricule (deduplicate)
    const payments = this.aggregatePayments(bordereaux);
    
    // Generate files
    const ovRef = this.generateOVReference();
    const txtPath = await this.generateTXTFile(payments, donneurOrdre, bankCode, ovRef);
    const pdfPath = await this.generatePDFFile(payments, donneurOrdre, ovRef);

    // Create virement batch record
    const virementBatch = await this.prisma.wireTransferBatch.create({
      data: {
        societyId: donneurOrdre.societyId,
        donneurId: donneurOrdreId,
        fileName: `OV_${ovRef}`,
        fileType: 'BANK_TRANSFER',
        status: 'CREATED'
      }
    });

    // Create individual virement records
    for (const payment of payments) {
      await this.prisma.wireTransfer.create({
        data: {
          batchId: virementBatch.id,
          memberId: payment.memberId,
          donneurId: donneurOrdreId,
          amount: payment.amount,
          reference: payment.reference,
          status: 'PENDING'
        }
      });
    }

    // Update bordereaux status
    await this.prisma.bordereau.updateMany({
      where: { id: { in: bordereauIds } },
      data: { 
        statut: 'TRAITE',
        dateDepotVirement: new Date()
      }
    });

    // Schedule 24h alert if not processed
    await this.scheduleOVAlert(virementBatch.id);

    return {
      batchId: virementBatch.id,
      ovReference: ovRef,
      txtPath,
      pdfPath,
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      paymentCount: payments.length
    };
  }

  private aggregatePayments(bordereaux: any[]): any[] {
    const paymentMap = new Map();

    for (const bordereau of bordereaux) {
      for (const bs of bordereau.BulletinSoin) {
        const key = bs.matricule || bs.nomAssure;
        
        if (paymentMap.has(key)) {
          paymentMap.get(key).amount += bs.montant || 0;
          paymentMap.get(key).references.push(bs.numBs);
        } else {
          paymentMap.set(key, {
            memberId: bs.ownerId,
            matricule: bs.matricule,
            nomAssure: bs.nomAssure,
            nomBeneficiaire: bs.nomBeneficiaire,
            amount: bs.montant || 0,
            references: [bs.numBs],
            rib: bs.owner?.rib || 'RIB_MISSING'
          });
        }
      }
    }

    return Array.from(paymentMap.values()).map((payment, index) => ({
      ...payment,
      reference: `PAY_${String(index + 1).padStart(6, '0')}`
    }));
  }

  private generateOVReference(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const time = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
    return `OV${year}${month}${day}${time}`;
  }

  private async generateTXTFile(payments: any[], donneurOrdre: any, bankCode: string, ovRef: string): Promise<string> {
    const bankFormat = this.getBankFormat(bankCode);
    const txtContent = bankFormat.txtTemplate({
      payments,
      donneurOrdre,
      ovRef,
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      date: new Date().toISOString().split('T')[0].replace(/-/g, '')
    });

    const txtPath = path.join(this.outputDir, `${ovRef}.txt`);
    fs.writeFileSync(txtPath, txtContent, 'utf8');
    
    return txtPath;
  }

  private async generatePDFFile(payments: any[], donneurOrdre: any, ovRef: string): Promise<string> {
    const pdfPath = path.join(this.outputDir, `${ovRef}.pdf`);
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    // PDF Header
    doc.fontSize(16).text('ORDRE DE VIREMENT', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Référence: ${ovRef}`);
    doc.text(`Date: ${new Date().toLocaleDateString()}`);
    doc.text(`Donneur d'ordre: ${donneurOrdre.name}`);
    doc.moveDown();

    // Payments table
    doc.text('DÉTAIL DES VIREMENTS:', { underline: true });
    doc.moveDown();

    let yPosition = doc.y;
    payments.forEach((payment, index) => {
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }

      doc.text(`${index + 1}. ${payment.nomAssure}`, 50, yPosition);
      doc.text(`Matricule: ${payment.matricule}`, 70, yPosition + 15);
      doc.text(`Montant: ${payment.amount.toFixed(2)} €`, 70, yPosition + 30);
      doc.text(`RIB: ${payment.rib}`, 70, yPosition + 45);
      
      if (payment.rib === 'RIB_MISSING') {
        doc.fillColor('red').text('⚠ RIB MANQUANT', 300, yPosition + 45).fillColor('black');
      }

      yPosition += 70;
    });

    // Summary
    doc.moveDown();
    doc.fontSize(14).text(`TOTAL: ${payments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)} €`, { align: 'right' });
    doc.text(`Nombre de virements: ${payments.length}`, { align: 'right' });

    doc.end();
    
    return new Promise((resolve) => {
      stream.on('finish', () => resolve(pdfPath));
    });
  }

  private getBankFormat(bankCode: string): BankFormat {
    const formats: Record<string, BankFormat> = {
      'BNP': {
        txtTemplate: (data) => this.generateBNPFormat(data),
        pdfTemplate: (doc, data) => this.generateBNPPDF(doc, data)
      },
      'SG': {
        txtTemplate: (data) => this.generateSGFormat(data),
        pdfTemplate: (doc, data) => this.generateSGPDF(doc, data)
      },
      'DEFAULT': {
        txtTemplate: (data) => this.generateDefaultFormat(data),
        pdfTemplate: (doc, data) => this.generateDefaultPDF(doc, data)
      }
    };

    return formats[bankCode] || formats['DEFAULT'];
  }

  private generateBNPFormat(data: any): string {
    let content = `HDR${data.ovRef}${data.date}${String(data.payments.length).padStart(6, '0')}${String(Math.round(data.totalAmount * 100)).padStart(12, '0')}\n`;
    
    data.payments.forEach((payment: any) => {
      content += `DTL${payment.reference}${payment.rib.replace(/\s/g, '')}${String(Math.round(payment.amount * 100)).padStart(12, '0')}${payment.nomAssure.padEnd(35, ' ')}\n`;
    });
    
    content += `TRL${String(data.payments.length).padStart(6, '0')}${String(Math.round(data.totalAmount * 100)).padStart(12, '0')}\n`;
    
    return content;
  }

  private generateSGFormat(data: any): string {
    // Société Générale format
    let content = `01${data.donneurOrdre.rib}${data.date}${data.ovRef}\n`;
    
    data.payments.forEach((payment: any) => {
      content += `02${payment.rib}${String(Math.round(payment.amount * 100)).padStart(10, '0')}${payment.nomAssure}\n`;
    });
    
    return content;
  }

  private generateDefaultFormat(data: any): string {
    let content = `HEADER|${data.ovRef}|${data.date}|${data.totalAmount}|${data.payments.length}\n`;
    
    data.payments.forEach((payment: any) => {
      content += `PAYMENT|${payment.reference}|${payment.rib}|${payment.amount}|${payment.nomAssure}\n`;
    });
    
    return content;
  }

  private generateBNPPDF(doc: any, data: any) {
    // BNP-specific PDF formatting
  }

  private generateSGPDF(doc: any, data: any) {
    // SG-specific PDF formatting
  }

  private generateDefaultPDF(doc: any, data: any) {
    // Default PDF formatting
  }

  private async scheduleOVAlert(batchId: string) {
    // Schedule alert for 24h later if OV not processed
    setTimeout(async () => {
      const batch = await this.prisma.wireTransferBatch.findUnique({
        where: { id: batchId }
      });

      if (batch && batch.status === 'CREATED') {
        await this.alertsService.triggerAlert({
          type: 'OV_NOT_PROCESSED_24H',
          bsId: batchId
        });
      }
    }, 24 * 60 * 60 * 1000); // 24 hours
  }
}