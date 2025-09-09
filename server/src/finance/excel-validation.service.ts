import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';

export interface ExcelValidationResult {
  valid: boolean;
  data: VirementValidationItem[];
  errors: ValidationError[];
  summary: {
    total: number;
    valid: number;
    warnings: number;
    errors: number;
    totalAmount: number;
  };
}

export interface VirementValidationItem {
  matricule: string;
  nom: string;
  prenom: string;
  societe: string;
  rib: string;
  montant: number;
  status: 'VALIDE' | 'ERREUR' | 'ALERTE';
  erreurs: string[];
  adherentId?: string;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  type: 'ERROR' | 'WARNING';
}

@Injectable()
export class ExcelValidationService {
  constructor(private prisma: PrismaService) {}

  async validateExcelFile(fileBuffer: Buffer, clientId: string): Promise<ExcelValidationResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as any);
    const worksheet = workbook.getWorksheet(1);

    if (!worksheet) {
      throw new BadRequestException('Aucune feuille de calcul trouvée dans le fichier Excel');
    }

    const results: VirementValidationItem[] = [];
    const errors: ValidationError[] = [];
    const matriculeMap = new Map<string, number>();

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      
      if (!row.hasValues) continue;

      try {
        const matricule = row.getCell(1).text?.trim();
        const nom = row.getCell(2).text?.trim();
        const prenom = row.getCell(3).text?.trim();
        const societe = row.getCell(4).text?.trim();
        const montantStr = row.getCell(5).text?.trim().replace(',', '.');
        const montant = parseFloat(montantStr);

        const validationItem: VirementValidationItem = {
          matricule: matricule || '',
          nom: nom || '',
          prenom: prenom || '',
          societe: societe || '',
          rib: '',
          montant: isNaN(montant) ? 0 : montant,
          status: 'VALIDE',
          erreurs: []
        };

        // Validation des champs obligatoires
        if (!matricule) {
          validationItem.erreurs.push('Matricule manquant');
          validationItem.status = 'ERREUR';
        }
        if (!nom) {
          validationItem.erreurs.push('Nom manquant');
          validationItem.status = 'ERREUR';
        }
        if (!prenom) {
          validationItem.erreurs.push('Prénom manquant');
          validationItem.status = 'ERREUR';
        }
        if (!societe) {
          validationItem.erreurs.push('Société manquante');
          validationItem.status = 'ERREUR';
        }
        // Validation montant positif obligatoire
        if (isNaN(montant) || montant <= 0) {
          validationItem.erreurs.push('Montant invalide (doit être > 0)');
          validationItem.status = 'ERREUR';
          
          errors.push({
            row: rowNumber,
            field: 'montant',
            message: `Montant invalide: ${montantStr}. Le montant doit être supérieur à zéro.`,
            type: 'ERROR'
          });
        }

        if (matricule) {
          // Vérification matricule unique par société
          const matriculeKey = `${matricule}-${societe}`;
          if (matriculeMap.has(matriculeKey)) {
            validationItem.erreurs.push('Matricule dupliqué dans cette société');
            validationItem.status = 'ERREUR';
            
            errors.push({
              row: rowNumber,
              field: 'matricule',
              message: `Matricule ${matricule} dupliqué dans la société ${societe}`,
              type: 'ERROR'
            });
          } else {
            matriculeMap.set(matriculeKey, rowNumber);
          }

          // Recherche de l'adhérent dans la base
          const adherent = await this.prisma.member.findFirst({
            where: {
              cin: matricule,
              society: { name: societe }
            },
            include: { society: true }
          });

          if (adherent) {
            validationItem.rib = adherent.rib;
            validationItem.adherentId = adherent.id;

            // Vérification RIB dupliqué avec gestion des exceptions
            const ribDuplicate = await this.prisma.member.findFirst({
              where: {
                rib: adherent.rib,
                id: { not: adherent.id }
              },
              include: { society: true }
            });

            if (ribDuplicate) {
              validationItem.erreurs.push(`RIB déjà utilisé par ${ribDuplicate.name} (${ribDuplicate.society.name}) - Exception possible`);
              validationItem.status = 'ALERTE';
              
              errors.push({
                row: rowNumber,
                field: 'rib',
                message: `RIB ${adherent.rib} déjà utilisé par ${ribDuplicate.name}. Confirmer si exception autorisée (compte familial/partagé).`,
                type: 'WARNING'
              });
            }
          } else {
            validationItem.erreurs.push('Matricule non trouvé dans la base');
            validationItem.status = 'ERREUR';
            
            errors.push({
              row: rowNumber,
              field: 'matricule',
              message: `Matricule ${matricule} non trouvé pour la société ${societe}`,
              type: 'ERROR'
            });
          }
        }

        results.push(validationItem);

      } catch (error) {
        errors.push({
          row: rowNumber,
          field: 'general',
          message: `Erreur de traitement: ${error.message}`,
          type: 'ERROR'
        });
      }
    }

    // Additionner les montants pour les adhérents qui apparaissent plusieurs fois
    const consolidatedResults = this.consolidateAmounts(results);

    const summary = {
      total: consolidatedResults.length,
      valid: consolidatedResults.filter(r => r.status === 'VALIDE').length,
      warnings: consolidatedResults.filter(r => r.status === 'ALERTE').length,
      errors: consolidatedResults.filter(r => r.status === 'ERREUR').length,
      totalAmount: consolidatedResults
        .filter(r => r.status !== 'ERREUR')
        .reduce((sum, r) => sum + r.montant, 0)
    };

    return {
      valid: errors.filter(e => e.type === 'ERROR').length === 0,
      data: consolidatedResults,
      errors,
      summary
    };
  }

  private consolidateAmounts(results: VirementValidationItem[]): VirementValidationItem[] {
    const consolidated = new Map<string, VirementValidationItem>();

    for (const item of results) {
      if (item.status === 'ERREUR') {
        const key = `${item.matricule}-${item.societe}-${Math.random()}`;
        consolidated.set(key, item);
        continue;
      }

      const key = `${item.matricule}-${item.societe}`;
      
      if (consolidated.has(key)) {
        const existing = consolidated.get(key)!;
        existing.montant += item.montant;
        
        if (item.erreurs.length > 0) {
          existing.erreurs = [...existing.erreurs, ...item.erreurs];
          if (item.status === 'ALERTE' && existing.status === 'VALIDE') {
            existing.status = 'ALERTE';
          }
        }
      } else {
        consolidated.set(key, { ...item });
      }
    }

    return Array.from(consolidated.values());
  }
}