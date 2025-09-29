const ExcelJS = require('exceljs');
const path = require('path');

async function generateTestExcel() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Virements Test');

  // Add headers with RIB column
  worksheet.addRow(['Matricule', 'Nom', 'Prénom', 'Société', 'RIB', 'Montant']);

  // Add test data with REAL RIB numbers from TXT example
  const testData = [
    ['M001', 'BENGAGI', 'ZIED', 'ARS TUNISIE', '14043043100702168352', 102.036],
    ['M002', 'SAIDANI', 'Hichem', 'ARS TUNISIE', '14015015100704939295', 116.957],
    ['M003', 'NEFZI', 'MOHEB', 'ARS TUNISIE', '08081023082003208516', 65.500],
    ['M004', 'LTIFI', 'ADEL', 'ARS TUNISIE', '14067067100701418590', 30.000],
    ['M005', 'RAJHI', 'HAMZA', 'ARS TUNISIE', '14067067100700641135', 448.000],
    ['M006', 'ARIDHI', 'LATIFA', 'ARS TUNISIE', '07016007810558352528', 111.319],
    ['M007', 'EZZIDINI', 'KHALED', 'ARS TUNISIE', '07016007810582292128', 40.000],
    ['M008', 'OUHIBI', 'SAMEH', 'ARS TUNISIE', '14008008100709748250', 92.500],
    ['M009', 'CHALLAKH', 'MOHAMED', 'ARS TUNISIE', '07016007810581731953', 62.500],
    ['M010', 'MOHAMED', 'BEN MLOUKA', 'ARS TUNISIE', '08019011022001723056', 84.177],
    ['M011', 'RAJHI', 'RAOUF', 'ARS TUNISIE', '20032322220051647331', 1418.000],
    ['M012', 'AYMEN', 'ARBOUJ', 'ARS TUNISIE', '07077013510552050124', 40.000],
    ['M013', 'BEN SLIMENE', 'SOUFIENE', 'ARS TUNISIE', '17001000000089830627', 492.000],
    ['M014', 'KOUKI', 'HABIB', 'ARS TUNISIE', '08047020022002526737', 12.000],
    ['M015', 'MAROUENI', 'MOETAZ', 'ARS TUNISIE', '17206000000178121860', 27.000],
    ['M016', 'TOUNEKTI', 'ANIS', 'ARS TUNISIE', '07018008610554386262', 30.000],
    ['M017', 'OUESLATI', 'MAJED', 'ARS TUNISIE', '14207207100714066409', 40.000],
    ['M018', 'REBII', 'ABDSATAR', 'ARS TUNISIE', '17606000000210085633', 57.650],
    ['M019', 'BOUKHATMI', 'HAFEDH', 'ARS TUNISIE', '20024242220001496968', 60.000],
    ['M020', 'KOBTANE', 'ANIS', 'ARS TUNISIE', '25044000000121815088', 88.978]
  ];

  // Add data rows
  testData.forEach(row => {
    worksheet.addRow(row);
  });

  // Style the header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // Auto-fit columns
  worksheet.columns.forEach(column => {
    column.width = 15;
  });

  // Save the file
  const fileName = 'test-virements.xlsx';
  const filePath = path.join(__dirname, fileName);
  
  await workbook.xlsx.writeFile(filePath);
  
  console.log(`✅ Excel file generated successfully: ${filePath}`);
  console.log(`📊 Total records: ${testData.length}`);
  console.log(`💰 Total amount: ${testData.reduce((sum, row) => sum + row[5], 0).toFixed(2)} DT`);
  
  return filePath;
}

// Run the script
generateTestExcel().catch(console.error);