const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

// ⚠️ Target folder (absolute Windows path)
const OUTPUT_DIR = 'C:\\Users\\LENOVO\\Desktop\\test_ars';

// Create folder if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Helper to generate random text length
function generateRandomText(repeatCount) {
  const baseText =
    'This is a test PDF file generated for ARS upload and stress testing. ';
  return baseText.repeat(repeatCount);
}

for (let i = 1; i <= 100; i++) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const filePath = path.join(OUTPUT_DIR, `fi_${i}.pdf`);

  doc.pipe(fs.createWriteStream(filePath));

  doc
    .fontSize(16)
    .text(`Bordereau BS ${i}`, { align: 'center' })
    .moveDown();

  // 🔀 Random size control
  // Between ~10 KB and ~500 KB depending on repetition
  const randomRepeat = Math.floor(Math.random() * 200) + 20;

  doc
    .fontSize(12)
    .text(`PDF Number: ${i}`)
    .moveDown()
    .text(generateRandomText(randomRepeat));

  doc.end();

  console.log(`✅ Created fi_${i}.pdf (random size)`);
}

console.log('🎉 100 random-size PDFs generated successfully.');
