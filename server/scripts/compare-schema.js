const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function compareSchemas() {
  console.log('🔍 Comparing Prisma Schema vs Database...\n');
  
  try {
    // Get tables from database
    const dbTables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    const dbTableNames = dbTables.map(t => t.table_name).filter(name => !name.startsWith('_'));
    
    // Parse schema.prisma to get models
    const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    
    const modelRegex = /^model\s+(\w+)\s*\{/gm;
    const schemaModels = [];
    let match;
    while ((match = modelRegex.exec(schemaContent)) !== null) {
      schemaModels.push(match[1]);
    }
    
    console.log('📊 COMPARISON RESULTS');
    console.log('====================\n');
    
    console.log(`📋 Database Tables: ${dbTableNames.length}`);
    console.log(`📄 Prisma Models: ${schemaModels.length}\n`);
    
    // Find tables in DB but not in schema
    const inDbNotInSchema = dbTableNames.filter(t => !schemaModels.includes(t));
    if (inDbNotInSchema.length > 0) {
      console.log('⚠️  Tables in DATABASE but NOT in SCHEMA:');
      inDbNotInSchema.forEach(t => console.log(`   - ${t}`));
      console.log('');
    }
    
    // Find models in schema but not in DB
    const inSchemaNotInDb = schemaModels.filter(m => !dbTableNames.includes(m));
    if (inSchemaNotInDb.length > 0) {
      console.log('⚠️  Models in SCHEMA but NOT in DATABASE:');
      inSchemaNotInDb.forEach(m => console.log(`   - ${m}`));
      console.log('');
    }
    
    if (inDbNotInSchema.length === 0 && inSchemaNotInDb.length === 0) {
      console.log('✅ All tables/models are in sync!\n');
    }
    
    // List all tables
    console.log('📋 All Database Tables:');
    console.log('=======================');
    dbTableNames.forEach(t => console.log(`  ${schemaModels.includes(t) ? '✅' : '❌'} ${t}`));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

compareSchemas();
