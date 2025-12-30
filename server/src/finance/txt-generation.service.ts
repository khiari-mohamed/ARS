import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface TxtVirementData {
  reference: string;
  montant: number;
  rib: string;
  nom: string;
  prenom: string;
  matricule: string;
  societe?: string; // Société field (company/client name)
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
    // Auto-detect format from RIB if not specified
    let formatType = data.donneurOrdre.formatTxtType || 'BTK_COMAR';
    
    // Auto-detect Attijari from RIB (starts with 04)
    if (data.donneurOrdre.rib.startsWith('04')) {
      formatType = 'ATTIJARI';
    }
    
    let result = '';
    switch (formatType) {
      case 'BTK_COMAR':
        result = this.generateBTKComarFormat(data);
        break;
      case 'BTK_ASTREE':
        result = this.generateBTKAstreeFormat(data);
        break;
      case 'ATTIJARI':
        result = this.generateStructure1OLD(data);
        break;
      default:
        result = this.generateBTKComarFormat(data);
        break;
    }
    
    // Ensure no HTML entities in output
    return result.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  }

  private generateBTKComarFormat(data: OVTxtData): string {
    // EXACT BANK FORMAT - 280 CHARS PER LINE - NO V1/V2 PREFIXES
    const lines: string[] = [];
    const dateStr = this.formatDateBTK(data.dateCreation);
    
    // Validate RIB length and format
    if (!/^\d{20}$/.test(data.donneurOrdre.rib)) {
      throw new Error('RIB donneur d\'ordre doit être exactement 20 chiffres');
    }
    
    // Calculate totals with precision
    const totalAmountMillimes = data.virements
      .reduce((sum, v) => sum + Math.round(v.montant * 1000), 0);
    const numberOfOperations = data.virements.length;
    
    // Validate number of operations (max 999 for 2-digit rang field)
    if (numberOfOperations > 999) {
      throw new Error('Nombre maximum de virements dépassé (max 999)');
    }
    
    // Extract and validate bank code from RIB (first 2 digits)
    const codeBanque = data.donneurOrdre.rib.substring(0, 2);
    if (!/^\d{2}$/.test(codeBanque)) {
      throw new Error('Code banque invalide (doit être 2 chiffres)');
    }
    
    // HEADER LINE - EXACT 280 CHARS FORMAT
    let headerLine = '';
    
    // 1. Sens (1 num) = '1'
    headerLine += '1';
    
    // 2. Code valeur (2 num) = '10'
    headerLine += '10';
    
    // 3. Nature remettant (1 num) = '1'
    headerLine += '1';
    
    // 4. Code remettant (2 num) = code banque
    headerLine += codeBanque;
    
    // 5. Code centre régional/agence (3 chars) = 3 BLANKS
    headerLine += '   ';
    
    // 6. Date opération (8 num) AAAAMMJJ
    headerLine += dateStr;
    
    // 7. Numéro du lot (4 num) = '0001'
    headerLine += '0001';
    
    // 8. Code enregistrement (2 num) = '11'
    headerLine += '11';
    
    // 9. Code devise (3 alphanum) = '788'
    headerLine += '788';
    
    // 10. Rang (2 num) = '00'
    headerLine += '00';
    
    // 11. Montant total virements (15 num) - millimes, padded LEFT with zeros
    headerLine += totalAmountMillimes.toString().padStart(15, '0');
    
    // 12. Nombre total virements (10 num) - padded LEFT with zeros
    headerLine += numberOfOperations.toString().padStart(10, '0');
    
    // 13. Zone libre (227 chars) - SPACES
    headerLine += ' '.repeat(227);
    
    // VERIFY: Total must be exactly 280 chars
    if (headerLine.length !== 280) {
      throw new Error(`HEADER LENGTH ERROR: ${headerLine.length} instead of 280`);
    }
    
    lines.push(headerLine);

    // DETAIL LINES - EXACT 280 CHARS FORMAT (V2 equivalent)
    data.virements.forEach((virement, index) => {
      // Validate beneficiary RIB
      if (!/^\d{20}$/.test(virement.rib)) {
        throw new Error(`RIB bénéficiaire invalide pour ${virement.nom} ${virement.prenom}`);
      }
      
      const montantMillimes = Math.round(virement.montant * 1000);
      const codeBanqueBenef = virement.rib.substring(0, 2);
      
      let line = '';
      
      // 1. Sens (1 num) = '1'
      line += '1';
      
      // 2. Code valeur (2 num) = '10'
      line += '10';
      
      // 3. Nature remettant (1 num) = '1'
      line += '1';
      
      // 4. Code remettant (2 num) = code banque émetteur
      line += codeBanque;
      
      // 5. Code centre/agence (3 chars) = 3 BLANKS
      line += '   ';
      
      // 6. Date opération (8 num) AAAAMMJJ
      line += dateStr;
      
      // 7. Numéro du lot (4 num) = '0001'
      line += '0001';
      
      // 8. Code enregistrement (2 num) = '22' (detail)
      line += '22';
      
      // 9. Code devise (3 alphanum) = '788'
      line += '788';
      
      // 10. Rang (2 num) = sequence number padded to 3 digits, take last 2
      const rang = (index + 1).toString().padStart(3, '0').slice(-2);
      line += rang;
      
      // 11. Montant virement (15 num) - millimes
      line += montantMillimes.toString().padStart(15, '0');
      
      // 12. RIB émetteur (20 num)
      line += data.donneurOrdre.rib;
      
      // 13. RIB bénéficiaire (20 num)
      line += virement.rib;
      
      // 14. Beneficiary name (nom + prenom) - NOT company name (30 alphanum)
      const beneficiaryName = (virement.nom + ' ' + virement.prenom)
        .toUpperCase()
        .replace(/[^A-Z0-9 ]/g, '')
        .substring(0, 30)
        .padEnd(30, ' ');
      line += beneficiaryName;
      
      // 15. Référence (20 alphanum) - no special chars
      const ref = `MAT${virement.matricule}`.replace(/[^A-Z0-9]/g, '').substring(0, 20).padEnd(20, ' ');
      line += ref;
      
      // 16. Société (35 alphanum) - Company/Client name from virement
      const societeText = virement.societe || data.donneurOrdre.nom;
      const societe = societeText
        .toUpperCase()
        .replace(/[^A-Z0-9 ]/g, '')
        .substring(0, 35)
        .padEnd(35, ' ');
      line += societe;
      
      // 17. Zone libre (112 chars) - SPACES to reach exactly 280 chars
      line += ' '.repeat(112);
      
      // VERIFY: Total must be exactly 280 chars
      if (line.length !== 280) {
        throw new Error(`DETAIL LINE ${index + 1} LENGTH ERROR: ${line.length} instead of 280`);
      }
      
      lines.push(line);
    });

    return lines.join('\n');
  }

  private generateBTKAstreeFormat(data: OVTxtData): string {
    // EXACT BANK FORMAT - Same as BTK COMAR
    return this.generateBTKComarFormat(data);
  }

  private generateAttijariFormat(data: OVTxtData): string {
    // EXACT BANK FORMAT - Same as BTK (all banks use same format)
    return this.generateBTKComarFormat(data);
  }

  private generateStructure1OLD(data: OVTxtData): string {
    const lines: string[] = [];
    const dateStr = this.formatDateAmen(data.dateCreation);
    let totalAmountMillimes = 0;
    const detailLines: string[] = [];
    
    data.virements.forEach((virement, index) => {
      const montantMillimes = Math.round(virement.montant * 1000);
      totalAmountMillimes += montantMillimes;
      
      const emitterRib = data.donneurOrdre.rib.replace(/\D/g, '').substring(0, 20).padStart(20, '0');
      const benefRib = virement.rib.replace(/\D/g, '').substring(0, 20).padStart(20, '0');
      const benefName = (virement.nom + ' ' + virement.prenom).toUpperCase().replace(/[^A-Z0-9 ]/g, '').substring(0, 30).padEnd(30, ' ');
      const matricule = virement.matricule.replace(/[^A-Z0-9]/g, '').substring(0, 20).padStart(20, '0');
      const sequenceNum = (index + 1).toString().padStart(7, '0');
      const donneurNom = data.donneurOrdre.nom.replace(/&quot;/g, '"').replace(/&amp;/g, '&').substring(0, 30).padEnd(30, ' ');
      
      let line = '';
      // Fields 1-5: Sens(1) + CodeValeur(2) + Nature(1) + CodeRemettant(2) + CodeCentre(3) = 9 chars
      line += '110104   ';
      // Field 6: Date (8)
      line += dateStr;
      // Field 7: Numéro lot (4)
      line += '0001';
      // Field 8: Code enregistrement (2)
      line += '21';
      // Field 9: Code devise (3)
      line += '788';
      // Field 10: Rang (2)
      line += '00';
      // Field 11: Montant (15)
      line += montantMillimes.toString().padStart(15, '0');
      // Field 12: Numéro virement (7)
      line += sequenceNum;
      // Field 13: RIB donneur (20)
      line += emitterRib;
      // Field 14: Nom donneur (30)
      line += donneurNom;
      // Field 15: Code institution destinataire (2)
      line += benefRib.substring(0, 2);
      // Field 16: Code centre destinataire (3)
      line += '   ';
      // Field 17: RIB bénéficiaire (20)
      line += benefRib;
      // Field 18: Nom bénéficiaire (30)
      line += benefName;
      // Field 19: Référence dossier (20)
      line += matricule;
      // Field 20: Code enreg complémentaire (1)
      line += '0';
      // Field 21: Nombre enreg complémentaires (2)
      line += '00';
      // Field 22: Motif (45)
      line += 'PGH20-2025GAN FRIGAN'.padEnd(45, ' ');
      // Field 23: Date compensation (8)
      line += dateStr;
      // Field 24: Motif rejet (8)
      line += '00000000';
      // Field 25: Situation donneur (1)
      line += '0';
      // Field 26: Type compte (1)
      line += '1';
      // Field 27: Nature compte (1)
      line += '0';
      // Field 28: Dossier change (1)
      line += ' ';
      // Field 29: Zone libre (37)
      line += ' '.repeat(37);
      
      detailLines.push(line);
    });
    
    // Header line
    let headerLine = '110104   ' + dateStr + '0001' + '11' + '788' + '00' + totalAmountMillimes.toString().padStart(15, '0') + data.virements.length.toString().padStart(10, '0');
    headerLine = headerLine.padEnd(280, ' ');
    lines.push(headerLine);
    lines.push(...detailLines);
    return lines.join('\n');
  }

  private formatDateBTK(date: Date): string {
    // Format YYYYMMDD for BTK banks
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return year + month + day;
  }

  private formatDateDisplay(date: Date): string {
    // Format DDMMYYYY for display
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return day + month + year;
  }

  private generateStructure2OLD(data: OVTxtData): string {
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
      throw new Error('Ordre de virement non trouvé');
    }

    console.log('TXT Generation - OrdreVirement data:', {
      id: ordreVirement.id,
      itemsCount: ordreVirement.items?.length || 0,
      items: ordreVirement.items
    });

    if (!ordreVirement.items || ordreVirement.items.length === 0) {
      throw new Error('No items found in ordre virement');
    }

    const virements = ordreVirement.items
      .filter(item => item.statut === 'VALIDE')
      .map((item: any, index) => {
        let excelData: any = null;
        try {
          excelData = item.erreur ? JSON.parse(item.erreur) : null;
        } catch (e) {
          // erreur is not JSON, ignore
        }
        const adherent = item.adherent;
        
        // CRITICAL: Must have real adherent data from DB, reject if missing
        if (!adherent || !adherent.nom || !adherent.rib) {
          throw new Error(`Adherent data missing for item ${index + 1}. Matricule: ${adherent?.matricule || 'unknown'}. Please ensure all adherents exist in database.`);
        }
        
        return {
          reference: `${ordreVirement.reference}-${(index + 1).toString().padStart(3, '0')}`,
          montant: item.montant,
          rib: adherent.rib,
          nom: adherent.nom,
          prenom: adherent.prenom || '',
          matricule: adherent.matricule,
          societe: adherent.client?.name || adherent.assurance || ordreVirement.donneurOrdre.nom
        };
      });

    if (virements.length === 0) {
      throw new Error('No valid virements found for TXT generation');
    }

    // Validate donneur d'ordre data
    if (!ordreVirement.donneurOrdre) {
      throw new Error('Donneur d\'ordre manquant');
    }
    if (!ordreVirement.donneurOrdre.nom) {
      throw new Error('Nom du donneur d\'ordre manquant');
    }
    if (!ordreVirement.donneurOrdre.rib || ordreVirement.donneurOrdre.rib.length < 20) {
      throw new Error('RIB du donneur d\'ordre invalide ou manquant');
    }

    // CRITICAL: Decode HTML entities from database before processing
    const donneurNom = ordreVirement.donneurOrdre.nom
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');

    const txtData: OVTxtData = {
      donneurOrdre: {
        nom: donneurNom,
        rib: ordreVirement.donneurOrdre.rib,
        formatTxtType: ordreVirement.donneurOrdre.formatTxtType || 'BTK_COMAR'
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