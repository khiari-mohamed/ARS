const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabaseSchema() {
  console.log('🔍 Checking Database Schema...\n');
  
  try {
    // Query to get all columns from Bordereau table
    const bordereauColumns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'Bordereau'
      ORDER BY ordinal_position;
    `;
    
    console.log('📊 Bordereau table columns in database:');
    console.log('=====================================');
    bordereauColumns.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Check if 'colonne' exists
    const hasColonne = bordereauColumns.some(col => col.column_name.toLowerCase() === 'colonne');
    console.log('\n❓ Does "colonne" column exist?', hasColonne ? '✅ YES' : '❌ NO');
    
    // Get all table names
    console.log('\n📋 All tables in database:');
    console.log('==========================');
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    tables.forEach(t => console.log(`  - ${t.table_name}`));
    
    console.log('\n✅ Database schema check complete!');
  } catch (error) {
    console.error('❌ Error checking database schema:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseSchema();
