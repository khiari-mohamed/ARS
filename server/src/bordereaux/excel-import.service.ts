import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';

@Injectable()
export class ExcelImportService {
  constructor(private readonly prisma: PrismaService) {}

  async importFromExcel(buffer: Buffer, filename: string) {
    console.log('📡 Excel Import: Starting real Excel processing');
    console.log('📡 File:', filename, 'Size:', buffer.length, 'bytes');

    try {
      // Parse Excel file
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      console.log('📡 Parsed Excel data:', jsonData.length, 'rows');
      console.log('📡 Sample row:', jsonData[0]);

      let imported = 0;
      const errors: string[] = [];

      for (let i = 0; i < jsonData.length; i++) {
        const row: any = jsonData[i];
        
        try {
          // Extract data from Excel columns
          const reference = row['Reference'] || row['Référence'] || `EXCEL-${Date.now()}-${i}`;
          const clientName = row['Client'] || row['Nom Client'] || 'Client Importé';
          const nombreBS = parseInt(row['Nombre BS'] || row['NombreBS'] || '1');
          const dateReception = row['Date Reception'] || row['Date Réception'] || new Date().toISOString().split('T')[0];
          const delaiReglement = parseInt(row['Délai Règlement'] || row['Delai'] || '30');

          console.log(`📡 Processing row ${i + 1}:`, { reference, clientName, nombreBS });

          // Find or create client
          let client = await this.prisma.client.findFirst({
            where: { name: { contains: clientName, mode: 'insensitive' } }
          });

          if (!client) {
            console.log('🆕 Creating new client:', clientName);
            client = await this.prisma.client.create({
              data: {
                name: clientName,
                reglementDelay: 30,
                reclamationDelay: 15
              }
            });
          }

          // Check if bordereau already exists
          const existing = await this.prisma.bordereau.findFirst({
            where: { reference, clientId: client.id }
          });

          if (existing) {
            console.log('⚠️ Bordereau already exists:', reference);
            continue;
          }

          // Create bordereau
          const bordereau = await this.prisma.bordereau.create({
            data: {
              reference,
              dateReception: new Date(dateReception),
              clientId: client.id,
              nombreBS: isNaN(nombreBS) ? 1 : nombreBS,
              delaiReglement: isNaN(delaiReglement) ? 30 : delaiReglement,
              statut: 'A_SCANNER'
            }
          });

          // Store Excel file as document
          const firstUser = await this.prisma.user.findFirst();
          if (firstUser) {
            await this.prisma.document.create({
              data: {
                name: filename,
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                path: `excel-imports/${filename}`,
                bordereauId: bordereau.id,
                uploadedById: firstUser.id
              }
            });
          }

          imported++;
          console.log('✅ Imported bordereau:', reference);

        } catch (error: any) {
          console.error('❌ Error importing row:', error.message);
          errors.push(`Row ${i + 1}: ${error.message}`);
        }
      }

      console.log('✅ Excel import completed:', { imported, errors: errors.length });
      return {
        success: true,
        imported,
        errors,
        skipped: jsonData.length - imported - errors.length
      };

    } catch (error: any) {
      console.error('❌ Excel import failed:', error);
      throw new Error(`Excel import failed: ${error.message}`);
    }
  }
}