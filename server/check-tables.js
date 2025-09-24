const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function checkTables() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking ARS Database Tables...\n');
    
    // Extract expected tables from Prisma schema
    const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    const expectedTables = schemaContent
      .match(/model\s+(\w+)\s*{/g)
      ?.map(match => match.replace(/model\s+(\w+)\s*{/, '$1'))
      .sort() || [];
    
    // Get actual tables from database
    const actualTablesResult = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name != '_prisma_migrations'
      ORDER BY table_name
    `;
    
    const actualTables = actualTablesResult
      .map(row => row.table_name)
      .filter(name => !name.startsWith('_') || name === '_prisma_migrations')
      .sort();
    
    console.log(`📊 Expected Tables: ${expectedTables.length}`);
    console.log(`📊 Actual Tables: ${actualTables.length}\n`);
    
    // Compare tables
    const missingTables = expectedTables.filter(table => !actualTables.includes(table));
    const extraTables = actualTables.filter(table => !expectedTables.includes(table));
    
    if (missingTables.length === 0 && extraTables.length === 0) {
      console.log('✅ SUCCESS: Database is up to date with Prisma schema!\n');
    } else {
      console.log('⚠️  WARNING: Database schema mismatch!\n');
      
      if (missingTables.length > 0) {
        console.log('❌ Missing Tables (in schema but not in DB):');
        missingTables.forEach(table => console.log(`   - ${table}`));
        console.log();
      }
      
      if (extraTables.length > 0) {
        console.log('➕ Extra Tables (in DB but not in schema):');
        extraTables.forEach(table => console.log(`   - ${table}`));
        console.log();
      }
    }
    
    console.log('📋 All Expected Tables:');
    console.log('========================');
    expectedTables.forEach((table, index) => {
      const status = actualTables.includes(table) ? '✅' : '❌';
      console.log(`${(index + 1).toString().padStart(2, '0')}. ${status} ${table}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();