const { PrismaClient } = require('@prisma/client');

async function checkColonneColumn() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking for "colonne" column in database...\n');
    
    // Check all tables for a column named 'colonne'
    const result = await prisma.$queryRaw`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND column_name = 'colonne'
      ORDER BY table_name
    `;
    
    if (result.length === 0) {
      console.log('❌ No "colonne" column found in any table');
      console.log('\n🔍 Searching for similar column names...');
      
      // Search for similar column names
      const similarColumns = await prisma.$queryRaw`
        SELECT 
          table_name,
          column_name,
          data_type
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND (
            column_name ILIKE '%col%' 
            OR column_name ILIKE '%column%'
          )
        ORDER BY table_name, column_name
      `;
      
      if (similarColumns.length > 0) {
        console.log('\n📋 Similar column names found:');
        similarColumns.forEach(col => {
          console.log(`   ${col.table_name}.${col.column_name} (${col.data_type})`);
        });
      } else {
        console.log('   No similar column names found');
      }
      
    } else {
      console.log('✅ Found "colonne" column(s):');
      result.forEach(col => {
        console.log(`   ${col.table_name}.${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
      });
    }
    
    // Also check what's trying to use this column by searching code
    console.log('\n🔍 This column might be referenced in your code.');
    console.log('   Check your TypeScript files for "colonne" references.');
    
  } catch (error) {
    console.error('❌ Error checking column:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkColonneColumn();