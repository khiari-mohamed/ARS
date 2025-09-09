import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface TxtVirementData {
  reference: string;
  montant: number;
  rib: string;
  nom: string;
  prenom: string;
  matricule: string;
}

export interface OVTxtData {
  donneurOrdre: {
    nom: string;
    rib: string;
    formatTxtType: string;
  };
  virements: TxtVirementData[];
  dateCreation: Date;
  reference: string;
}

@Injectable()
export class TxtGenerationService {
  constructor(private prisma: PrismaService) {}

  async generateOVTxt(data: OVTxtData): Promise<string> {
    // Application automatique du format selon le donneur d'ordre sélectionné
    const formatType = data.donneurOrdre.formatTxtType || 'STRUCTURE_1';
    
    switch (formatType) {
      case 'STRUCTURE_1':
        return this.generateStructure1(data);
      case 'STRUCTURE_2':
        return this.generateStructure2(data);
      case 'STRUCTURE_3':
        return this.generateStructure3(data);
      default:
        return this.generateStructure1(data);
    }
  }

  private generateStructure1(data: OVTxtData): string {
    // Structure 1: Format AMEN BANK - Ligne fixe 120 caractères
    const lines: string[] = [];
    
    // En-tête obligatoire
    const totalAmount = data.virements.reduce((sum, v) => sum + v.montant, 0);
    const headerLine = [
      'H', // Type enregistrement
      data.reference.padEnd(20, ' '), // Référence lot
      this.formatDateAmen(data.dateCreation), // Date AAAAMMJJ
      data.virements.length.toString().padStart(6, '0'), // Nombre opérations
      Math.round(totalAmount * 1000).toString().padStart(15, '0'), // Montant total en millimes
      data.donneurOrdre.rib.padEnd(20, ' '), // RIB donneur
      data.donneurOrdre.nom.substring(0, 30).padEnd(30, ' '), // Nom donneur
      ''.padEnd(23, ' ') // Filler
    ].join('');
    
    lines.push(headerLine);

    // Détail des virements - Format AMEN exact
    data.virements.forEach((virement, index) => {
      const detailLine = [
        'D', // Type enregistrement
        (index + 1).toString().padStart(6, '0'), // Numéro séquentiel
        virement.rib.padEnd(20, ' '), // RIB bénéficiaire
        (virement.nom + ' ' + virement.prenom).substring(0, 30).padEnd(30, ' '), // Nom bénéficiaire
        Math.round(virement.montant * 1000).toString().padStart(15, '0'), // Montant en millimes
        ('MAT:' + virement.matricule).substring(0, 35).padEnd(35, ' '), // Motif
        ''.padEnd(13, ' ') // Filler
      ].join('');
      
      lines.push(detailLine);
    });

    // Pied obligatoire
    const footerLine = [
      'T', // Type enregistrement
      data.virements.length.toString().padStart(6, '0'), // Total opérations
      Math.round(totalAmount * 1000).toString().padStart(15, '0'), // Total montant
      ''.padEnd(98, ' ') // Filler
    ].join('');
    
    lines.push(footerLine);

    return lines.join('\n');
  }

  private generateStructure2(data: OVTxtData): string {
    // Structure 2: Format BANQUE POPULAIRE - Enregistrements de longueur variable
    const lines: string[] = [];
    
    // En-tête BP
    const headerBP = [
      '01', // Code enregistrement
      data.reference.padEnd(16, ' '), // Référence émetteur
      this.formatDateBP(data.dateCreation), // Date JJMMAAAA
      data.donneurOrdre.rib.replace(/\s/g, ''), // RIB émetteur sans espaces
      data.donneurOrdre.nom.substring(0, 35).padEnd(35, ' '), // Raison sociale
      'TND', // Devise
      data.virements.length.toString().padStart(5, '0') // Nombre virements
    ].join('|'); // Séparateur pipe
    
    lines.push(headerBP);

    // Détail des virements BP
    data.virements.forEach((virement, index) => {
      const detailBP = [
        '02', // Code enregistrement
        (index + 1).toString().padStart(5, '0'), // Numéro ordre
        virement.rib.replace(/\s/g, ''), // RIB bénéficiaire
        (virement.nom + ' ' + virement.prenom).substring(0, 35).padEnd(35, ' '), // Nom bénéficiaire
        virement.montant.toFixed(3), // Montant avec 3 décimales
        'TND', // Devise
        ('REMB MAT:' + virement.matricule).substring(0, 140), // Motif virement
        this.formatDateBP(data.dateCreation) // Date valeur
      ].join('|');
      
      lines.push(detailBP);
    });

    // Pied BP
    const totalAmount = data.virements.reduce((sum, v) => sum + v.montant, 0);
    const footerBP = [
      '03', // Code enregistrement
      data.virements.length.toString().padStart(5, '0'), // Total opérations
      totalAmount.toFixed(3), // Montant total
      'TND' // Devise
    ].join('|');
    
    lines.push(footerBP);

    return lines.join('\n');
  }

