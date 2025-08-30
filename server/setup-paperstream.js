const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up PaperStream integration...');

// Create required directory structure
const directories = [
  'paperstream-input',
  'paperstream-processed',
  'paperstream-processed/success',
  'paperstream-processed/quarantine',
  'paperstream-processed/quarantine/DUPLICATE',
  'paperstream-processed/quarantine/NO_BORDEREAU_MATCH',
  'paperstream-processed/quarantine/PROCESSING_ERROR',
  'paperstream-processed/quarantine/INVALID_BATCH',
  'paperstream-processed/errors',
  'paperstream-processed/errors/FILE_NOT_FOUND',
  'paperstream-processed/errors/PERMISSION_DENIED',
  'paperstream-processed/errors/CORRUPT_PDF',
  'paperstream-processed/errors/INVALID_TIFF',
  'paperstream-processed/errors/OCR_FAILED',
  'paperstream-processed/errors/NO_BORDEREAU_REFERENCE',
  'uploads/paperstream'
];

directories.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  } else {
    console.log(`📁 Directory exists: ${dir}`);
  }
});

// Create sample PaperStream batch structure for testing
const sampleBatchDir = path.join(__dirname, 'paperstream-input', 'SAMPLE_CLIENT', '2025-01-30', 'BATCH_001');
if (!fs.existsSync(sampleBatchDir)) {
  fs.mkdirSync(sampleBatchDir, { recursive: true });
  
  // Create sample index.xml
  const sampleXML = `<?xml version="1.0" encoding="UTF-8"?>
<PaperStreamBatch>
  <BatchID>BATCH_001</BatchID>
  <OperatorID>SCAN_OPERATOR_01</OperatorID>
  <ScannerModel>fi-7600</ScannerModel>
  <Timestamp>2025-01-30T10:30:00Z</Timestamp>
  <Files>
    <File>
      <FileName>scan_SAMPLE_CLIENT_BORD-2025-001_BATCH_001_p001.pdf</FileName>
      <PageCount>3</PageCount>
      <Resolution>300</Resolution>
      <ColorMode>color</ColorMode>
      <Barcodes>
        <Barcode>
          <Value>BORD-2025-001</Value>
        </Barcode>
      </Barcodes>
      <ImprinterIDs>
        <ID>IMP_001_001</ID>
        <ID>IMP_001_002</ID>
        <ID>IMP_001_003</ID>
      </ImprinterIDs>
    </File>
  </Files>
</PaperStreamBatch>`;
  
  fs.writeFileSync(path.join(sampleBatchDir, 'index.xml'), sampleXML);
  console.log('📄 Created sample batch XML');
}

// Create .env template for PaperStream configuration
const envTemplate = `
# PaperStream Integration Configuration
PAPERSTREAM_WATCH_FOLDER=./paperstream-input
PAPERSTREAM_PROCESSED_FOLDER=./paperstream-processed
PAPERSTREAM_BATCH_TIMEOUT=5000
PAPERSTREAM_AUTO_PROCESS=true
PAPERSTREAM_ENABLE_IMPRINTER=true
PAPERSTREAM_DEFAULT_SCANNER=fi-7600
`;

const envPath = path.join(__dirname, '.env.paperstream');
if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, envTemplate);
  console.log('⚙️ Created PaperStream environment template');
}

// Create README for PaperStream setup
const readmeContent = `# PaperStream Integration Setup

## Directory Structure

\`\`\`
paperstream-input/           # PaperStream export folder
├── <clientCode>/            # Client-specific folders
│   └── <YYYY-MM-DD>/       # Date-based organization
│       └── <batchID>/      # Batch folders
│           ├── index.xml   # Batch metadata
│           ├── *.pdf       # Scanned documents
│           ├── *.tiff      # Alternative format
│           └── *.txt       # OCR text files

paperstream-processed/       # Processed files
├── success/                # Successfully processed batches
├── quarantine/             # Quarantined files by error type
└── errors/                 # Error files by category
\`\`\`

## Expected File Naming Convention

- Documents: \`scan_<client>_<bordereauRef>_<batchID>_p<pageNum>.<ext>\`
- OCR files: \`scan_<client>_<bordereauRef>_<batchID>_ocr.txt\`
- Index files: \`index.xml\` or \`index.csv\`

## XML Metadata Format

\`\`\`xml
<?xml version="1.0" encoding="UTF-8"?>
<PaperStreamBatch>
  <BatchID>BATCH_001</BatchID>
  <OperatorID>SCAN_OPERATOR_01</OperatorID>
  <ScannerModel>fi-7600</ScannerModel>
  <Timestamp>2025-01-30T10:30:00Z</Timestamp>
  <Files>
    <File>
      <FileName>document.pdf</FileName>
      <PageCount>3</PageCount>
      <Resolution>300</Resolution>
      <ColorMode>color</ColorMode>
      <Barcodes>
        <Barcode><Value>BORD-2025-001</Value></Barcode>
      </Barcodes>
      <ImprinterIDs>
        <ID>IMP_001_001</ID>
      </ImprinterIDs>
    </File>
  </Files>
</PaperStreamBatch>
\`\`\`

## Integration Features

✅ **Implemented:**
- Batch folder monitoring with chokidar
- XML/CSV metadata parsing
- Barcode extraction and bordereau auto-linking
- Duplicate detection (hash + barcode + pageCount + batchId)
- Error categorization and quarantine
- Imprinter ID capture and storage
- Audit logging with full traceability
- Workflow integration (BO → SCAN → GED)

## Database Fields Added

- \`batchId\`: PaperStream batch identifier
- \`barcodeValues\`: Extracted barcodes for auto-linking
- \`pageCount\`, \`resolution\`, \`colorMode\`: Scan metadata
- \`operatorId\`: Who performed the scan
- \`scannerModel\`: Scanner used (fi-7600)
- \`imprinterIds\`: Physical-digital traceability
- \`ingestStatus\`, \`ingestTimestamp\`: Processing status

## Testing

1. Place a batch folder in \`paperstream-input/\`
2. Ensure it contains both documents and \`index.xml\`
3. Watch server logs for processing status
4. Check \`paperstream-processed/\` for results
`;

fs.writeFileSync(path.join(__dirname, 'PAPERSTREAM_README.md'), readmeContent);
console.log('📚 Created PaperStream documentation');

console.log('\n🎉 PaperStream integration setup complete!');
console.log('\n📋 Next steps:');
console.log('1. Run database migration: npx prisma db push');
console.log('2. Install dependencies: node install-dependencies.js');
console.log('3. Restart the server to activate PaperStream services');
console.log('4. Test with sample batch in paperstream-input/SAMPLE_CLIENT/');