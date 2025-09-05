const { PrismaClient } = require('@prisma/client');

async function checkTables() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking ARS Database Tables...\n');
    
    // Get all tables
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name != '_prisma_migrations'
      ORDER BY table_name
    `;
    
    console.log(`✅ Total Tables Found: ${tables.length}\n`);
    console.log('📋 Table List:');
    console.log('================');
    
    tables.forEach((table, index) => {
      console.log(`${(index + 1).toString().padStart(2, '0')}. ${table.table_name}`);
    });
    
    console.log('\n🎯 Expected: 42 tables');
    console.log(`🔢 Actual: ${tables.length} tables`);
    
    if (tables.length === 42) {
      console.log('✅ SUCCESS: All tables created correctly!');
    } else {
      console.log('⚠️  WARNING: Table count mismatch!');
    }
    
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();