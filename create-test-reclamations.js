const XLSX = require('xlsx');
const fs = require('fs');

// Test data for reclamations
const testData = [
  {
    clientName: 'SAMPLE_CLIENT',
    type: 'REMBOURSEMENT',
    severity: 'HAUTE',
    description: 'Retard de remboursement pour les soins dentaires',
    department: 'RECLAMATIONS',
    assignedTo: 'Jean Dupont'
  },
  {
    clientName: 'SAMPLE_CLIENT',
    type: 'DELAI',
    severity: 'MOYENNE',
    description: 'Délai de traitement trop long pour le dossier médical',
    department: 'RECLAMATIONS',
    assignedTo: ''
  },
  {
    clientName: 'SAMPLE_CLIENT',
    type: 'QUALITE_SERVICE',
    severity: 'BASSE',
    description: 'Insatisfaction concernant l\'accueil téléphonique',
    department: 'RECLAMATIONS',
    assignedTo: 'Marie Martin'
  },
  {
    clientName: 'SAMPLE_CLIENT',
    type: 'ERREUR',
    severity: 'HAUTE',
    description: 'Erreur dans le calcul du remboursement optique',
    department: 'RECLAMATIONS',
    assignedTo: ''
  },
  {
    clientName: 'SAMPLE_CLIENT',
    type: 'AUTRE',
    severity: 'MOYENNE',
    description: 'Demande de modification des coordonnées bancaires',
    department: 'RECLAMATIONS',
    assignedTo: 'Pierre Durand'
  }
];

// Create workbook and worksheet
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(testData);

// Add the worksheet to workbook
XLSX.utils.book_append_sheet(wb, ws, 'Reclamations');

// Write the file
XLSX.writeFile(wb, 'test-reclamations-import.xlsx');

console.log('✅ Fichier Excel créé: test-reclamations-import.xlsx');
console.log('📋 Contenu:');
console.log('- 5 réclamations de test');
console.log('- Client: SAMPLE_CLIENT');
console.log('- Types: REMBOURSEMENT, DELAI, QUALITE_SERVICE, ERREUR, AUTRE');
console.log('- Gravités: HAUTE, MOYENNE, BASSE');
console.log('- Certaines avec assignation, d\'autres sans');
console.log('\n🚀 Utilisez ce fichier pour tester l\'import Excel dans l\'application!');