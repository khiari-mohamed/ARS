import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import { CreateBordereauDto } from './dto/create-bordereau.dto';
import { BordereauxService } from './bordereaux.service';

export interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  skipped: number;
}

@Injectable()
export class ExcelImportService {
  private readonly logger = new Logger(ExcelImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bordereauxService: BordereauxService
  ) {}

  async importFromExcel(fileBuffer: Buffer): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      imported: 0,
      errors: [],
      skipped: 0
    };

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer);
      
      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        throw new Error('No worksheet found');
      }

      // Expected columns: Reference, Client, Date Reception, Delai Reglement, Nombre BS
      const expectedHeaders = ['reference', 'client', 'dateReception', 'delaiReglement', 'nombreBS'];
      
      worksheet.eachRow({ includeEmpty: false }, async (row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row

        try {
          const reference = row.getCell(1).value?.toString();
          const clientName = row.getCell(2).value?.toString();
          const dateReception = row.getCell(3).value;
          const delaiReglement = Number(row.getCell(4).value);
          const nombreBS = Number(row.getCell(5).value);

          if (!reference || !clientName || !dateReception) {
            result.errors.push(`Row ${rowNumber}: Missing required fields`);
            result.skipped++;
            return;
          }

          // Find client by name
          const client = await this.prisma.client.findFirst({
            where: { name: { contains: clientName, mode: 'insensitive' } }
          });

          if (!client) {
            result.errors.push(`Row ${rowNumber}: Client '${clientName}' not found`);
            result.skipped++;
            return;
          }

          // Check if bordereau already exists
          const existing = await this.prisma.bordereau.findFirst({
            where: { reference, clientId: client.id }
          });

          if (existing) {
            result.errors.push(`Row ${rowNumber}: Bordereau '${reference}' already exists`);
            result.skipped++;
            return;
          }

          // Create bordereau
          const bordereauData: CreateBordereauDto = {
            reference,
            clientId: client.id,
            dateReception: new Date(dateReception as Date).toISOString(),
            delaiReglement: delaiReglement || client.reglementDelay || 30,
            nombreBS: nombreBS || 0
          };

          await this.bordereauxService.create(bordereauData);
          result.imported++;

        } catch (error) {
          result.errors.push(`Row ${rowNumber}: ${error.message}`);
          result.skipped++;
        }
      });

      if (result.errors.length > 0) {
        result.success = false;
      }

    } catch (error) {
      this.logger.error('Excel import error:', error);
      result.success = false;
      result.errors.push(`Import failed: ${error.message}`);
    }

    return result;
  }
}