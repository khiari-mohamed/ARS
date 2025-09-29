const XLSX = require('xlsx');
const fs = require('fs');

// Test data for reclamations - using existing client names
const testData = [
  {
    clientName: 'MAGHREBIA VIE',
    type: 'REMBOURSEMENT',
    severity: 'HAUTE',
    description: 'Retard de remboursement pour les soins dentaires',
    department: 'RECLAMATIONS',
    assignedTo: ''
  },
  {
    clientName: 'Test Client ARS',
    type: 'DELAI',
    severity: 'MOYENNE',
    description: 'Délai de traitement trop long pour le dossier médical',
    department: 'RECLAMATIONS',
    assignedTo: ''
  },
  {
    clientName: 'Société Beta',
    type: 'QUALITE_SERVICE',
    severity: 'BASSE',
    description: 'Insatisfaction concernant l\'accueil téléphonique',
    department: 'RECLAMATIONS',
    assignedTo: ''
  },
  {
    clientName: 'MAGHREBIA VIE',
    type: 'ERREUR',
    severity: 'HAUTE',
    description: 'Erreur dans le calcul du remboursement optique',
    department: 'RECLAMATIONS',
    assignedTo: ''
  },
  {
    clientName: 'Test Client ARS',
    type: 'AUTRE',
    severity: 'MOYENNE',
    description: 'Demande de modification des coordonnées bancaires',
    department: 'RECLAMATIONS',
    assignedTo: ''
  }
];

// Create workbook and worksheet
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(testData);

// Add the worksheet to workbook
XLSX.utils.book_append_sheet(wb, ws, 'Reclamations');

// Write the file
XLSX.writeFile(wb, 'import-reclamations-bulk.xlsx');

console.log('✅ Fichier Excel créé: import-reclamations-bulk.xlsx');
console.log('📋 Contenu:');
console.log('- 5 réclamations de test');
console.log('- Clients: MAGHREBIA VIE, Test Client ARS, Société Beta');
console.log('- Types: REMBOURSEMENT, DELAI, QUALITE_SERVICE, ERREUR, AUTRE');
console.log('- Gravités: HAUTE, MOYENNE, BASSE');
console.log('- Certaines avec assignation, d\'autres sans');
console.log('\n🚀 Utilisez import-reclamations-bulk.xlsx pour tester l\'import Excel!');