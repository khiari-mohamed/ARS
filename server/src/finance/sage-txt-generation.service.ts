/**
 * FILE: D:\ARS\server\src\finance\sage-txt-generation.service.ts
 *
 * Generates Sage 100 accounting TXT files (format comptable) for OrdreVirement.
 *
 * This service is COMPLETELY SEPARATE from TxtGenerationService (banking format).
 * It must NOT be confused with the V1/V2 banking TXT — completely different format.
 *
 * === EXACT LINE FORMAT (150 chars per line, CRLF line endings) ===
 *
 * [0:6]    Code Journal        (6 chars)  e.g. "ATT411", "BTK580"
 * [6:14]   Date JJMMAAAA       (8 chars)  e.g. "01042026"
 * [14:19]  N° Ordre            (5 chars)  e.g. "28554"
 * [19:27]  Fixed spaces        (8 chars)  always "        "
 * [27:43]  Compte              (16 chars) left-aligned, right-padded with spaces
 *          → Trésorerie:  "53220900        " (8-digit account + 8 spaces)
 *          → Tiers:       "4110000741105500" (compteGeneral 8 + compteAux 8 = 16)
 * [43:78]  ORDV label          (35 chars) "ORDV GM N: NNNNN" + 19 trailing spaces
 * [78:90]  CHQ + date + D/C    (12 chars) "CHQ01042026D" or "CHQ01042026C"
 * [90:110] Montant             (20 chars) left-aligned, right-padded, comma decimal
 * [110:115] N° Ordre repeat    (5 chars)  same as [14:19]
 * [115:127] Fixed spaces       (12 chars) always "            "
 * [127:144] GM block           (17 chars) "GM: " + 13-char label
 * [144:150] OVMARS             (6 chars)  always "OVMARS"
 *
 * Total: 6+8+5+8+16+35+12+20+5+12+17+6 = 150 chars ✓
 *
 * Each OrdreVirement produces EXACTLY 2 lines:
 *   Line 1: C (Crédit) — Trésorerie account
 *   Line 2: D (Débit)  — Tiers account (compteGeneral + compteAux)
 *
 * Verified against real files:
 *   - 2026ORDRE_DE_VIRMENTATT411-17042026-12_34.TXT
 *   - 2026ORDRE_DE_VIRMENTBTK580-17042026-12_34.TXT
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StatutGlobalService } from './statut-global.service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SageLineParams {
  codeJournal: string;   // 6 chars max
  date: string;          // JJMMAAAA (8 chars)
  numOrdre: string;      // numeric string, will be taken as last 5 digits
  compte: string;        // up to 16 chars (left-aligned, right-padded to 16)
  dc: 'D' | 'C';
  montant: string;       // already formatted: "1118,732"
  libelleCompl: string;  // will be truncated/padded to exactly 13 chars
}

export interface SageGenerationResult {
  content: string;       // Full file content (multiple lines joined by \r\n)
  fileName: string;
  codeJournal: string;
  lineCount: number;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class SageTxtGenerationService {
  private readonly logger = new Logger(SageTxtGenerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly statutGlobalService: StatutGlobalService,
  ) {}

  // -------------------------------------------------------------------------
  // PUBLIC API
  // -------------------------------------------------------------------------

  /**
   * Generate Sage accounting TXT for a single OrdreVirement.
   * Saves to SageTxtGeneration history table.
   * 
   * @param templateId - Optional: Use specific template instead of default/hardcoded
   */
  async generateForOrdreVirement(
    ordreVirementId: string,
    generatedById: string,
    templateId?: string,
  ): Promise<SageGenerationResult> {
    const ov = await this.loadOrdreVirement(ordreVirementId);
    const result = await this.buildSageContent([ov], templateId);
    await this.persistGeneration(ordreVirementId, result, generatedById);
    return result;
  }

  /**
   * Generate Sage accounting TXT for a batch of OrdreVirements.
   * All orders must share the same DonneurOrdre (same bank/journal code).
   * Saves history for each OV individually.
   * 
   * @param templateId - Optional: Use specific template instead of default/hardcoded
   */
  async generateBatch(
    ordreVirementIds: string[],
    generatedById: string,
    templateId?: string,
  ): Promise<SageGenerationResult> {
    if (!ordreVirementIds.length) {
      throw new BadRequestException('ordreVirementIds must not be empty');
    }

    const ovs = await Promise.all(
      ordreVirementIds.map((id) => this.loadOrdreVirement(id)),
    );

    // Warn if mixed journal codes — still generate but log
    const journalCodes = [...new Set(ovs.map((ov) => this.resolveCodes(ov).codeJournal))];
    if (journalCodes.length > 1) {
      this.logger.warn(
        `Batch generation with mixed journal codes: ${journalCodes.join(', ')}. File will be named after first code.`,
      );
    }

    const result = await this.buildSageContent(ovs, templateId);

    // Persist history for each OV
    await Promise.all(
      ordreVirementIds.map((id) => this.persistGeneration(id, result, generatedById)),
    );

    return result;
  }

  /**
   * List generation history for an OrdreVirement.
   */
  async getHistory(ordreVirementId: string) {
    return this.prisma.sageTxtGeneration.findMany({
      where: { ordreVirementId },
      orderBy: { generatedAt: 'desc' },
      select: {
        id: true,
        codeJournal: true,
        filePath: true,
        generatedAt: true,
        generatedById: true,
        fileContent: false, // don't return content in list
      },
    });
  }

  /**
   * Retrieve raw content of a previously generated file.
   */
  async getGeneratedContent(generationId: string): Promise<string> {
    const record = await this.prisma.sageTxtGeneration.findUnique({
      where: { id: generationId },
    });
    if (!record) throw new NotFoundException('Generation record not found');
    if (record.fileContent == null) {
      throw new NotFoundException('Generation record has no file content');
    }
    return record.fileContent;
  }

  // -------------------------------------------------------------------------
  // CORE GENERATION LOGIC
  // -------------------------------------------------------------------------

  /**
   * Builds Sage TXT content using either:
   * 1. Specific template (if templateId provided)
   * 2. Default template (if one is marked isDefault=true)
   * 3. Hardcoded format (fallback)
   */
  private async buildSageContent(ovs: any[], templateId?: string): Promise<SageGenerationResult> {
    // Load template if specified or get default
    let template: any = null;
    
    if (templateId) {
      // Use specific template
      template = await this.prisma.sageTemplate.findUnique({
        where: { id: templateId, type: 'TXT' },
      });
      if (!template) {
        this.logger.warn(`Template ${templateId} not found, using hardcoded format`);
      }
    } else {
      // Try to get default template
      template = await this.prisma.sageTemplate.findFirst({
        where: { type: 'TXT', isDefault: true },
      });
      if (template) {
        this.logger.log(`Using default template: ${template.name}`);
      }
    }

    const lines: string[] = [];

    for (const ov of ovs) {
      const twoLines = template 
        ? this.buildTwoLinesForOvWithTemplate(ov, template)
        : this.buildTwoLinesForOv(ov); // Hardcoded format
      lines.push(...twoLines);
    }

    const content = lines.join('\r\n');

    // Build filename following the naming convention of existing files:
    // 2026ORDRE_DE_VIRMENT{CODE}{NUM}-{DATE}.TXT
    const firstOv = ovs[0];
    const codes = this.resolveCodes(firstOv);
    const now = new Date();
    const dateStr = this.formatDateJJMMAAAA(now).replace(/(\d{2})(\d{2})(\d{4})/, '$3$2$1'); // YYYYMMDD
    const timeStr = `${String(now.getHours()).padStart(2, '0')}_${String(now.getMinutes()).padStart(2, '0')}`;
    const numOrdre = this.extractNumOrdre(firstOv.reference);
    const fileName = `${now.getFullYear()}ORDRE_DE_VIRMENT${codes.codeJournal}-${dateStr.substring(6)}${dateStr.substring(4, 6)}${dateStr.substring(0, 4)}-${timeStr}.TXT`;
    return {
      content,
      fileName,
      codeJournal: codes.codeJournal,
      lineCount: lines.length,
    };
  }

   /**
   * Build exactly 2 lines for one OrdreVirement.
   * Line 1: CREDIT → Trésorerie account
   * Line 2: DEBIT  → Tiers account (compteGeneral + compteAux)
   */
  private buildTwoLinesForOv(ov: any): string[] {
    const codes = this.resolveCodes(ov);
    const date = this.formatDateJJMMAAAA(new Date(ov.dateCreation));
    const numOrdre = this.extractNumOrdre(ov.reference);
    const montant = this.formatMontant(ov.montantTotal);
    const libelleCompl = this.resolveLibelle(ov);

    // Tiers account = compteGeneral (8 chars) + compteAux (8 chars) = 16 chars total
    const tiersComplet = this.buildTiersCompte(ov, codes);

    // Important: the real files start with Credit (trésorerie), then Debit (tiers)
    const tresorerie = codes.compteTresorerie;
    const lineC = this.buildLine({
      codeJournal: codes.codeJournal,
      date,
      numOrdre,
      compte: tresorerie,
      dc: 'C',
      montant,
      libelleCompl,
    });

    const lineD = this.buildLine({
      codeJournal: codes.codeJournal,
      date,
      numOrdre,
      compte: tiersComplet,
      dc: 'D',
      montant,
      libelleCompl,
    });

    return [lineC, lineD];
  }

  /**
   * Build 2 lines using a custom template structure.
   * Template structure.fields defines position and width of each field.
   */
  private buildTwoLinesForOvWithTemplate(ov: any, template: any): string[] {
    const codes = this.resolveCodes(ov);
    const date = this.formatDateJJMMAAAA(new Date(ov.dateCreation));
    const numOrdre = this.extractNumOrdre(ov.reference);
    const montant = this.formatMontant(ov.montantTotal);
    const libelleCompl = this.resolveLibelle(ov);
    const tiersComplet = this.buildTiersCompte(ov, codes);
    const tresorerie = codes.compteTresorerie;

    // Build data map
    const dataMap: Record<string, string> = {
      codeJournal: codes.codeJournal,
      date: date,
      numOrdre: numOrdre,
      compte: '', // Will be set per line
      dc: '', // Will be set per line
      montant: montant,
      libelleCompl: libelleCompl,
    };

    // Build Credit line (tresorerie)
    const lineC = this.buildLineFromTemplate(template, { ...dataMap, compte: tresorerie, dc: 'C' });
    
    // Build Debit line (tiers)
    const lineD = this.buildLineFromTemplate(template, { ...dataMap, compte: tiersComplet, dc: 'D' });

    return [lineC, lineD];
  }

  /**
   * Builds a line using template field definitions.
   */
  private buildLineFromTemplate(template: any, dataMap: Record<string, string>): string {
    const fields = template.structure?.fields || [];
    if (!fields.length) {
      this.logger.error('Template has no fields, falling back to hardcoded format');
      return this.buildLine({
        codeJournal: dataMap.codeJournal,
        date: dataMap.date,
        numOrdre: dataMap.numOrdre,
        compte: dataMap.compte,
        dc: dataMap.dc as 'D' | 'C',
        montant: dataMap.montant,
        libelleCompl: dataMap.libelleCompl,
      });
    }

    // Sort fields by start position
    const sortedFields = [...fields].sort((a, b) => a.start - b.start);
    
    // Calculate total line length
    const totalLength = sortedFields.reduce((max, f) => Math.max(max, f.start + f.width), 0);
    
    // Build line character by character
    const lineArray = new Array(totalLength).fill(' ');
    
    for (const field of sortedFields) {
      let value = '';
      
      // Map field key to data
      switch (field.key) {
        case 'codeJournal':
          value = dataMap.codeJournal;
          break;
        case 'date':
          value = dataMap.date;
          break;
        case 'numOrdre':
          value = dataMap.numOrdre.replace(/\D/g, '').slice(-5).padStart(5, '0');
          break;
        case 'compte':
          value = dataMap.compte;
          break;
        case 'libelle':
          value = `ORDV GM N: ${dataMap.numOrdre.replace(/\D/g, '').slice(-5).padStart(5, '0')}`;
          break;
        case 'refCHQ':
          value = `CHQ${dataMap.date}${dataMap.dc}`;
          break;
        case 'montant':
          value = dataMap.montant;
          break;
        case 'numRepeat':
          value = dataMap.numOrdre.replace(/\D/g, '').slice(-5).padStart(5, '0');
          break;
        case 'libelleCompl':
          value = `GM: ${dataMap.libelleCompl}`;
          break;
        case 'padding':
          value = ' '.repeat(field.width);
          break;
        default:
          value = field.sample || '';
      }
      
      // Truncate or pad to field width
      value = value.substring(0, field.width).padEnd(field.width, ' ');
      
      // Insert into line array
      for (let i = 0; i < value.length && field.start + i < totalLength; i++) {
        lineArray[field.start + i] = value[i];
      }
    }
    
    return lineArray.join('');
  }

  // -------------------------------------------------------------------------
  // LINE BUILDER — EXACT FORMAT
  // -------------------------------------------------------------------------

  /**
   * Builds one 150-character Sage accounting line.
   * Throws if the result is not exactly 150 chars (safety check).
   */
  buildLine(params: SageLineParams): string {
    // [0:6]   Code Journal — 6 chars
    const cj = params.codeJournal.substring(0, 6).padEnd(6, ' ');

    // [6:14]  Date JJMMAAAA — 8 chars
    const date = params.date.substring(0, 8).padEnd(8, ' ');

    // [14:19] N° Ordre — 5 chars (take last 5 digits)
    const numOrdre = params.numOrdre.replace(/\D/g, '').slice(-5).padStart(5, '0');

    // [19:27] Fixed 8 spaces
    const pad1 = ' '.repeat(8);

    // [27:43] Compte — 16 chars, left-aligned, right-padded with spaces
    const compte = params.compte.substring(0, 16).padEnd(16, ' ');

    // [43:78] ORDV label — 35 chars: "ORDV GM N: NNNNN" + trailing spaces
    const ordvLabel = `ORDV GM N: ${numOrdre}`.padEnd(35, ' ');

    // [78:90] CHQ + date + D/C — 12 chars
    const chqRef = `CHQ${date}${params.dc}`;

    // [90:110] Montant — 20 chars, left-aligned, right-padded
    const montant = params.montant.substring(0, 20).padEnd(20, ' ');

    // [110:115] N° Ordre repeat — 5 chars
    const numOrdre2 = numOrdre;

    // [115:127] Fixed 12 spaces
    const pad2 = ' '.repeat(12);

    // [127:144] GM block — 17 chars: "GM: " (4) + 13-char label
    const label13 = params.libelleCompl.substring(0, 13).padEnd(13, ' ');
    const gmBlock = `GM: ${label13}`;

    // [144:150] OVMARS — 6 chars
    const ovmars = 'OVMARS';

    const line = cj + date + numOrdre + pad1 + compte + ordvLabel + chqRef + montant + numOrdre2 + pad2 + gmBlock + ovmars;

    // Safety assertion — never emit a malformed line
    if (line.length !== 150) {
      this.logger.error(
        `Line length assertion failed: expected 150, got ${line.length} for order ${numOrdre}`,
      );
      this.logger.error(`Line: ${JSON.stringify(line)}`);
      throw new Error(
        `Internal error: Sage TXT line length mismatch (${line.length} ≠ 150) for order ${numOrdre}`,
      );
    }

    return line;
  }

  // -------------------------------------------------------------------------
  // RESOLVE CODES — BANK → SAGE MAPPING
  // -------------------------------------------------------------------------

  /**
   * Resolves Sage journal code and treasury account from the DonneurOrdre.
   *
   * Priority:
   * 1. DonneurOrdre.codeJournalSage + DonneurOrdre.compteTresoreriesSage (DB, editable)
   * 2. Static fallback map from formatTxtType (legacy safety net)
   */
  private resolveCodes(ov: any): {
    codeJournal: string;
    compteTresorerie: string;
  } {
    const do_ = ov.donneurOrdre;

    // Prefer DonneurOrdre explicit configuration if present
    if (do_?.codeJournal && do_?.compteTresorerie) {
      return {
        codeJournal: do_.codeJournal,
        compteTresorerie: do_.compteTresorerie,
      };
    }

    // Static fallback keyed by formatTxtType (from existing app conventions)
    const FALLBACK: Record<string, { codeJournal: string; compteTresorerie: string }> = {
      BTK_COMAR:   { codeJournal: 'BTK580', compteTresorerie: '53221650' },
      BTK_ASTREE:  { codeJournal: 'BTK134', compteTresorerie: '53221550' },
      ATTIJARI:    { codeJournal: 'ATT411', compteTresorerie: '53220900' },
      ATT827:      { codeJournal: 'ATT827', compteTresorerie: '53210103' },
      BNA035:      { codeJournal: 'BNA035', compteTresorerie: '53220100' },
      // Also handle if formatTxtType already holds the journal code directly
      BTK580:      { codeJournal: 'BTK580', compteTresorerie: '53221650' },
      BTK134:      { codeJournal: 'BTK134', compteTresorerie: '53221550' },
      ATT411:      { codeJournal: 'ATT411', compteTresorerie: '53220900' },
    };

    const fmt = do_?.formatTxtType ?? '';
    const match = FALLBACK[fmt];

    if (!match) {
      this.logger.error(
        `No Sage config for DonneurOrdre formatTxtType="${fmt}" (OV ${ov.id}). ` +
        'Please set codeJournal and compteTresorerie on the DonneurOrdre.',
      );
      throw new BadRequestException(
        `Cannot generate Sage TXT: DonneurOrdre "${do_?.nom ?? 'unknown'}" ` +
        `has no Sage accounting configuration (codeJournal/compteTresorerie). ` +
        `Please configure it in the Donneurs d'Ordre settings.`,
      );
    }

    this.logger.warn(
      `Using fallback Sage config for DonneurOrdre formatTxtType="${fmt}". ` +
      'Set codeJournal and compteTresorerie on the DonneurOrdre for production.',
    );

    return match;
  }

  // -------------------------------------------------------------------------
  // TIERS ACCOUNT BUILDER
  // -------------------------------------------------------------------------

  /**
   * Builds the 16-char tiers compte:
   *   compteGeneralSage (8 chars from CompagnieAssurance)
   * + compteAuxiliaireSage (8 chars from Client)
   *
   * If either part is missing, logs a clear error and falls back gracefully
   * (fills with zeros) so other lines in a batch are not lost.
   */
  private buildTiersCompte(ov: any, codes: { codeJournal: string }): string {
    // Resolve Client (from bordereau or direct link)
    const client = ov.bordereau?.client ?? ov.client;

    // Part 1: Compte général from the insurance company
    const compteGeneral: string =
      client?.compagnieAssurance?.compteGeneralSage ??
      this.inferCompteGeneralFallback(client, codes.codeJournal);

    // Part 2: Compte auxiliaire from the client record
    const compteAux: string = client?.compteAuxiliaireSage ?? '';

    if (!compteGeneral || compteGeneral.length !== 8) {
      this.logger.error(
        `OV ${ov.id}: compteGeneral is missing or not 8 chars ` +
        `(got "${compteGeneral}"). ` +
        'Set compteGeneralSage on the CompagnieAssurance record.',
      );
    }

    if (!compteAux || compteAux.length !== 8) {
      this.logger.error(
        `OV ${ov.id}: compteAuxiliaireSage is missing or not 8 chars ` +
        `(got "${compteAux}") for client "${client?.name ?? 'unknown'}". ` +
        'Set compteAuxiliaireSage on the Client record.',
      );
    }

    // Build compound account — pad each part to 8 chars, total must be 16
    const part1 = (compteGeneral ?? '').substring(0, 8).padEnd(8, '0');
    const part2 = (compteAux ?? '').substring(0, 8).padEnd(8, '0');

    return part1 + part2; // always 16 chars
  }

  /**
   * Emergency fallback: infer compteGeneral from client/compagnie name.
   * Only used when compteGeneralSage is not set on CompagnieAssurance.
   * Derived from the "Cpte Général Compagnie" Excel sheet.
   */
  private inferCompteGeneralFallback(
    client: any,
    _codeJournal: string,
  ): string {
    const COMPAGNIE_MAP: Record<string, string> = {
      'BH ASSURANCES': '41100001',
      LLOYD:           '41100002',
      MAGHREBIA:       '41100003',
      STAR:            '41100004',
      'COMAR 501':     '41100005',
      'COMAR 502':     '41100006',
      ASTREE:          '41100007',
      CARTE:           '41100008',
      HAYETT:          '41100009',
      GAT:             '41100010',
      'MAGHREBIA VIE': '41100011',
      'GAT-VIE':       '41100012',
      'BIAT ASSURANCE':'41100013',
      AMI:             '41100014',
      'CARTE VIE':     '41100015',
      MGA:             '41100016',
      'GAT VIE':       '41100017',
      'EL AMANA TAKAFUL': '41100018',
      TAKAFULIA:       '41100019',
      MAE:             '41100020',
      // PGH (Poulina) uses ASTREE account in real data
      PGH:             '41100007',
      POULINA:         '41100007',
    };

    // Try the linked compagnieAssurance name first
    const compagnieName: string =
      client?.compagnieAssurance?.nom?.toUpperCase() ?? '';

    for (const [key, code] of Object.entries(COMPAGNIE_MAP)) {
      if (compagnieName.includes(key) || key.includes(compagnieName)) {
        return code;
      }
    }

    // Try the client name itself
    const clientName: string = client?.name?.toUpperCase() ?? '';
    for (const [key, code] of Object.entries(COMPAGNIE_MAP)) {
      if (clientName.includes(key)) {
        return code;
      }
    }

    this.logger.error(
      `Cannot infer compteGeneral for client "${client?.name ?? 'unknown'}" ` +
      `compagnie "${compagnieName}". Returning "00000000".`,
    );

    return '00000000'; // safe placeholder — will produce a visible error in Sage
  }

  // -------------------------------------------------------------------------
  // LIBELLE BUILDER
  // -------------------------------------------------------------------------

  /**
   * Resolves the 13-char GM label (field [127:144] minus "GM: ").
   *
   * Priority:
   * 1. OrdreVirement.libelleSage (manually set, takes precedence)
   * 2. Auto-generated from client name + bordereau reference
   *
   * The label is always truncated/padded to exactly 13 chars.
   */
  private resolveLibelle(ov: any): string {
    if (ov.libelleSage && ov.libelleSage.trim().length > 0) {
      return ov.libelleSage.substring(0, 13).padEnd(13, ' ');
    }

    // Auto-generate from client name + bordereau reference
    return this.autoGenerateLibelle(ov);
  }

  /**
   * Auto-generates a 13-char label.
   *
   * Pattern observed in real files:
   *   "PGH02-2026 UN" = abbreviated client + bordereau ref
   *   "HIKMA IAB2026" = client name + period code
   *   "FNZ BR13-2026" = client abbrev + bordereau ref
   *
   * Strategy: take first word(s) of client name (up to 5 chars) +
   *           space + bordereau reference (remaining chars up to 13 total).
   * If no bordereau: use client name truncated to 13.
   */
  private autoGenerateLibelle(ov: any): string {
    const client = ov.bordereau?.client ?? ov.client;
    const clientName = (client?.name ?? ov.clientName ?? '').toUpperCase().trim();
    const bordRef = (ov.bordereau?.reference ?? '').toUpperCase().trim();

    if (!clientName && !bordRef) {
      return '             '; // 13 spaces — safe fallback
    }

    // Abbreviate client name: first meaningful word, max 5 chars
    const firstWord = clientName
      .replace(/[^A-Z0-9 ]/g, '')
      .split(' ')
      .find((w: string) => w.length > 0) ?? '';
    const abbrev = firstWord.substring(0, 5);

    if (!bordRef) {
      return clientName.substring(0, 13).padEnd(13, ' ');
    }

    // Combine: abbrev + ' ' + bordereau ref, truncated to 13
    const combined = bordRef.length <= 13 - abbrev.length - 1
      ? `${abbrev} ${bordRef}`
      : `${abbrev}${bordRef}`;

    return combined.substring(0, 13).padEnd(13, ' ');
  }

  // -------------------------------------------------------------------------
  // HELPERS
  // -------------------------------------------------------------------------

  /**
   * Formats a Date as JJMMAAAA.
   */
  formatDateJJMMAAAA(date: Date): string {
    const d = new Date(date);
    const j = String(d.getDate()).padStart(2, '0');
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const a = String(d.getFullYear());
    return `${j}${m}${a}`;
  }

  /**
   * Formats a number as Tunisian decimal (comma, 3 places).
   * e.g. 1118.732 → "1118,732"
   */
  formatMontant(amount: number | string): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) {
      this.logger.error(`Invalid amount: ${amount}`);
      return '0,000';
    }
    return num.toFixed(3).replace('.', ',');
  }

  /**
   * Extracts the 5-digit numeric order number from an OrdreVirement reference.
   * e.g. "OV-2026-28554" → "28554"
   *       "28554"         → "28554"
   */
  extractNumOrdre(reference: string): string {
    if (!reference) return '00000';
    // Take last 5 digits
    const digits = reference.replace(/\D/g, '');
    return digits.slice(-5).padStart(5, '0');
  }

  // -------------------------------------------------------------------------
  // DATA LOADING
  // -------------------------------------------------------------------------

  private async loadOrdreVirement(id: string): Promise<any> {
    const ov = await this.prisma.ordreVirement.findUnique({
      where: { id },
      include: {
        donneurOrdre: true,
        bordereau: {
          include: {
            client: {
              include: {
                compagnieAssurance: true,
              },
            },
          },
        },
        client: {
          include: {
            compagnieAssurance: true,
          },
        },
      },
    });

    if (!ov) {
      throw new NotFoundException(`OrdreVirement not found: ${id}`);
    }

    if (!ov.donneurOrdre) {
      throw new BadRequestException(
        `OrdreVirement ${id} has no DonneurOrdre. Cannot generate Sage TXT.`,
      );
    }

    // CRITICAL BUSINESS RULE: No accounting without recovery approval
    // Blocked orders (NON_AUTORISE) cannot generate accounting entries
    if (ov.recouvrementStatus === 'NON_AUTORISE') {
      throw new BadRequestException(
        `Cannot generate Sage TXT: Order ${ov.reference} is BLOCKED by Recovery department. ` +
        `Payment not received. Only Super Admin can override this status.`,
      );
    }

    // CRITICAL BUSINESS RULE: Must be recovery-approved before accounting
    if (ov.recouvrementStatus !== 'AUTORISE') {
      throw new BadRequestException(
        `Cannot generate Sage TXT: Order ${ov.reference} must be approved by Recovery department first. ` +
        `Current status: ${ov.recouvrementStatus}`,
      );
    }

    return ov;
  }

  // -------------------------------------------------------------------------
  // PERSISTENCE
  // -------------------------------------------------------------------------

  private async persistGeneration(
    ordreVirementId: string,
    result: SageGenerationResult,
    generatedById: string,
  ): Promise<void> {
    try {
      await this.prisma.sageTxtGeneration.create({
        data: {
          ordreVirementId,
          codeJournal: result.codeJournal,
          fileContent: result.content,
          // Prisma schema uses `filePath` (optional) instead of `fileName`
          filePath: result.fileName,
          // `type` is required by the Prisma model (e.g. "REMBOURSEMENT" | "TPA").
          // Default to "REMBOURSEMENT" for OV-generated Sage files.
          type: 'REMBOURSEMENT',
          generatedById,
        },
      });
      
      // Update global status to COMPTABILISE (accounting entries generated)
      await this.statutGlobalService.markAsAccounted(ordreVirementId);
    } catch (err) {
      // Non-fatal: log but don't break the download
      this.logger.error(`Failed to persist SageTxtGeneration for OV ${ordreVirementId}: ${err}`);
    }
  }
}