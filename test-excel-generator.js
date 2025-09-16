const ExcelJS = require('exceljs');

async function generateTestExcel() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Test Data');

  // Add headers
  worksheet.addRow(['Matricule', 'Nom', 'Prénom', 'Société', 'Montant']);

  // Add test data that will work
  worksheet.addRow(['M001', 'Dupont', 'Jean', 'ARS TUNISIE', '150.50']);
  worksheet.addRow(['M002', 'Martin', 'Marie', 'ARS TUNISIE', '200.00']);
  worksheet.addRow(['M003', 'Bernard', 'Pierre', 'ARS TUNISIE', '175.25']);
  worksheet.addRow(['M004', 'Durand', 'Sophie', 'ARS TUNISIE', '300.00']);
  worksheet.addRow(['M005', 'Moreau', 'Paul', 'ARS TUNISIE', '125.75']);

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
  await workbook.xlsx.writeFile('d:\\ARS\\test-ov-data.xlsx');
  console.log('✅ Test Excel file created: d:\\ARS\\test-ov-data.xlsx');
  console.log('📊 Contains 5 test records with proper format');
  console.log('🎯 Upload this file to test OV generation');
}

generateTestExcel().catch(console.error);