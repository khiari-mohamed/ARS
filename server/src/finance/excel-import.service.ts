import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdherentService } from './adherent.service';
import * as XLSX from 'xlsx';

export interface ExcelImportResult {
  valid: VirementData[];
  errors: ImportError[];
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    totalAmount: number;
    uniqueAdherents: number;
  };
}

export interface VirementData {
  matricule: string;
  montant: number;
  adherent?: any;
  statut: 'VALIDE' | 'ERREUR';
  erreur?: string;
}

export interface ImportError {
  row: number;
  matricule: string;
  montant: number;
  error: string;
}

@Injectable()
export class ExcelImportService {
  private readonly logger = new Logger(ExcelImportService.name);

  constructor(
    private prisma: PrismaService,
    private adherentService: AdherentService
  ) {}

  async processExcelFile(fileBuffer: Buffer, clientId: string): Promise<ExcelImportResult> {
    try {
      // Parse Excel file
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      if (!data || data.length === 0) {
        throw new BadRequestException('Excel file is empty or invalid');
      }

      // Process each row
      const results = await this.processExcelData(data, clientId);
      return results;

    } catch (error) {
      this.logger.error(`Excel processing failed: ${error.message}`);
      throw new BadRequestException(`Failed to process Excel file: ${error.message}`);
    }
  }

  private async processExcelData(data: any[], clientId: string): Promise<ExcelImportResult> {
    const valid: VirementData[] = [];
    const errors: ImportError[] = [];
    const matriculeAmounts: Map<string, number> = new Map();

    // First pass: aggregate amounts by matricule
    data.forEach((row, index) => {
      const matricule = this.extractMatricule(row);
      const montant = this.extractMontant(row);

      if (!matricule) {
        errors.push({
          row: index + 1,
          matricule: '',
          montant: montant || 0,
          error: 'Matricule manquant'
        });
        return;
      }

      if (!montant || montant <= 0) {
        errors.push({
          row: index + 1,
          matricule,
          montant: montant || 0,
          error: 'Montant invalide ou manquant'
        });
        return;
      }

      // Aggregate amounts for same matricule
      const currentAmount = matriculeAmounts.get(matricule) || 0;
      matriculeAmounts.set(matricule, currentAmount + montant);
    });

    // Second pass: validate matricules and create virement data
    const matricules = Array.from(matriculeAmounts.keys());
    const validation = await this.adherentService.validateMatricules(matricules, clientId);

    // Process valid adherents
    for (const adherent of validation.valid) {
      const montant = matriculeAmounts.get(adherent.matricule) || 0;
      
      let statut: 'VALIDE' | 'ERREUR' = 'VALIDE';
      let erreur: string | undefined;

      // Check for RIB issues
      if (!adherent.rib) {
        statut = 'ERREUR';
        erreur = 'RIB manquant';
      } else if (validation.duplicateRibs.includes(adherent.rib)) {
        statut = 'ERREUR';
        erreur = 'RIB utilisé par plusieurs adhérents';
      }

      valid.push({
        matricule: adherent.matricule,
        montant,
        adherent,
        statut,
        erreur
      });
    }

    // Process missing matricules
    for (const matricule of validation.missing) {
      const montant = matriculeAmounts.get(matricule) || 0;
      errors.push({
        row: 0, // Can't determine exact row due to aggregation
        matricule,
        montant,
        error: 'Matricule inconnu'
      });
    }

    // Calculate summary
    const totalAmount = Array.from(matriculeAmounts.values()).reduce((sum, amount) => sum + amount, 0);
    const validRows = valid.filter(v => v.statut === 'VALIDE').length;

    return {
      valid,
      errors,
      summary: {
        totalRows: data.length,
        validRows,
        errorRows: errors.length + valid.filter(v => v.statut === 'ERREUR').length,
        totalAmount,
        uniqueAdherents: matricules.length
      }
    };
  }

  private extractMatricule(row: any): string | null {
    // Try different possible column names
    const possibleKeys = ['matricule', 'Matricule', 'MATRICULE', 'mat', 'Mat', 'MAT'];
    
    for (const key of possibleKeys) {
      if (row[key] !== undefined && row[key] !== null) {
        return String(row[key]).trim();
      }
    }

    return null;
  }

  private extractMontant(row: any): number | null {
    // Try different possible column names
    const possibleKeys = ['montant', 'Montant', 'MONTANT', 'amount', 'Amount', 'AMOUNT'];
    
    for (const key of possibleKeys) {
      if (row[key] !== undefined && row[key] !== null) {
        const value = parseFloat(String(row[key]).replace(',', '.'));
        if (!isNaN(value)) {
          return value;
        }
      }
    }

    return null;
  }

  async validateExcelStructure(fileBuffer: Buffer): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const errors: string[] = [];

      if (!data || data.length === 0) {
        errors.push('Fichier Excel vide');
        return { valid: false, errors };
      }

      // Check headers
      const headers = data[0] as string[];
      const hasMatricule = headers.some(h => 
        h && h.toLowerCase().includes('matricule')
      );
      const hasMontant = headers.some(h => 
        h && (h.toLowerCase().includes('montant') || h.toLowerCase().includes('amount'))
      );

      if (!hasMatricule) {
        errors.push('Colonne "matricule" manquante');
      }

      if (!hasMontant) {
        errors.push('Colonne "montant" manquante');
      }

      if (data.length < 2) {
        errors.push('Aucune donnée trouvée (seulement les en-têtes)');
      }

      return {
        valid: errors.length === 0,
        errors
      };

    } catch (error) {
      return {
        valid: false,
        errors: [`Erreur de lecture du fichier: ${error.message}`]
      };
    }
  }
}