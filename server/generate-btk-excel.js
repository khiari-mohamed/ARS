// Generate Excel file from BTK OV data
const ExcelJS = require('exceljs');
const fs = require('fs');

async function generateExcel() {
  try {
    console.log('📦 Loading OV data...');
    const data = JSON.parse(fs.readFileSync('bordereau-export-BTK-BR-2026721437.json', 'utf8'));
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('OV BTK');
    
    // Add headers
    worksheet.columns = [
      { header: 'MATRICULE', key: 'matricule', width: 15 },
      { header: 'MONTANT', key: 'montant', width: 15 }
    ];
    
    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' }
    };
    
    // Add data rows
    const items = data.ordresVirement[0].items;
    console.log(`\n📊 Adding ${items.length} rows...`);
    
    items.forEach((item, index) => {
      worksheet.addRow({
        matricule: item.adherent.matricule,
        montant: item.montant
      });
      
      if ((index + 1) % 10 === 0) {
        console.log(`   ✅ Added ${index + 1}/${items.length} rows...`);
      }
    });
    
    // Add total row
    const totalRow = worksheet.addRow({
      matricule: 'TOTAL',
      montant: items.reduce((sum, item) => sum + item.montant, 0)
    });
    totalRow.font = { bold: true };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFF00' }
    };
    
    // Save file
    const filename = 'BTK-OV-Import.xlsx';
    await workbook.xlsx.writeFile(filename);
    
    console.log(`\n✅ Excel file created: ${filename}`);
    console.log(`\n📊 Summary:`);
    console.log(`   - Total rows: ${items.length}`);
    console.log(`   - Total amount: ${items.reduce((sum, item) => sum + item.montant, 0).toFixed(3)} TND`);
    console.log(`\n🎯 Now you can:`);
    console.log(`   1. Upload this Excel file in Finance module`);
    console.log(`   2. Select bordereau "BTK BR 2026721437"`);
    console.log(`   3. Generate PDF with exact prod data`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

generateExcel();
