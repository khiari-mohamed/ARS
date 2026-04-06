import { PrismaClient } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function generateTestOVDuplicates() {
  console.log('🔍 Starting duplicate test OV generation...\n');

  try {
    // ─── 1. Find BTK client ───────────────────────────────────────────────────
    const client = await prisma.client.findFirst({
      where: { name: { contains: 'BTK', mode: 'insensitive' } }
    });

    if (!client) {
      console.log('❌ BTK client not found. Available clients:');
      const all = await prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
      all.forEach(c => console.log(`  - ${c.name} (${c.id})`));
      return;
    }

    console.log(`✅ BTK client: "${client.name}" (ID: ${client.id})\n`);

    // ─── 2. Print ALL adherents for BTK ──────────────────────────────────────
    const allAdherents = await prisma.adherent.findMany({
      where: { clientId: client.id },
      orderBy: { matricule: 'asc' }
    });

    console.log(`👥 BTK adherents in DB: ${allAdherents.length}`);
    if (allAdherents.length === 0) {
      console.log('❌ No adherents found for BTK. Please add adherents first.');
      return;
    }
    allAdherents.forEach(a =>
      console.log(`  Matricule: ${a.matricule} | ${a.nom} ${a.prenom} | RIB: ${a.rib} | Statut: ${a.statut}`)
    );
    console.log();

    // ─── 3. Print ALL existing OV items for BTK ──────────────────────────────
    const existingOVItems = await prisma.virementItem.findMany({
      where: { adherent: { clientId: client.id } },
      include: {
        adherent: { include: { client: true } },
        ordreVirement: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📂 Existing OV items for BTK: ${existingOVItems.length}`);
    if (existingOVItems.length === 0) {
      console.log('❌ No existing OV items for BTK. Cannot build duplicate scenarios.');
      return;
    }
    existingOVItems.forEach((item, i) =>
      console.log(`  [${i}] Matricule: ${item.adherent.matricule} | Montant: ${item.montant.toFixed(3)} TND | OV: ${item.ordreVirement.reference}`)
    );
    console.log();

    // ─── 4. Pick 6 distinct adherents from existing OV items ─────────────────
    // Use the latest OV as reference — pick items from it for scenarios
    const latestOVRef = existingOVItems[0].ordreVirement.reference;
    const latestOVItems = existingOVItems.filter(i => i.ordreVirement.reference === latestOVRef);

    // Need 6 distinct adherents from the latest OV
    const seen = new Set<string>();
    const picked: typeof existingOVItems = [];
    for (const i of latestOVItems) {
      if (!seen.has(i.adherent.matricule)) {
        seen.add(i.adherent.matricule);
        picked.push(i);
      }
      if (picked.length === 6) break;
    }

    if (picked.length < 4) {
      console.log('❌ Need at least 4 distinct adherents in the latest OV.');
      return;
    }

    const [p1, p2, p3, p4, p5, p6] = picked;

    console.log('🎯 Scenario reference items:');
    console.log(`  Row 1 & 5 (dup matricule): ${p1.adherent.matricule} | ${p1.montant.toFixed(3)} TND`);
    console.log(`  Row 2 (dup amount):        ${p2.adherent.matricule} | ${p2.montant.toFixed(3)} TND`);
    console.log(`  Row 3 (critical dup):      ${p3.adherent.matricule} | ${p3.montant.toFixed(3)} TND`);
    console.log(`  Row 4 (new amount):        ${p4.adherent.matricule} | ${p4.montant.toFixed(3)} TND`);
    console.log();

    // ─── 5. Build 6 test rows using only real BTK adherents ──────────────────
    const testRows = [
      {
        scenario: '1. DUPLICATE MATRICULE ONLY (different amount)',
        matricule: p1.adherent.matricule,
        nom: p1.adherent.nom,
        prenom: p1.adherent.prenom,
        rib: p1.adherent.rib,
        montant: parseFloat((p1.montant + 50.5).toFixed(3)),
        societe: client.name,
        expectedWarning: '⚠️ Matricule déjà utilisé (different amount)',
        criticalDuplicate: false
      },
      {
        scenario: '2. DUPLICATE AMOUNT ONLY (different matricule)',
        matricule: p2.adherent.matricule,
        nom: p2.adherent.nom,
        prenom: p2.adherent.prenom,
        rib: p2.adherent.rib,
        montant: p1.montant, // same amount as row 1's original — different matricule
        societe: client.name,
        expectedWarning: 'No warning (different matricule, same amount as another)',
        criticalDuplicate: false
      },
      {
        scenario: '3. 🔴 CRITICAL DUPLICATE (same matricule + same amount)',
        matricule: p3.adherent.matricule,
        nom: p3.adherent.nom,
        prenom: p3.adherent.prenom,
        rib: p3.adherent.rib,
        montant: p3.montant, // exact match
        societe: client.name,
        expectedWarning: '🔴 DOUBLON CRITIQUE',
        criticalDuplicate: true
      },
      {
        scenario: '4. EXISTING MATRICULE NEW AMOUNT',
        matricule: p4.adherent.matricule,
        nom: p4.adherent.nom,
        prenom: p4.adherent.prenom,
        rib: p4.adherent.rib,
        montant: parseFloat((p4.montant + 111.111).toFixed(3)),
        societe: client.name,
        expectedWarning: '⚠️ Matricule déjà utilisé (different amount)',
        criticalDuplicate: false
      },
      {
        scenario: '5. DUPLICATE MATRICULE SAME AMOUNT AS ROW 1 ORIGINAL',
        matricule: p1.adherent.matricule,
        nom: p1.adherent.nom,
        prenom: p1.adherent.prenom,
        rib: p1.adherent.rib,
        montant: p1.montant, // exact match → critical
        societe: client.name,
        expectedWarning: '🔴 DOUBLON CRITIQUE',
        criticalDuplicate: true
      },
      {
        scenario: '6. EXISTING MATRICULE DIFFERENT AMOUNT',
        matricule: (p6 || p5 || p4).adherent.matricule,
        nom: (p6 || p5 || p4).adherent.nom,
        prenom: (p6 || p5 || p4).adherent.prenom,
        rib: (p6 || p5 || p4).adherent.rib,
        montant: parseFloat(((p6 || p5 || p4).montant + 222.222).toFixed(3)),
        societe: client.name,
        expectedWarning: '⚠️ Matricule déjà utilisé (different amount)',
        criticalDuplicate: false
      }
    ];

    // ─── 7. Generate Excel ────────────────────────────────────────────────────
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Test OV Duplicates');

    worksheet.columns = [
      { header: 'Matricule', key: 'matricule', width: 15 },
      { header: 'Nom', key: 'nom', width: 20 },
      { header: 'Prénom', key: 'prenom', width: 20 },
      { header: 'RIB', key: 'rib', width: 25, style: { numFmt: '@' } },
      { header: 'Montant', key: 'montant', width: 15 },
      { header: 'Société', key: 'societe', width: 25 }
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    testRows.forEach(row => {
      const excelRow = worksheet.addRow({
        matricule: row.matricule,
        nom: row.nom,
        prenom: row.prenom,
        rib: row.rib,
        montant: row.montant,
        societe: row.societe
      });
      // Force RIB cell to text so Excel doesn't convert to scientific notation
      const ribCell = excelRow.getCell('rib');
      ribCell.value = row.rib;
      ribCell.numFmt = '@';

      if (row.criticalDuplicate) {
        excelRow.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } };
          cell.font = { bold: true, color: { argb: 'FFCC0000' } };
        });
      }
    });

    const summarySheet = workbook.addWorksheet('Test Scenarios');
    summarySheet.columns = [
      { header: 'Row', key: 'row', width: 5 },
      { header: 'Scenario', key: 'scenario', width: 50 },
      { header: 'Expected Warning', key: 'warning', width: 50 },
      { header: 'Critical?', key: 'critical', width: 10 }
    ];
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } };

    testRows.forEach((row, index) => {
      summarySheet.addRow({
        row: index + 2,
        scenario: row.scenario,
        warning: row.expectedWarning,
        critical: row.criticalDuplicate ? 'YES 🔴' : 'NO'
      });
    });

    const outputDir = path.join(process.cwd(), 'test-data');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const filename = `test-ov-duplicates-${Date.now()}.xlsx`;
    const filepath = path.join(outputDir, filename);
    await workbook.xlsx.writeFile(filepath);

    console.log('✅ Excel file generated!\n');
    console.log('📁 File:', filepath);
    console.log('\n📊 Test Scenarios:\n');
    testRows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.scenario}`);
      console.log(`   Matricule: ${row.matricule} | Montant: ${row.montant.toFixed(3)} TND`);
      console.log(`   Expected: ${row.expectedWarning}`);
      console.log(`   Critical: ${row.criticalDuplicate ? '🔴 YES' : '✅ NO'}\n`);
    });

    console.log(`\n🎯 Upload to Finance module and select client: ${client.name}`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

generateTestOVDuplicates()
  .then(() => { console.log('✅ Done'); process.exit(0); })
  .catch(() => process.exit(1));
