const fs = require('fs');
const path = require('path');

const pdfPath = path.join(__dirname, 'uploads', 'test-avenant-005.pdf');

console.log('🔍 Checking PDF file:', pdfPath);
console.log('📁 File exists:', fs.existsSync(pdfPath));

if (fs.existsSync(pdfPath)) {
  const stats = fs.statSync(pdfPath);
  console.log('📊 File size:', stats.size, 'bytes');
  
  // Read first few bytes to check if it's a valid PDF
  const buffer = fs.readFileSync(pdfPath);
  const header = buffer.toString('ascii', 0, 8);
  console.log('📄 File header:', header);
  console.log('✅ Is valid PDF:', header.startsWith('%PDF'));
  
  if (!header.startsWith('%PDF')) {
    console.log('❌ This is not a valid PDF file!');
    console.log('🔍 First 100 characters:', buffer.toString('ascii', 0, 100));
  }
} else {
  console.log('❌ File not found');
}