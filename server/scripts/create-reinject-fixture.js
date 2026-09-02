const { PrismaClient } = require('@prisma/client');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const reference = process.argv[2] || 'OV-2026-0010';
const outputDir = path.join(process.cwd(), 'exports', 'finance-reinject');

async function main() {
  const ov = await prisma.ordreVirement.findUnique({
    where: { reference },
    include: {
      client: true,
      contract: { include: { compagnieAssurance: true } },
      bordereau: {
        include: {
          client: true,
          contract: { include: { compagnieAssurance: true } }
        }
      },
      donneurOrdre: true,
      items: {
        include: { adherent: true },
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!ov) throw new Error(`OV introuvable: ${reference}`);
  if (ov.etatVirement !== 'REJETE' && ov.etatVirement !== 'VIREMENT_NON_VALIDE') {
    throw new Error(`OV ${reference} doit être REJETE ou VIREMENT_NON_VALIDE (actuel: ${ov.etatVirement})`);
  }
  if (ov.items.length === 0) {
    throw new Error(`OV ${reference} ne contient aucun VirementItem; impossible de créer un Excel fidèle.`);
  }

  const client = ov.client || ov.bordereau?.client;
  const contract = ov.contract || ov.bordereau?.contract;
  const rows = ov.items.map(item => ({
    Matricule: item.adherent.matricule,
    Nom: item.adherent.nom,
    Prenom: item.adherent.prenom,
    RIB: String(item.adherent.rib),
    Montant: item.montant,
    Societe: client?.name || ov.clientName || ''
  }));

  fs.mkdirSync(outputDir, { recursive: true });
  const baseName = `${reference.replace(/[^A-Za-z0-9_-]/g, '_')}-reinject`;
  const snapshotPath = path.join(outputDir, `${baseName}.json`);
  const workbookPath = path.join(outputDir, `${baseName}.xlsx`);

  const snapshot = {
    generatedAt: new Date().toISOString(),
    ov: {
      id: ov.id,
      reference: ov.reference,
      status: ov.etatVirement,
      amount: ov.montantTotal,
      declaredBeneficiaries: ov.nombreAdherents,
      itemCount: ov.items.length,
      clientId: ov.clientId || ov.bordereau?.clientId || null,
      clientName: client?.name || ov.clientName || null,
      contractId: ov.contractId || ov.bordereau?.contractId || null,
      contractCode: contract?.codeAssure || null,
      insurance: contract?.compagnieAssurance?.nom || null,
      donneurOrdre: ov.donneurOrdre?.nom || null,
      bordereauId: ov.bordereauId || null,
      bordereauReference: ov.bordereau?.reference || null,
      commentaire: ov.commentaire,
      motifObservation: ov.motifObservation
    },
    items: rows
  };
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf8');

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ARS Finance System';
  const sheet = workbook.addWorksheet('Réinjection OV');
  const headers = ['Matricule', 'Nom', 'Prenom', 'RIB', 'Montant', 'Societe'];
  sheet.columns = headers.map(header => ({ header, key: header, width: header === 'RIB' ? 24 : 22 }));
  sheet.getRow(1).font = { bold: true };
  sheet.getColumn('RIB').numFmt = '@';
  sheet.getColumn('Montant').numFmt = '#,##0.000';

  rows.forEach(row => {
    const excelRow = sheet.addRow(row);
    excelRow.getCell('RIB').value = { text: row.RIB };
    excelRow.getCell('RIB').numFmt = '@';
  });

  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = { from: 'A1', to: `F${rows.length + 1}` };
  await workbook.xlsx.writeFile(workbookPath);

  console.log(JSON.stringify({
    success: true,
    reference: ov.reference,
    status: ov.etatVirement,
    amount: ov.montantTotal,
    itemCount: rows.length,
    totalExcelAmount: rows.reduce((sum, row) => sum + row.Montant, 0),
    client: client?.name || ov.clientName || null,
    snapshotPath,
    workbookPath
  }, null, 2));
}

main()
  .catch(error => {
    console.error(`Erreur: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
