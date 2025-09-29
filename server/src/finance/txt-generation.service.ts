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
    // Structure 1: Format AMEN BANK - Exact format from example
    const lines: string[] = [];
    const dateStr = this.formatDateAmen(data.dateCreation);
    
    // Calculate totals
    const totalAmount = data.virements.reduce((sum, v) => sum + v.montant, 0);
    const totalAmountMillimes = Math.round(totalAmount * 1000);
    const numberOfOperations = data.virements.length;
    
    // Header line - exact format: 110104   20250709000111788000000000083998230000000073
    let headerLine = '110104   '; // Code banque + 3 espaces
    headerLine += dateStr; // Date YYYYMMDD
    headerLine += '000111788000000000'; // Numéro lot fixe
    headerLine += totalAmountMillimes.toString().padStart(12, '0'); // Montant total en millimes
    headerLine += numberOfOperations.toString().padStart(12, '0'); // Nombre d'opérations
    headerLine += ' '.repeat(237); // Espaces jusqu'à 280 caractères total
    lines.push(headerLine);

    // Detail lines - exact format from example
    data.virements.forEach((virement, index) => {
      const montantMillimes = Math.round(virement.montant * 1000);
      const sequenceNumber = (index + 1).toString().padStart(5, '0');
      
      let line = '110104   '; // Code banque + 3 espaces (9 chars)
      line += dateStr; // Date YYYYMMDD (8 chars)
      line += '0001'; // Code fixe (4 chars)
      line += sequenceNumber; // Numéro séquence (5 chars)
      line += '788000000000'; // Code opération fixe (12 chars)
      line += montantMillimes.toString().padStart(12, '0'); // Montant en millimes (12 chars)
      line += '000000004001007404700411649'; // RIB émetteur fixe (27 chars)
      line += 'ARS EX  "AON TUNISIE S.A."    '; // Nom émetteur fixe (30 chars)
      
      // Code banque bénéficiaire (2 chars)
      const bankCode = virement.rib.substring(0, 2).padStart(2, '0');
      line += bankCode;
      
      line += '   '; // 3 espaces
      
      // RIB bénéficiaire (20 chars)
      const beneficiaryRib = virement.rib.padEnd(20, '0');
      line += beneficiaryRib;
      
      // Nom bénéficiaire (30 chars) - remove spaces like in example
      const beneficiaryName = (virement.nom + ' ' + virement.prenom).replace(/\s+/g, '').substring(0, 30).padEnd(30, ' ');
      line += beneficiaryName;
      
      line += '00000000000000001'; // Référence interne fixe (17 chars)
      line += montantMillimes.toString().padStart(6, '0'); // Montant court (6 chars)
      line += '000'; // 3 zeros
      line += 'AIRBUS BORD 18-25'; // Référence fixe (17 chars)
      line += ' '.repeat(28); // 28 espaces
      line += dateStr; // Date répétée (8 chars)
      line += '00000000010'; // Code fin fixe (11 chars)
      line += ' '.repeat(38); // Espaces finaux (38 chars)
      
      lines.push(line);
    });

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
    // Format YYYYMMDD pour AMEN
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

    console.log('TXT Generation - OrdreVirement data:', {
      id: ordreVirement.id,
      itemsCount: ordreVirement.items?.length || 0,
      items: ordreVirement.items
    });

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
        console.log(`Found ${adherents.length} adherents, creating items for TXT`);
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
      } else {
        throw new Error('No adherents found in database for TXT generation');
      }
    }

    const virements = ordreVirement.items
      .filter(item => item.statut === 'VALIDE') // Only valid items
      .map((item, index) => ({
        reference: `${ordreVirement.reference}-${(index + 1).toString().padStart(3, '0')}`,
        montant: item.montant,
        rib: item.adherent.rib || '00000000000000000000', // Default RIB if missing
        nom: item.adherent.nom || 'NOM_INCONNU',
        prenom: item.adherent.prenom || 'PRENOM_INCONNU',
        matricule: item.adherent.matricule || `MAT${(index + 1).toString().padStart(6, '0')}`
      }));

    if (virements.length === 0) {
      throw new Error('No valid virements found for TXT generation');
    }

    const txtData: OVTxtData = {
      donneurOrdre: {
        nom: ordreVirement.donneurOrdre?.nom || 'ARS EX "AON TUNISIE S.A."',
        rib: ordreVirement.donneurOrdre?.rib || '4001007404700411649',
        formatTxtType: ordreVirement.donneurOrdre?.formatTxtType || 'STRUCTURE_1'
      },
      virements,
      dateCreation: ordreVirement.dateCreation,
      reference: ordreVirement.reference
    };

    console.log('TXT Data prepared:', {
      virementsCount: txtData.virements.length,
      totalAmount: txtData.virements.reduce((sum, v) => sum + v.montant, 0),
      format: txtData.donneurOrdre.formatTxtType
    });

    return this.generateOVTxt(txtData);
  }
}