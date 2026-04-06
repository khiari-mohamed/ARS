const XLSX = require('xlsx');
const path = require('path');

// EXACT duplicate RIBs from your data
const duplicateRibs = [
  {
    matricule: '105934',
    societe: 'HPE',
    nom: 'LAAMIRI',
    prenom: 'MAISSA',
    rib: '08208000000000000000',
    codeAssure: '4103',
    numeroContrat: 'A70240017',
    assurance: 'HPE',
    statut: 'ACTIF'
  },
  {
    matricule: '105934',
    societe: 'FIELDCORE',
    nom: 'LAAMIRI',
    prenom: 'MAISSA',
    rib: '08208000000000000000',
    codeAssure: '4103',
    numeroContrat: 'A70240017',
    assurance: 'FIELDCORE',
    statut: 'ACTIF'
  },
  {
    matricule: '13542',
    societe: 'PGH & FILIALES',
    nom: 'LAKHNACH',
    prenom: 'IBTISSEM',
    rib: '11002003113801378869',
    codeAssure: '4103',
    numeroContrat: 'A70240017',
    assurance: 'PGH & FILIALES',
    statut: 'ACTIF'
  },
  {
    matricule: '13542',
    societe: 'FIELDCORE',
    nom: 'LAKHNACH',
    prenom: 'IBTISSEM',
    rib: '11002003113801378869',
    codeAssure: '4103',
    numeroContrat: 'A70240017',
    assurance: 'FIELDCORE',
    statut: 'ACTIF'
  },
  {
    matricule: '13542',
    societe: 'HPE',
    nom: 'LAKHNACH',
    prenom: 'IBTISSEM',
    rib: '11002003113801378869',
    codeAssure: '4103',
    numeroContrat: 'A70240017',
    assurance: 'HPE',
    statut: 'ACTIF'
  },
  {
    matricule: '555077',
    societe: 'HPE',
    nom: 'Tunisia',
    prenom: 'TechDistrib',
    rib: '08208000000000000000',
    codeAssure: '4103',
    numeroContrat: 'A70240017',
    assurance: 'STAR ASSURANCES',
    statut: 'ACTIF'
  },
  {
    matricule: '66759',
    societe: 'FIELDCORE',
    nom: 'HSSAINIA',
    prenom: 'HANEN',
    rib: '17002000000362000000',
    codeAssure: '4103',
    numeroContrat: 'A70240017',
    assurance: 'FIELDCORE',
    statut: 'ACTIF'
  },
  {
    matricule: '66759',
    societe: 'HPE',
    nom: 'HSSAINIA',
    prenom: 'HANEN',
    rib: '17002000000362000000',
    codeAssure: '4103',
    numeroContrat: 'A70240017',
    assurance: 'HPE',
    statut: 'ACTIF'
  },
  {
    matricule: '99901',
    societe: 'FIELDCORE',
    nom: 'FATNASSI',
    prenom: 'MOHAMED',
    rib: '17002000000287400000',
    codeAssure: '4103',
    numeroContrat: 'A70240017',
    assurance: 'FIELDCORE',
    statut: 'ACTIF'
  },
  {
    matricule: '99901',
    societe: 'HPE',
    nom: 'FATNASSI',
    prenom: 'MOHAMED',
    rib: '17002000000287400000',
    codeAssure: '4103',
    numeroContrat: 'A70240017',
    assurance: 'HPE',
    statut: 'ACTIF'
  }
];

// Generate NEW valid adherents (NO duplicates)
const validAdherents = [
  {
    matricule: 'TEST001',
    societe: 'PGH & FILIALES',
    nom: 'AYARI',
    prenom: 'AHMED',
    rib: '12345678901234567890',
    codeAssure: '4103',
    numeroContrat: 'A70240017',
    assurance: 'PGH & FILIALES',
    statut: 'ACTIF'
  },
  {
    matricule: 'TEST002',
    societe: 'HPE',
    nom: 'BEN SALAH',
    prenom: 'FATMA',
    rib: '09876543210987654321',
    codeAssure: '4103',
    numeroContrat: 'A70240017',
    assurance: 'HPE',
    statut: 'ACTIF'
  },
  {
    matricule: 'TEST003',
    societe: 'FIELDCORE',
    nom: 'TRABELSI',
    prenom: 'MOHAMED',
    rib: '11111111111111111111',
    codeAssure: '4103',
    numeroContrat: 'A70240017',
    assurance: 'FIELDCORE',
    statut: 'ACTIF'
  },
  {
    matricule: 'TEST004',
    societe: 'PGH & FILIALES',
    nom: 'JENDOUBI',
    prenom: 'SIWAR',
    rib: '22222222222222222222',
    codeAssure: '4103',
    numeroContrat: 'A70240017',
    assurance: 'PGH & FILIALES',
    statut: 'ACTIF'
  },
  {
    matricule: 'TEST005',
    societe: 'HPE',
    nom: 'KHALOULI',
    prenom: 'YOUSSEF',
    rib: '33333333333333333333',
    codeAssure: '4103',
    numeroContrat: 'A70240017',
    assurance: 'HPE',
    statut: 'ACTIF'
  }
];

// Combine: 5 valid + 10 duplicates = 15 total
const allAdherents = [...validAdherents, ...duplicateRibs];

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
const filename = `test_bulk_import_${new Date().toISOString().split('T')[0]}.xlsx`;
const filepath = path.join(__dirname, filename);
XLSX.writeFile(workbook, filepath);

console.log('✅ Excel file generated successfully!');
console.log('📁 File path:', filepath);
console.log('📊 Summary:');
console.log(`   - Total adherents: ${allAdherents.length}`);
console.log(`   - Valid (new): ${validAdherents.length}`);
console.log(`   - Duplicates (should be blocked): ${duplicateRibs.length}`);
console.log('');
console.log('🎯 Expected Result:');
console.log(`   ✅ ${validAdherents.length} imported successfully`);
console.log(`   ❌ ${duplicateRibs.length} blocked (duplicate RIBs)`);
console.log(`   🔔 Notification sent to SUPER_ADMIN + RESPONSABLE_DEPARTEMENT`);
console.log('');
console.log('📋 Duplicate RIBs to watch for:');
console.log('   - 08208000000000000000 (3 times)');
console.log('   - 11002003113801378869 (3 times)');
console.log('   - 17002000000362000000 (2 times)');
console.log('   - 17002000000287400000 (2 times)');
