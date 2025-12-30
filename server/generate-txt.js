#!/usr/bin/env node

/**
 * Standalone TXT Generator Script
 * Usage: node generate-txt.js
 */

const fs = require('fs');
const path = require('path');

// Sample data - modify as needed
const sampleData = {
  donneurOrdre: {
    nom: 'ARS TUNISIE',
    rib: '04001007404700411649', // Attijari RIB (starts with 04)
    formatTxtType: 'ATTIJARI'
  },
  virements: [
    { matricule: 'M001', nom: 'BENGAGI', prenom: 'ZIED', rib: '14043043100702168352', montant: 102.036, societe: 'FILIALES' },
    { matricule: 'M002', nom: 'SAIDANI', prenom: 'HICHEM', rib: '14015015100704939295', montant: 116.957, societe: 'FILIALES' },
    { matricule: 'M003', nom: 'NEFZI', prenom: 'MOHEB', rib: '08081023082003208516', montant: 65.5, societe: 'FILIALES' }
  ],
  dateCreation: new Date(),
  reference: 'VIR-TEST-001'
};

function formatDateAmen(date) {
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return year + month + day;
}

function generateAttijariTXT(data) {
  const lines = [];
  const dateStr = formatDateAmen(data.dateCreation);
  const numberOfOperations = data.virements.length;
  
  let totalAmountMillimes = 0;
  const detailLines = [];
  
  // Generate detail lines
  data.virements.forEach((virement, index) => {
    const montantMillimes = Math.round(virement.montant * 1000);
    totalAmountMillimes += montantMillimes;
    const codeBanqueBenef = virement.rib.substring(0, 2);
    
    let line = '';
    line += '110104   '; // Positions 1-9
    line += dateStr; // Positions 10-17
    line += '0001'; // Positions 18-21
    line += '2'; // Position 22
    line += '17880'; // Positions 23-27
    line += montantMillimes.toString().padStart(15, '0'); // Positions 28-42
    line += '0000000400'; // Positions 43-52
    line += data.donneurOrdre.rib; // Positions 53-72
    line += 'ARS EX  "AON TUNISIE S.A."    '; // Positions 73-102
    line += codeBanqueBenef; // Positions 103-104
    line += '   '; // Positions 105-107
    line += virement.rib; // Positions 108-127
    
    const benefName = `${virement.nom} ${virement.prenom}`
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, '')
      .substring(0, 30)
      .padEnd(30, ' ');
    line += benefName; // Positions 128-157
    
    line += '00000000000007100'; // Positions 158-174
    const counter = (636000 + index).toString().padStart(6, '0');
    line += counter; // Positions 175-180
    line += '000'; // Positions 181-183
    line += 'PGH20-20'; // Positions 184-191
    
    const companyRef = '25GAN FRIGAN                         ';
    line += companyRef.substring(0, 34); // Positions 192-225
    
    line += dateStr; // Positions 226-233
    line += '00000000010'; // Positions 234-244
    
    while (line.length < 280) {
      line += ' ';
    }
    
    if (line.length !== 280) {
      throw new Error(`Line ${index + 1} length error: ${line.length} instead of 280`);
    }
    
    detailLines.push(line);
  });
  
  // Generate header line
  let headerLine = '';
  headerLine += '110104   ';
  headerLine += dateStr;
  headerLine += '0001';
  headerLine += '1';
  headerLine += '17880';
  headerLine += totalAmountMillimes.toString().padStart(15, '0');
  headerLine += numberOfOperations.toString().padStart(10, '0');
  headerLine = headerLine.padEnd(280, ' ');
  
  if (headerLine.length !== 280) {
    throw new Error(`Header length error: ${headerLine.length} instead of 280`);
  }
  
  lines.push(headerLine);
  lines.push(...detailLines);
  
  return lines.join('\n');
}

// Main execution
try {
  console.log('🚀 Generating Attijari TXT file...\n');
  
  const txtContent = generateAttijariTXT(sampleData);
  
  // Create output directory
  const outputDir = path.join(__dirname, 'txt-output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Generate filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const filename = `OV_${sampleData.reference}_${timestamp}.txt`;
  const outputPath = path.join(outputDir, filename);
  
  // Write file
  fs.writeFileSync(outputPath, txtContent, 'utf-8');
  
  console.log('✅ TXT file generated successfully!');
  console.log(`📁 Location: ${outputPath}`);
  console.log(`📊 Total virements: ${sampleData.virements.length}`);
  console.log(`💰 Total amount: ${sampleData.virements.reduce((sum, v) => sum + v.montant, 0).toFixed(3)} TND`);
  console.log(`📏 File size: ${txtContent.length} bytes`);
  console.log(`📝 Lines: ${txtContent.split('\n').length}`);
  
  // Display first 3 lines as preview
  console.log('\n📄 Preview (first 3 lines):');
  txtContent.split('\n').slice(0, 3).forEach((line, i) => {
    console.log(`Line ${i + 1} (${line.length} chars): ${line.substring(0, 80)}...`);
  });
  
} catch (error) {
  console.error('❌ Error generating TXT file:', error.message);
  process.exit(1);
}
