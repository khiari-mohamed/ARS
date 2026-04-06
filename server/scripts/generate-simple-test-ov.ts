import { PrismaClient } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function generateSimpleTestOV() {
  console.log('🔍 Starting simple test OV generation...\n');

  try {
    // Find BTK client
    const btkClient = await prisma.client.findFirst({
      where: { name: { contains: 'BTK', mode: 'insensitive' } }
    });

    if (!btkClient) {
      console.error('❌ BTK client not found!');
      process.exit(1);
    }

    console.log(`✅ BTK client: "${btkClient.name}" (ID: ${btkClient.id})\n`);

    // Get existing OV items for BTK
    const existingOVs = await prisma.ordreVirement.findMany({
      where: {
        bordereau: { clientId: btkClient.id }
      },
      include: {
        items: {
          include: {
            adherent: true
          }
        }
      },
      orderBy: { dateCreation: 'desc' },
      take: 1
    });

    if (!existingOVs.length || !existingOVs[0].items.length) {
      console.error('❌ No existing OV items found for BTK!');
      process.exit(1);
    }

    const items = existingOVs[0].items;
    console.log(`📂 Found ${items.length} items in latest OV: ${existingOVs[0].reference}\n`);

    // Pick items for test scenarios
    const item1 = items[0]; // Critical duplicate
    const item2 = items[1]; // Critical duplicate
    const item3 = items[2]; // Warning (different amount)
    const item4 = items[3]; // Critical duplicate

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Test OV');

    // Add headers
    worksheet.columns = [
      { header: 'Matricule', key: 'matricule', width: 15 },
      { header: 'Montant', key: 'montant', width: 15 }
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add test data rows
    const testRows = [
      {
        matricule: item1.adherent.matricule,
        montant: item1.montant,
        scenario: '🔴 CRITICAL DUPLICATE',
        expected: 'Red background + red border + white text on red amount'
      },
      {
        matricule: item2.adherent.matricule,
        montant: item2.montant,
        scenario: '🔴 CRITICAL DUPLICATE',
        expected: 'Red background + red border + white text on red amount'
      },
      {
        matricule: item3.adherent.matricule,
        montant: item3.montant + 100.5, // Different amount
        scenario: '⚠️ WARNING',
        expected: 'Orange background (normal warning)'
      },
      {
        matricule: item4.adherent.matricule,
        montant: item4.montant,
        scenario: '🔴 CRITICAL DUPLICATE',
        expected: 'Red background + red border + white text on red amount'
      },
      {
        matricule: '999999',
        montant: 100.0,
        scenario: '❌ ERROR',
        expected: 'Light red background (adherent not found)'
      },
      {
        matricule: items[4]?.adherent.matricule || item1.adherent.matricule,
        montant: 999.999,
        scenario: '⚠️ WARNING',
        expected: 'Orange background (same matricule, different amount)'
      }
    ];

    // Add rows to worksheet
    testRows.forEach(row => {
      worksheet.addRow({
        matricule: row.matricule,
        montant: row.montant
      });
    });

    // Create test-data directory if it doesn't exist
    const testDataDir = path.join(__dirname, '..', 'test-data');
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }

    // Save Excel file
    const timestamp = Date.now();
    const filename = `test-ov-simple-${timestamp}.xlsx`;
    const filepath = path.join(testDataDir, filename);

    await workbook.xlsx.writeFile(filepath);

    console.log('✅ Excel file generated successfully!\n');
    console.log(`📁 File location: ${filepath}\n`);
    console.log('📊 Test Scenarios:\n');

    testRows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.scenario}`);
      console.log(`   Matricule: ${row.matricule} | Montant: ${row.montant.toFixed(3)} TND`);
      console.log(`   Expected: ${row.expected}\n`);
    });

    console.log('📋 Reference Data (from existing OVs):\n');
    console.log(`Row 1: ${item1.adherent.matricule} - ${item1.montant.toFixed(3)} TND in OV ${existingOVs[0].reference}`);
    console.log(`Row 2: ${item2.adherent.matricule} - ${item2.montant.toFixed(3)} TND in OV ${existingOVs[0].reference}`);
    console.log(`Row 3: ${item3.adherent.matricule} - Original: ${item3.montant.toFixed(3)} TND, Test: ${(item3.montant + 100.5).toFixed(3)} TND`);
    console.log(`Row 4: ${item4.adherent.matricule} - ${item4.montant.toFixed(3)} TND in OV ${existingOVs[0].reference}`);
    console.log(`Row 5: 999999 - New matricule (not in DB)`);
    console.log(`Row 6: ${items[4]?.adherent.matricule || item1.adherent.matricule} - New amount: 999.999 TND\n`);

    console.log('🎯 Next Steps:\n');
    console.log('1. Upload this Excel file to the Finance module');
    console.log('2. Select client: BTK');
    console.log('3. Observe the duplicate detection warnings');
    console.log('4. Rows 1, 2, 4 should show 🔴 CRITICAL DUPLICATE with red highlighting');
    console.log('5. Rows 3, 6 should show ⚠️ normal duplicate warnings');
    console.log('6. Row 5 should show ❌ adherent not found error\n');

    console.log('✅ Script completed successfully');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

generateSimpleTestOV();
