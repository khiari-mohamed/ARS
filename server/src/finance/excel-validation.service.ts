import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TxtParserService } from './txt-parser.service';
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
  criticalDuplicate?: boolean; // NEW: Flag for exact amount + matricule match
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  type: 'ERROR' | 'WARNING';
}

@Injectable()
export class ExcelValidationService {
  constructor(
    private prisma: PrismaService,
    private txtParserService: TxtParserService
  ) {}

  async validateExcelFile(fileBuffer: Buffer, clientId: string | string[], bordereauId?: string): Promise<ExcelValidationResult> {
    // Fix: Handle clientId as array (frontend sends it twice)
    const actualClientId = Array.isArray(clientId) ? clientId[0] : clientId;
    console.log('validateExcelFile called with clientId:', clientId, 'bordereauId:', bordereauId, '-> using:', actualClientId);
    console.log('📄 File buffer size:', fileBuffer.length, 'bytes');
    
    // EXACT FIX: Get bordereau's client name and ID if bordereauId is provided
    let bordereauClientName: string | null = null;
    let bordereauClientId: string | null = null;
    if (bordereauId) {
      const bordereau = await this.prisma.bordereau.findUnique({
        where: { id: bordereauId },
        include: { client: true }
      });
      if (bordereau) {
        bordereauClientName = bordereau.client.name;
        bordereauClientId = bordereau.client.id;
        console.log('✅ Using bordereau client:', bordereauClientName, 'ID:', bordereauClientId);
      }
    }
    
    // 🚨 LEVEL 1: Excel File Hash Detection (Prevent duplicate file uploads)
    const crypto = require('crypto');
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    console.log('📊 Excel file hash:', fileHash);
    
    // Check if this exact file was uploaded recently (last 90 days) for same client
    const recentDuplicateFile = await this.checkDuplicateFileHash(fileHash, bordereauClientId || actualClientId);
    if (recentDuplicateFile) {
      console.log('⚠️ DUPLICATE FILE DETECTED:', recentDuplicateFile);
    }
    // Check if file is TXT format (starts with 110104)
    const content = fileBuffer.toString('utf-8');
    if (content.startsWith('110104')) {
      console.log('Detected TXT format file, parsing as TXT');
      return this.parseTxtFile(fileBuffer, actualClientId);
    }
    
    let worksheet: ExcelJS.Worksheet | undefined;
    
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer as any);
      // FIX: ExcelJS uses 0-based index OR get first worksheet
      worksheet = workbook.worksheets[0] || workbook.getWorksheet(1);
      
      console.log('📊 Workbook loaded:', {
        sheetCount: workbook.worksheets.length,
        sheetNames: workbook.worksheets.map(s => s.name),
        worksheet1Exists: !!worksheet,
        rowCount: worksheet?.rowCount || 0,
        actualRowCount: worksheet?.actualRowCount || 0
      });
      
      if (!worksheet) {
        throw new Error('No worksheet found in Excel file');
      }
      
