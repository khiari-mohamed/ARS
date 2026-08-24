# PaperStream Integration Setup

## Directory Structure

```
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
```

## Expected File Naming Convention

- Documents: `scan_<client>_<bordereauRef>_<batchID>_p<pageNum>.<ext>`
- OCR files: `scan_<client>_<bordereauRef>_<batchID>_ocr.txt`
- Index files: `index.xml` or `index.csv`

## XML Metadata Format

```xml
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
```

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

- `batchId`: PaperStream batch identifier
- `barcodeValues`: Extracted barcodes for auto-linking
- `pageCount`, `resolution`, `colorMode`: Scan metadata
- `operatorId`: Who performed the scan
- `scannerModel`: Scanner used (fi-7600)
- `imprinterIds`: Physical-digital traceability
- `ingestStatus`, `ingestTimestamp`: Processing status

## Testing

1. Place a batch folder in `paperstream-input/`
2. Ensure it contains both documents and `index.xml`
3. Watch server logs for processing status
4. Check `paperstream-processed/` for results
