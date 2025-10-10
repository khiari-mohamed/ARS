const fs = require('fs');
const path = require('path');

function findPDFFiles(dir, results = []) {
  if (!fs.existsSync(dir)) {
    console.log(`Directory does not exist: ${dir}`);
    return results;
  }

  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findPDFFiles(filePath, results);
    } else if (file.endsWith('.pdf')) {
      results.push({
        name: file,
        fullPath: filePath,
        size: stat.size
      });
    }
  }
  
  return results;
}

console.log('🔍 Searching for PDF files in uploads directory...\n');

const uploadsDir = path.join(__dirname, 'uploads');
const pdfFiles = findPDFFiles(uploadsDir);

console.log(`📊 Found ${pdfFiles.length} PDF files:\n`);

// Filter for specific files we're looking for
const targetFiles = ['BS-5766762.pdf', 'br6.pdf', 'rapport_financier_2025-10-03.pdf'];

targetFiles.forEach(target => {
  console.log(`\n🔎 Looking for: ${target}`);
  const found = pdfFiles.filter(f => f.name.includes(target.replace('.pdf', '')));
  
  if (found.length > 0) {
    console.log(`✅ FOUND (${found.length} matches):`);
    found.forEach(f => {
      console.log(`   - ${f.fullPath}`);
      console.log(`     Size: ${(f.size / 1024).toFixed(2)} KB`);
    });
  } else {
    console.log(`❌ NOT FOUND`);
  }
});

console.log('\n\n📋 All PDF files in uploads:');
pdfFiles.forEach(f => {
  console.log(`   ${f.name} -> ${f.fullPath}`);
});
