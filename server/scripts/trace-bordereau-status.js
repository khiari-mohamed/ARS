const fs = require('fs');
const path = require('path');

// Search for all places where bordereau status is updated
const searchPatterns = [
  /statut.*VIREMENT/gi,
  /bordereau\.update.*statut/gi,
  /updateBordereauStatus/gi,
  /statut.*=.*['"]VIREMENT/gi,
  /prisma\.bordereau\.update/gi
];

const filesToSearch = [
  'src/finance/ordre-virement.service.ts',
  'src/finance/finance.controller.ts',
  'src/finance/finance.service.ts',
  'src/bordereaux/bordereaux.service.ts',
  'src/bordereaux/bordereaux.controller.ts'
];

console.log('🔍 TRACING BORDEREAU STATUS CHANGES...\n');

filesToSearch.forEach(file => {
  const fullPath = path.join(__dirname, file);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');
  
  console.log(`\n📄 Checking: ${file}`);
  console.log('='.repeat(80));
  
  searchPatterns.forEach(pattern => {
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        console.log(`\n🎯 Line ${index + 1}: ${pattern}`);
        console.log(`   ${line.trim()}`);
        
        // Show context (2 lines before and after)
        if (index > 0) console.log(`   ${index}: ${lines[index - 1].trim()}`);
        console.log(`>> ${index + 1}: ${line.trim()}`);
        if (index < lines.length - 1) console.log(`   ${index + 2}: ${lines[index + 1].trim()}`);
      }
    });
  });
});

console.log('\n\n✅ TRACE COMPLETE\n');