      if (worksheet.rowCount < 2) {
        console.log('⚠️ Worksheet has less than 2 rows');
        // Check if there's actual data despite rowCount
        let hasData = false;
        worksheet.eachRow((row, rowNumber) => {
          console.log(`Row ${rowNumber}:`, row.values);
          if (rowNumber > 1 && row.hasValues) {
            hasData = true;
          }
        });
        
        if (!hasData) {
          throw new Error('Empty or invalid Excel file - no data rows found');
        }
      }
    } catch (error : any) {
      console.log('❌ Excel parsing failed:', error.message);
      throw new Error(`Failed to parse Excel file: ${error.message}. Please ensure the file has MATRICULE and MONTANT columns with valid data.`);
    }
    
    if (!worksheet) {
      throw new Error('Failed to load Excel worksheet. Please ensure the file is a valid Excel file.');
    }
    
    console.log('Processing Excel worksheet with', worksheet.rowCount, 'rows');

    // Detect column positions from header row
    const columnMap = this.detectColumns(worksheet.getRow(1));
    console.log('Detected columns:', columnMap);

    const results: VirementValidationItem[] = [];
    const errors: ValidationError[] = [];
    const matriculeMap = new Map<string, number>();

    // Process all rows
    const rowPromises: Promise<{item?: VirementValidationItem, error?: ValidationError}>[] = [];
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      rowPromises.push(this.processRow(worksheet.getRow(rowNumber), rowNumber, actualClientId, columnMap, bordereauClientName, bordereauClientId));
    }
    
    const rowResults = await Promise.all(rowPromises);
    
    console.log(`Received ${rowResults.length} row results`);
    for (const result of rowResults) {
      console.log(`Result:`, JSON.stringify(result));
      if (result && result.item) {
        console.log(`Adding item: matricule=${result.item.matricule}, status=${result.item.status}`);
        results.push(result.item);
      }
      if (result && result.error) {
        errors.push(result.error);
      }
    }
    
    console.log(`Total items: ${results.length}`);

    // 🚨 LEVEL 2: Recent Payment Detection (Warn about recent payments)
    if (bordereauClientId || actualClientId) {
      await this.checkRecentPayments(results, bordereauClientId || actualClientId, recentDuplicateFile);
    }

    const summary = {
      total: results.length,
      valid: results.filter(r => r.status === 'VALIDE').length,
      warnings: results.filter(r => r.status === 'ALERTE').length,
      errors: results.filter(r => r.status === 'ERREUR').length,
      totalAmount: results
        .filter(r => r.status !== 'ERREUR')
        .reduce((sum, r) => sum + r.montant, 0)
    };
    
    // Add duplicate file warning to errors if detected
    if (recentDuplicateFile) {
      errors.push({
        row: 0,
        field: 'file',
        message: `⚠️ ATTENTION: Ce fichier Excel a déjà été utilisé le ${new Date(recentDuplicateFile.uploadedAt).toLocaleDateString('fr-FR')} pour l'OV ${recentDuplicateFile.ovReference}. Vérifiez qu'il ne s'agit pas d'un doublon de paiement.`,
        type: 'WARNING'
      });
    }

    return {
      valid: errors.filter(e => e.type === 'ERROR').length === 0,
      data: results,
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
        
        // CRITICAL FIX: Merge criticalDuplicate flag (true if any item is critical)
        if (item.criticalDuplicate) {
          existing.criticalDuplicate = true;
        }
      } else {
        consolidated.set(key, { ...item });
      }
    }

    return Array.from(consolidated.values());
  }
  
  private async parseTxtFile(fileBuffer: Buffer, clientId: string): Promise<ExcelValidationResult> {
    const txtResult = await this.txtParserService.parseTxtData(fileBuffer);
    
    // Convert TXT result to Excel validation format
    const data: VirementValidationItem[] = txtResult.data.map(item => ({
      matricule: item.matricule,
      nom: item.nom,
      prenom: item.prenom,
      societe: 'ARS TUNISIE',
      rib: item.rib,
      montant: item.montant,
      status: item.status,
      erreurs: item.erreurs,
      adherentId: item.adherentId
    }));
    
    return {
      valid: txtResult.valid,
      data,
      errors: txtResult.errors.map((error, index) => ({
        row: index + 1,
        field: 'general',
        message: error,
        type: 'ERROR' as const
      })),
      summary: {
        ...txtResult.summary,
        warnings: 0
      }
    };
  }

  
  private detectColumns(headerRow: ExcelJS.Row): { matricule: number; nom: number; prenom: number; rib: number; montant: number; societe: number } {
    const map = { matricule: -1, nom: -1, prenom: -1, rib: -1, montant: -1, societe: -1 };
    
    headerRow.eachCell((cell, colNumber) => {
      const header = (cell.text || cell.value?.toString() || '').toLowerCase().trim();
      
      if (header.includes('matricule') || header.includes('mat')) {
        map.matricule = colNumber;
      } else if (header.includes('prenom') || header.includes('prénom') || header.includes('firstname')) {
        map.prenom = colNumber;
      } else if (header.includes('nom') && !header.includes('prenom') && !header.includes('prénom')) {
        map.nom = colNumber;
      } else if (header.includes('name') && !header.includes('firstname')) {
        // EXACT FIX: Detect "Name" column as nom (full name)
        map.nom = colNumber;
      } else if (header.includes('rib') || header.includes('compte') || header.includes('banque') || header.includes('bank')) {
        map.rib = colNumber;
      } else if (header.includes('montant') || header.includes('amount') || header.includes('code')) {
        map.montant = colNumber;
      } else if (header.includes('societe') || header.includes('société') || header.includes('client') || header.includes('assure')) {
        map.societe = colNumber;
      }
    });
    
    console.log('📊 Column detection result:', map);
    return map;
  }

  private async processRow(row: ExcelJS.Row, rowNumber: number, clientId: string, columnMap: any, bordereauClientName?: string | null, bordereauClientId?: string | null): Promise<{item?: VirementValidationItem, error?: ValidationError}> {
    if (!row.hasValues) {
      return {};
    }

    try {
      // Use detected column positions
      const matricule = columnMap.matricule > 0 ? (row.getCell(columnMap.matricule).text || row.getCell(columnMap.matricule).value?.toString() || '').trim() : '';
      
      // Handle montant - if column not detected, search all columns for first number
      let montant: number = NaN;
      let montantRaw = '';
      
      if (columnMap.montant > 0) {
        montantRaw = (row.getCell(columnMap.montant).text || row.getCell(columnMap.montant).value?.toString() || '').trim();
        montant = parseFloat(montantRaw.replace(',', '.').replace(/\s/g, ''));
      } else {
        // Search for montant in all columns
        for (let colIndex = 2; colIndex <= 10; colIndex++) {
          const cellRaw = (row.getCell(colIndex).text || row.getCell(colIndex).value?.toString() || '').trim();
          const cellNum = parseFloat(cellRaw.replace(',', '.').replace(/\s/g, ''));
          if (!isNaN(cellNum) && cellNum > 0 && cellNum < 1000000000) {
            montantRaw = cellRaw;
            montant = cellNum;
            break;
          }
        }
      }
      
      console.log(`Row ${rowNumber}: matricule="${matricule}", montantRaw="${montantRaw}", montant=${montant}`);
      
      // Skip empty rows (both matricule and montant empty)
      if (!matricule && isNaN(montant)) {
        console.log(`Row ${rowNumber}: Skipped (empty)`);
        return {};
      }
      
      // EXACT SPEC: Fetch adherent data from database using matricule AND clientId
      // EXACT FIX: Use bordereauClientId if provided to get adherent from correct client
      let adherent: any = null;
      if (matricule) {
        const searchClientId = bordereauClientId || clientId;
        
        adherent = await this.prisma.adherent.findFirst({
          where: {
            matricule: matricule,
            clientId: searchClientId
          },
          include: { client: true }
        });
        
        console.log(`Row ${rowNumber}: Searching adherent with matricule=${matricule}, clientId=${searchClientId}, found=${!!adherent}`);
      }
      
      // Use adherent data if found, otherwise try Excel columns
      const excelNom = columnMap.nom > 0 ? (row.getCell(columnMap.nom).text || row.getCell(columnMap.nom).value?.toString() || '').trim() : '';
      const excelPrenom = columnMap.prenom > 0 ? (row.getCell(columnMap.prenom).text || row.getCell(columnMap.prenom).value?.toString() || '').trim() : '';
      
      // Handle RIB - CRITICAL: preserve full precision from Excel
      let excelRib = '';
      if (columnMap.rib > 0) {
        const ribCell = row.getCell(columnMap.rib);
        if (ribCell.value) {
          const rawValue = ribCell.value;
          
          // EXACT FIX: Try to get original text before numeric conversion
          // Priority: 1) Cell text 2) Cell formula result 3) Numeric conversion
          if (ribCell.text && ribCell.text.trim() && !/[eE]/.test(ribCell.text)) {
            // Use text if available and not in scientific notation
            excelRib = ribCell.text.trim().replace(/\s/g, '');
            console.log(`Row ${rowNumber}: RIB from cell.text: ${excelRib}`);
          } else if (typeof rawValue === 'string') {
            excelRib = rawValue.trim().replace(/\s/g, '');
            console.log(`Row ${rowNumber}: RIB from string value: ${excelRib}`);
          } else if (typeof rawValue === 'number') {
            // CRITICAL: Use BigInt-like string manipulation to preserve precision
            const numStr = rawValue.toString();
            
            if (numStr.includes('e') || numStr.includes('E')) {
              // Scientific notation - parse carefully
              const [mantissa, exponent] = numStr.toLowerCase().split('e');
              const exp = parseInt(exponent);
              const mantissaDigits = mantissa.replace('.', '').replace('-', '');
              const mantissaDecimals = mantissa.includes('.') ? mantissa.split('.')[1].length : 0;
              
              const totalDigits = exp + 1;
              const zerosToAdd = totalDigits - mantissaDigits.length + mantissaDecimals;
              
              excelRib = mantissaDigits + '0'.repeat(Math.max(0, zerosToAdd));
              
              // Ensure exactly 20 digits
              if (excelRib.length < 20) {
                excelRib = excelRib.padStart(20, '0');
              } else if (excelRib.length > 20) {
                excelRib = excelRib.substring(0, 20);
              }
              
              console.log(`Row ${rowNumber}: RIB from scientific: ${rawValue} -> ${excelRib}`);
            } else {
              excelRib = numStr;
              console.log(`Row ${rowNumber}: RIB from number: ${excelRib}`);
            }
          }
          
          // Clean and validate
          excelRib = excelRib.replace(/[^0-9]/g, '');
          
          // Validate RIB is exactly 20 digits
          if (excelRib.length !== 20 || !/^\d{20}$/.test(excelRib)) {
            console.log(`Row ${rowNumber}: Invalid RIB length: ${excelRib} (length: ${excelRib.length})`);
            // If from DB, try to use DB RIB as fallback
            excelRib = ''; // Clear invalid RIB
          } else {
            console.log(`Row ${rowNumber}: ✅ Valid RIB: ${excelRib}`);
          }
        }
      }
      
      // CRITICAL: Excel data has ABSOLUTE PRIORITY for money flow accuracy
      const nom = excelNom || adherent?.nom || '';
      const prenom = excelPrenom || adherent?.prenom || '';
      const societe = bordereauClientName || adherent?.client?.name || '';
      
      // EXACT FIX: RIB logic with validation
      let rib = '';
      let ribSource = '';
      const ribErrors: string[] = [];
      
      // CRITICAL: Detect if Excel RIB lost precision (ends with 8+ zeros)
      const excelLostPrecision = excelRib && /0{8,}$/.test(excelRib);
      
      if (excelLostPrecision && adherent?.rib) {
        rib = adherent.rib;
        ribSource = 'DB (Excel lost precision)';
        ribErrors.push(`RIB Excel imprécis (${excelRib}), RIB DB utilisé (${adherent.rib})`);
        console.log(`Row ${rowNumber}: ⚠️ Excel RIB lost precision (${excelRib}), using DB RIB`);
      } else if (excelRib && excelRib.length === 20) {
        rib = excelRib;
        ribSource = excelLostPrecision ? 'Excel (precision lost)' : 'Excel';
        
        if (excelLostPrecision && !adherent) {
          ribErrors.push(`⚠️ RIB Excel peut être imprécis (${excelRib}). Veuillez vérifier ou formater la colonne RIB comme TEXTE dans Excel.`);
          console.log(`Row ${rowNumber}: ⚠️ Using Excel RIB with possible precision loss (no DB to verify): ${rib}`);
        } else if (adherent?.rib && adherent.rib !== excelRib) {
          console.log(`Row ${rowNumber}: ⚠️ RIB mismatch - Excel: ${excelRib}, DB: ${adherent.rib}`);
          ribErrors.push(`RIB Excel (${excelRib}) différent du RIB DB (${adherent.rib})`);
        }
        
        console.log(`Row ${rowNumber}: Using Excel RIB: ${rib}`);
      } else if (!excelRib && adherent?.rib) {
        // Case 2: Excel has NO RIB column - use DB RIB ONLY if from correct client
        if (bordereauClientId && adherent.clientId === bordereauClientId) {
          rib = adherent.rib;
          ribSource = 'DB (correct client)';
          console.log(`Row ${rowNumber}: Using DB RIB from correct client (${bordereauClientName}): ${rib}`);
        } else if (bordereauClientId) {
          console.log(`Row ${rowNumber}: ❌ Adherent found but from wrong client. Expected: ${bordereauClientName}, Got: ${adherent.client?.name}`);
          ribErrors.push(`Adhérent trouvé pour client ${adherent.client?.name} au lieu de ${bordereauClientName}`);
        } else {
          // No bordereau context - use DB RIB with warning
          rib = adherent.rib;
          ribSource = 'DB (no bordereau context)';
          console.log(`Row ${rowNumber}: Using DB RIB (no bordereau context): ${rib}`);
        }
      } else if (excelRib && excelRib.length !== 20) {
        // Case 3: Excel has invalid RIB
        console.log(`Row ${rowNumber}: ❌ Invalid Excel RIB: ${excelRib} (length: ${excelRib.length})`);        ribErrors.push(`RIB Excel invalide: ${excelRib} (doit être 20 chiffres)`);
      }

      const validationItem: VirementValidationItem = {
        matricule: matricule || '',
        nom,
        prenom,
        societe,
        rib,
        montant: isNaN(montant) ? 0 : montant,
        status: 'VALIDE',
        erreurs: [...ribErrors],
        adherentId: adherent?.id
      };

      // EXACT SPEC: Validate required fields
      if (!matricule) {
        validationItem.erreurs.push('Matricule/Numéro de contrat manquant');
        validationItem.status = 'ERREUR';
      }
      if (isNaN(montant) || montant <= 0) {
        validationItem.erreurs.push('Montant invalide');
        validationItem.status = 'ERREUR';
      }
      
      // CRITICAL: RIB validation for money flow
      if (!rib || rib.length !== 20) {
        validationItem.erreurs.push('RIB manquant ou invalide (doit être 20 chiffres)');
        validationItem.status = 'ERREUR';
      }
      
      // EXACT SPEC: Adherent validation
      if (matricule && !adherent) {
        validationItem.erreurs.push(`Adhérent non trouvé dans la base pour le client ${bordereauClientName || 'sélectionné'}. Veuillez vérifier que l'adhérent avec matricule ${matricule} existe bien pour ce client.`);
        if (validationItem.status === 'VALIDE') {
          validationItem.status = 'ALERTE';
        }
      } else if (adherent && bordereauClientId && adherent.clientId !== bordereauClientId) {
        validationItem.erreurs.push(`Adhérent lié à ${adherent.client?.name} au lieu de ${bordereauClientName}`);
        if (validationItem.status === 'VALIDE') {
          validationItem.status = 'ALERTE';
        }
      }
      
      console.log(`Row ${rowNumber}: Final - RIB=${rib} (source: ${ribSource}), Status=${validationItem.status}, Errors=${validationItem.erreurs.length}`);
      return { item: validationItem };

    } catch (error : any) {
      return {
        error: {
          row: rowNumber,
          field: 'general',
          message: `Erreur de traitement: ${error.message}`,
          type: 'ERROR'
        }
      };
    }
  }
  
  private async findOrCreateAdherent(item: VirementValidationItem, clientId: string): Promise<string> {
    try {
      // Try to find existing adherent by matricule
      const existing = await this.prisma.adherent.findFirst({
        where: {
          matricule: item.matricule,
          clientId: clientId
        }
      });
      
      if (existing) {
        return existing.id;
      }
      
      // Create new adherent if not found and data is valid
      if (item.status === 'VALIDE') {
        const newAdherent = await this.prisma.adherent.create({
          data: {
            matricule: item.matricule,
            nom: item.nom,
            prenom: item.prenom,
            rib: item.rib,
            clientId: clientId,
            statut: 'ACTIF'
          }
        });
        
        return newAdherent.id;
      }
      
      return `temp-${item.matricule}`;
    } catch (error) {
      console.error('Error finding/creating adherent:', error);
      return `temp-${item.matricule}`;
    }
  }
  
  // 🚨 LEVEL 1: Check if this exact Excel file was uploaded before
  private async checkDuplicateFileHash(fileHash: string, clientId: string): Promise<any> {
    try {
      // Check OrdreVirement table for recent uploads with same file hash (last 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      const recentOV = await this.prisma.ordreVirement.findFirst({
        where: {
          commentaire: {
            contains: fileHash // Store hash in commentaire field
          },
          dateCreation: {
            gte: ninetyDaysAgo
          },
          bordereau: {
            clientId: clientId
          }
        },
        include: {
          bordereau: { include: { client: true } }
        },
        orderBy: { dateCreation: 'desc' }
      });
      
      if (recentOV) {
        return {
          ovReference: recentOV.reference,
          uploadedAt: recentOV.dateCreation,
          clientName: recentOV.bordereau?.client?.name
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error checking duplicate file hash:', error);
      return null;
    }
  }
  
  // 🚨 LEVEL 2 & 3: Check if matricules were used in ANY previous OV (regardless of time)
  // LEVEL 3: Detect EXACT amount + matricule matches (critical duplicates)
  private async checkRecentPayments(items: VirementValidationItem[], clientId: string, skipIfDuplicateFile: any): Promise<void> {
    try {
      // If duplicate file already detected, skip individual checks (avoid noise)
      if (skipIfDuplicateFile) {
        return;
      }
      
      const matricules = items
        .filter(item => item.status !== 'ERREUR' && item.matricule)
        .map(item => item.matricule);
      
      if (matricules.length === 0) return;
      
      // Find ALL OVs that contain these matricules (no time limit)
      const allOVs = await this.prisma.ordreVirement.findMany({
        where: {
          items: {
            some: {
              adherent: {
                matricule: { in: matricules },
                clientId: clientId
              }
            }
          }
        },
        include: {
          items: {
            include: {
              adherent: true
            },
            where: {
              adherent: {
                matricule: { in: matricules },
                clientId: clientId
              }
            }
          }
        },
        orderBy: { dateCreation: 'desc' }
      });
      
      // Group by matricule and collect ALL OVs for each with amount details
      const allOVsByMatricule = new Map<string, Array<{ ovReference: string; ovDate: Date; amount: number }>>();
      
      for (const ov of allOVs) {
        for (const item of ov.items) {
          const matricule = item.adherent.matricule;
          
          if (!allOVsByMatricule.has(matricule)) {
            allOVsByMatricule.set(matricule, []);
          }
          
          allOVsByMatricule.get(matricule)!.push({
            ovReference: ov.reference,
            ovDate: ov.dateCreation,
            amount: item.montant
          });
        }
      }
      
      // Process each current item
      for (const currentItem of items) {
        if (currentItem.status === 'ERREUR') continue;
        
        const previousOrders = allOVsByMatricule.get(currentItem.matricule);
        if (!previousOrders || previousOrders.length === 0) continue;
        
        // 🚨 LEVEL 3: Separate exact amount matches from other occurrences
        // Use tolerance for floating-point comparison (0.001 TND = 1 millime)
        const exactMatches = previousOrders.filter(order => Math.abs(order.amount - currentItem.montant) < 0.001);
        const otherMatches = previousOrders.filter(order => Math.abs(order.amount - currentItem.montant) >= 0.001);
        
        // Add CRITICAL warning if exact amount match exists
        if (exactMatches.length > 0) {
          currentItem.criticalDuplicate = true;
          
          // Create critical message for all exact matches
          const matchDetails = exactMatches
            .map(order => {
              const timeMessage = this.formatTimeSince(order.ovDate);
              return `même montant (${order.amount.toFixed(3)} TND) dans OV ${order.ovReference} (${timeMessage})`;
            })
            .join(', ');
          
          currentItem.erreurs.push(
            `🔴 DOUBLON CRITIQUE : ${matchDetails}. Vérifiez qu'il ne s'agit pas d'un paiement en double.`
          );
          
          // Change status to ALERTE if it was VALIDE
          if (currentItem.status === 'VALIDE') {
            currentItem.status = 'ALERTE';
          }
        }
        
        // Add normal warnings for other previous orders (different amounts)
        for (const order of otherMatches) {
          const timeMessage = this.formatTimeSince(order.ovDate);
          currentItem.erreurs.push(
            `⚠️ Matricule déjà utilisé: ${order.amount.toFixed(3)} TND dans OV ${order.ovReference} (créé ${timeMessage})`
          );
          if (currentItem.status === 'VALIDE') {
            currentItem.status = 'ALERTE';
          }
        }
      }
    } catch (error) {
      console.error('Error checking recent payments:', error);
    }
  }
  
  // Helper to format time elapsed
  private formatTimeSince(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (hours < 1) return `il y a moins d'une heure`;
    if (hours < 24) return `il y a ${hours} heure(s)`;
    if (days === 1) return `il y a 1 jour`;
    return `il y a ${days} jours`;
  }
}