const XLSX = require('xlsx');
const path = require('path');

// Generate 6 DUPLICATE RIBs (using existing RIBs from database)
const duplicateRibs = [];
const existingRibs = [
  '08208000000000000000', // MAISSA LAAMIRI
  '11002003113801378869', // IBTISSEM LAKHNACH
  '17002000000362000000', // HANEN HSSAINIA
  '17002000000287400000', // MOHAMED FATNASSI
  '08208000054004755351', // MAISSA LAAMIRI PGH
  '11002003113801378869'  // IBTISSEM LAKHNACH (repeat)
];

const societies = ['PGH & FILIALES', 'HPE', 'FIELDCORE'];
const firstNames = ['AHMED', 'FATMA', 'MOHAMED', 'SIWAR', 'YOUSSEF', 'AMIRA'];
const lastNames = ['AYARI', 'BEN SALAH', 'TRABELSI', 'JENDOUBI', 'KHALOULI', 'GHARBI'];

for (let i = 1; i <= 6; i++) {
  duplicateRibs.push({
    matricule: `RIBDUP${String(i).padStart(3, '0')}`,
    societe: societies[i % societies.length],
    nom: lastNames[i % lastNames.length],
    prenom: firstNames[i % firstNames.length],
    rib: existingRibs[i - 1], // Use existing RIBs
    codeAssure: '4103',
    numeroContrat: 'A70240017',
    assurance: societies[i % societies.length],
    statut: 'ACTIF'
  });
}

// Generate 4 DUPLICATE Matricules (using existing matricules from previous import)
const duplicateMatricules = [
  {
    matricule: 'NEWTEST001', // Already exists from previous import
    societe: 'HPE',
    nom: 'DUPLICATE',
    prenom: 'MATRICULE1',
    rib: '99999999999999999991',
    codeAssure: '4103',
    numeroContrat: 'A70240017',
    assurance: 'HPE',
    statut: 'ACTIF'
  },
  {
    matricule: 'NEWTEST002', // Already exists from previous import
    societe: 'FIELDCORE',
    nom: 'DUPLICATE',
    prenom: 'MATRICULE2',
    rib: '99999999999999999992',
    codeAssure: '4103',
    numeroContrat: 'A70240017',
    assurance: 'FIELDCORE',
    statut: 'ACTIF'
  },
  {
    matricule: 'NEWTEST003', // Already exists from previous import
    societe: 'PGH & FILIALES',
    nom: 'DUPLICATE',
    prenom: 'MATRICULE3',
    rib: '99999999999999999993',
    codeAssure: '4103',
    numeroContrat: 'A70240017',
    assurance: 'PGH & FILIALES',
    statut: 'ACTIF'
  },
  {
    matricule: 'NEWTEST004', // Already exists from previous import
    societe: 'HPE',
    nom: 'DUPLICATE',
    prenom: 'MATRICULE4',
    rib: '99999999999999999994',
    codeAssure: '4103',
    numeroContrat: 'A70240017',
    assurance: 'HPE',
    statut: 'ACTIF'
  }
];

// Generate 10 NEW valid adherents (unique RIBs and Matricules)
const validAdherents = [];
for (let i = 1; i <= 10; i++) {
  const ribNumber = 20000000000000000000n + BigInt(i * 1000);
  validAdherents.push({
    matricule: `VALID${String(i).padStart(3, '0')}`,
    societe: societies[i % societies.length],
    nom: lastNames[i % lastNames.length],
    prenom: firstNames[i % firstNames.length],
    rib: ribNumber.toString().substring(0, 20),
    codeAssure: '4103',
    numeroContrat: 'A70240017',
    assurance: societies[i % societies.length],
    statut: 'ACTIF'
  });
}

// Combine: 10 valid + 6 duplicate RIBs + 4 duplicate matricules = 20 total
const allAdherents = [...validAdherents, ...duplicateRibs, ...duplicateMatricules];

// Convert to Excel format (EXACT structure required)
const excelData = allAdherents.map(a => ({
  'Matricule': a.matricule,
  'Société': a.societe,
  'Nom': a.nom,
  'Prénom': a.prenom,
  'RIB': a.rib,
  'Code Assuré': a.codeAssure,
  'Numéro Contrat': a.numeroContrat,
  'Assurance': a.assurance,
  'Statut': a.statut
}));

// Create workbook
const worksheet = XLSX.utils.json_to_sheet(excelData);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Adhérents');

// Save file
const filename = `test_20_adherents_${new Date().toISOString().split('T')[0]}.xlsx`;
const filepath = path.join(__dirname, '..', filename);
XLSX.writeFile(workbook, filepath);

console.log('✅ Excel file generated successfully!');
console.log('📁 File path:', filepath);
console.log('📊 Summary:');
console.log(`   - Total adherents: ${allAdherents.length}`);
console.log(`   - Valid (new): ${validAdherents.length}`);
console.log(`   - Duplicate RIBs (should be blocked): ${duplicateRibs.length}`);
console.log(`   - Duplicate Matricules (should be rejected): ${duplicateMatricules.length}`);
console.log('');
console.log('🎯 Expected Result:');
console.log(`   ✅ ${validAdherents.length} imported successfully`);
console.log(`   ❌ ${duplicateRibs.length} blocked (duplicate RIBs) → Notification sent`);
console.log(`   ⚠️ ${duplicateMatricules.length} rejected (duplicate Matricules)`);
console.log('');
console.log('📋 Breakdown:');
console.log('   - VALID001-010: New unique RIBs and Matricules ✅');
console.log('   - RIBDUP001-006: New Matricules but EXISTING RIBs ❌');
console.log('   - NEWTEST001-004: EXISTING Matricules (from previous import) ⚠️');
