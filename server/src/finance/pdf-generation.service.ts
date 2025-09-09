import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';

export interface OVPdfData {
  ordreVirementId: string;
  donneurOrdre: {
    nom: string;
    rib: string;
    banque: string;
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
}

@Injectable()
export class PdfGenerationService {
  constructor(private prisma: PrismaService) {}

  async generateOVPdf(data: OVPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
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
    // Titre principal
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .text('ORDRE DE VIREMENT', { align: 'center' });
    
    doc.moveDown(1);

    // Informations du donneur d'ordre
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('DONNEUR D\'ORDRE:', 50, doc.y);
    
    doc.font('Helvetica')
       .text(`Nom: ${data.donneurOrdre.nom}`, 50, doc.y + 5)
       .text(`Compte bancaire: ${data.donneurOrdre.rib}`, 50, doc.y + 5)
       .text(`Banque: ${data.donneurOrdre.banque}`, 50, doc.y + 5)
       .text(`Date d'émission: ${data.dateEmission.toLocaleDateString('fr-FR')}`, 50, doc.y + 5);

    doc.moveDown(1.5);
  }

  private addVirementTable(doc: any, data: OVPdfData) {
    const startY = doc.y;
    const tableTop = startY;
    const itemHeight = 20;
    
    // En-têtes du tableau
    const headers = [
      { text: 'Société / N° Contrat', x: 50, width: 120 },
      { text: 'Matricule', x: 170, width: 80 },
      { text: 'Nom et Prénom', x: 250, width: 120 },
      { text: 'RIB', x: 370, width: 100 },
      { text: 'Montant (DT)', x: 470, width: 80 }
    ];

    // Dessiner les en-têtes
    doc.fontSize(10)
       .font('Helvetica-Bold');
    
    headers.forEach(header => {
      doc.rect(header.x, tableTop, header.width, itemHeight)
         .stroke()
         .text(header.text, header.x + 5, tableTop + 5, { 
           width: header.width - 10,
           align: 'center'
         });
    });

    let currentY = tableTop + itemHeight;

    // Données du tableau
    doc.font('Helvetica')
       .fontSize(9);

    data.virements.forEach((virement, index) => {
      // Vérifier si on a besoin d'une nouvelle page
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
        
        // Redessiner les en-têtes sur la nouvelle page
        headers.forEach(header => {
          doc.rect(header.x, currentY, header.width, itemHeight)
             .stroke()
             .font('Helvetica-Bold')
             .fontSize(10)
             .text(header.text, header.x + 5, currentY + 5, { 
               width: header.width - 10,
               align: 'center'
             });
        });
        currentY += itemHeight;
        doc.font('Helvetica').fontSize(9);
      }

      // Dessiner les cellules de données
      const rowData = [
        { text: `${virement.societe}\n${virement.numContrat}`, x: 50, width: 120 },
        { text: virement.matricule, x: 170, width: 80 },
        { text: `${virement.nom}\n${virement.prenom}`, x: 250, width: 120 },
        { text: virement.rib, x: 370, width: 100 },
        { text: virement.montant.toFixed(2), x: 470, width: 80 }
      ];

      rowData.forEach(cell => {
        doc.rect(cell.x, currentY, cell.width, itemHeight)
           .stroke()
           .text(cell.text, cell.x + 5, currentY + 5, { 
             width: cell.width - 10,
             align: cell.x === 470 ? 'right' : 'left'
           });
      });

      currentY += itemHeight;
    });

    doc.y = currentY + 10;
  }

  private addFooter(doc: any, data: OVPdfData) {
    // Total global
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text(`MONTANT TOTAL: ${data.montantTotal.toFixed(2)} DT`, { align: 'right' });

    doc.moveDown(2);

    // Signature du donneur d'ordre
    doc.text('Signature du donneur d\'ordre:', { align: 'right' });
    
    if (data.donneurOrdre.signaturePath && fs.existsSync(data.donneurOrdre.signaturePath)) {
      try {
        doc.image(data.donneurOrdre.signaturePath, doc.page.width - 200, doc.y + 10, {
          width: 150,
          height: 75,
          fit: [150, 75]
        });
        doc.y += 85; // Move cursor after image
      } catch (error) {
        doc.text('_________________', { align: 'right' });
        doc.moveDown(2);
      }
    } else {
      doc.text('_________________', { align: 'right' });
      doc.moveDown(2);
    }

    // Tampon du donneur d'ordre (espace réservé)
    doc.fontSize(10)
       .font('Helvetica')
       .text('Tampon du donneur d\'ordre:', { align: 'right' });
    
    // Réserver un espace pour le tampon
    doc.rect(doc.page.width - 200, doc.y + 5, 150, 50)
       .stroke()
       .moveDown(4);
  }

  async generateOVFromOrderId(ordreVirementId: string): Promise<Buffer> {
    // Fetch real data from database
    const ordreVirement = await this.prisma.ordreVirement.findUnique({
      where: { id: ordreVirementId },
      include: {
        donneurOrdre: true,
        items: {
          include: {
            adherent: {
              include: { client: true }
            }
          }
        }
      }
    });

    if (!ordreVirement) {
      throw new Error('Ordre de virement non trouvé');
    }

    const pdfData: OVPdfData = {
      ordreVirementId,
      donneurOrdre: {
        nom: ordreVirement.donneurOrdre.nom,
        rib: ordreVirement.donneurOrdre.rib,
        banque: ordreVirement.donneurOrdre.banque,
        signaturePath: ordreVirement.donneurOrdre.signaturePath || undefined
      },
      virements: ordreVirement.items.map(item => ({
        societe: item.adherent.client.name,
        numContrat: 'CT-' + item.adherent.clientId.substring(0, 8),
        matricule: item.adherent.matricule,
        nom: item.adherent.nom,
        prenom: item.adherent.prenom,
        rib: item.adherent.rib,
        montant: item.montant
      })),
      montantTotal: ordreVirement.montantTotal,
      dateEmission: ordreVirement.dateCreation
    };

    return this.generateOVPdf(pdfData);
  }
}