  private generateStructure3(data: OVTxtData): string {
    // Structure 3: Format STB (Société Tunisienne de Banque) - Format CSV délimité
    const lines: string[] = [];
    
    // En-tête CSV STB
    const headerCSV = [
      'TYPE_ENREG',
      'REF_LOT',
      'DATE_CREATION',
      'RIB_EMETTEUR',
      'NOM_EMETTEUR',
      'NB_OPERATIONS',
      'MONTANT_TOTAL',
      'DEVISE'
    ].join(';');
    
    lines.push(headerCSV);

    // Ligne en-tête STB
    const totalAmount = data.virements.reduce((sum, v) => sum + v.montant, 0);
    const headerData = [
      'HEADER',
      data.reference,
      this.formatDateSTB(data.dateCreation),
      data.donneurOrdre.rib,
      `"${data.donneurOrdre.nom}"`,
      data.virements.length,
      totalAmount.toFixed(3),
      'TND'
    ].join(';');
    
    lines.push(headerData);

    // En-tête détail
    const detailHeader = [
      'TYPE_ENREG',
      'NUM_ORDRE',
      'RIB_BENEFICIAIRE',
      'NOM_BENEFICIAIRE',
      'MONTANT',
      'DEVISE',
      'MOTIF_VIREMENT',
      'DATE_VALEUR',
      'MATRICULE'
    ].join(';');
    
    lines.push(detailHeader);

    // Détail des virements STB
    data.virements.forEach((virement, index) => {
      const detailData = [
        'DETAIL',
        (index + 1).toString(),
        virement.rib,
        `"${virement.nom} ${virement.prenom}"`,
        virement.montant.toFixed(3),
        'TND',
        `"REMBOURSEMENT SOINS MAT:${virement.matricule}"`,
        this.formatDateSTB(data.dateCreation),
        virement.matricule
      ].join(';');
      
      lines.push(detailData);
    });

    // Pied STB
    const footerData = [
      'FOOTER',
      data.virements.length,
      '',
      '',
      totalAmount.toFixed(3),
      'TND',
      `"LOT ${data.reference}"`,
      this.formatDateSTB(data.dateCreation),
      ''
    ].join(';');
    
    lines.push(footerData);

    return lines.join('\n');
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear().toString().substring(2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return year + month + day;
  }

  private formatDateAmen(date: Date): string {
    // Format AAAAMMJJ pour AMEN
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return year + month + day;
  }

  private formatDateBP(date: Date): string {
    // Format JJMMAAAA pour Banque Populaire
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return day + month + year;
  }

  private formatDateSTB(date: Date): string {
    // Format DD/MM/YYYY pour STB
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${day}/${month}/${year}`;
  }

  private formatAmount(amount: number): string {
    return amount.toFixed(2).replace('.', ',');
  }

  async generateOVTxtFromOrderId(ordreVirementId: string): Promise<string> {
    // Fetch real data from database
    const ordreVirement = await this.prisma.ordreVirement.findUnique({
      where: { id: ordreVirementId },
      include: {
        donneurOrdre: true,
        items: {
          include: {
            adherent: true
          }
        }
      }
    });

    if (!ordreVirement) {
      throw new Error('Ordre de virement non trouvé');
    }

    const txtData: OVTxtData = {
      donneurOrdre: {
        nom: ordreVirement.donneurOrdre.nom,
        rib: ordreVirement.donneurOrdre.rib,
        formatTxtType: ordreVirement.donneurOrdre.formatTxtType // Auto-applied based on donneur
      },
      virements: ordreVirement.items.map((item, index) => ({
        reference: `${ordreVirement.reference}-${(index + 1).toString().padStart(3, '0')}`,
        montant: item.montant,
        rib: item.adherent.rib,
        nom: item.adherent.nom,
        prenom: item.adherent.prenom,
        matricule: item.adherent.matricule
      })),
      dateCreation: ordreVirement.dateCreation,
      reference: ordreVirement.reference
    };

    return this.generateOVTxt(txtData);
  }
}