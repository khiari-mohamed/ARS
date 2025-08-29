const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTemplateSchema() {
  try {
    console.log('🔍 Checking Template Table Schema...\n');

    // Try to get table info using raw SQL
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'Template'
      ORDER BY ordinal_position;
    `;

    console.log('📋 TEMPLATE TABLE COLUMNS:');
    result.forEach((column, index) => {
      console.log(`  ${index + 1}. ${column.column_name} (${column.data_type}) - ${column.is_nullable === 'YES' ? 'Nullable' : 'Not Null'}`);
    });

    // Try to get a sample template
    console.log('\n📄 SAMPLE TEMPLATE:');
    const sampleTemplate = await prisma.template.findFirst();
    if (sampleTemplate) {
      console.log('Sample template structure:', Object.keys(sampleTemplate));
      console.log('Sample template data:', sampleTemplate);
    } else {
      console.log('No templates found in database');
    }

  } catch (error) {
    console.error('❌ Error checking template schema:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTemplateSchema();