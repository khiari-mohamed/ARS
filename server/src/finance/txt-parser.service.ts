import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface TxtParseResult {
  valid: boolean;
  data: ParsedVirementItem[];
  errors: string[];
  summary: {
    total: number;
    valid: number;
    errors: number;
    totalAmount: number;
  };
}

export interface ParsedVirementItem {
  matricule: string;
  nom: string;
  prenom: string;
  rib: string;
  montant: number;
  status: 'VALIDE' | 'ERREUR';
  erreurs: string[];
  adherentId?: string;
}

@Injectable()
export class TxtParserService {
  constructor(private prisma: PrismaService) {}

  async parseTxtData(fileBuffer: Buffer): Promise<TxtParseResult> {
    const content = fileBuffer.toString('utf-8');
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    
    console.log(`Parsing TXT file with ${lines.length} lines`);
    
    const results: ParsedVirementItem[] = [];
    const errors: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip header line (first line with total amount)
      if (i === 0 && line.includes('000111788000000000')) {
        continue;
      }
      
      // Parse detail lines (format: 110104   YYYYMMDD...)
      if (line.startsWith('110104   ') && line.length > 100) {
        try {
          const parsed = this.parseDetailLine(line);
          if (parsed) {
            results.push(parsed);
          }
        } catch (error) {
          errors.push(`Line ${i + 1}: ${error.message}`);
        }
      }
    }
    
    const summary = {
      total: results.length,
      valid: results.filter(r => r.status === 'VALIDE').length,
      errors: results.filter(r => r.status === 'ERREUR').length,
      totalAmount: results
        .filter(r => r.status === 'VALIDE')
        .reduce((sum, r) => sum + r.montant, 0)
    };
    
    console.log('TXT Parse Summary:', summary);
    
    return {
      valid: errors.length === 0 && results.length > 0,
      data: results,
      errors,
      summary
    };
  }
  
  private parseDetailLine(line: string): ParsedVirementItem | null {
    try {
      // Parse fixed-width format based on your example
      // 110104   20250709000121788000000000102036000000004001007404700411649ARS EX  "AON TUNISIE S.A."    14   14043043100702168352BENGAGI ZIED                  00000000000000001009000AIRBUS BORD 18-25                            2025070900000000010
      
      let pos = 0;
      
      // Skip prefix "110104   " (9 chars)
      pos += 9;
      
      // Skip date (8 chars)
      pos += 8;
      
      // Skip sequence info (21 chars)
      pos += 21;
      
      // Extract amount in millimes (12 chars)
      const amountStr = line.substring(pos, pos + 12);
      const montant = parseInt(amountStr) / 1000; // Convert millimes to dinars
      pos += 12;
      
      // Skip fixed account info (57 chars)
      pos += 57;
      
      // Extract bank code (2 chars)
      const bankCode = line.substring(pos, pos + 2);
      pos += 2;
      
      // Skip spaces (3 chars)
      pos += 3;
      
      // Extract RIB (20 chars)
      const rib = line.substring(pos, pos + 20);
      pos += 20;
      
      // Extract name (30 chars)
      const fullName = line.substring(pos, pos + 30).trim();
      pos += 30;
      
      // Parse name - try to split into nom/prenom
      const nameParts = fullName.split(/\s+/);
      const nom = nameParts[0] || 'NOM_INCONNU';
      const prenom = nameParts.slice(1).join(' ') || 'PRENOM_INCONNU';
      
      // Generate matricule from RIB or use a default
      const matricule = `MAT_${rib.substring(0, 8)}`;
      
      return {
        matricule,
        nom,
        prenom,
        rib,
        montant,
        status: 'VALIDE',
        erreurs: [],
        adherentId: `parsed-${matricule}`
      };
      
    } catch (error) {
      console.error('Error parsing line:', error);
      return null;
    }
  }
}