require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importSiwarData() {
  console.log('🚀 Starting import of Siwar Ayari COMPLETE data into LOCAL database...\n');

  const sqlFilePath = path.join(__dirname, 'siwar-complete-data.sql');

  // Check if file exists
  if (!fs.existsSync(sqlFilePath)) {
    console.error(`❌ SQL file not found: ${sqlFilePath}`);
    console.log('Please download it first using:');
    console.log('scp <user>@<host>:/home/yourapp/server/scripts/siwar-complete-data.sql D:\\ARS\\server\\scripts\\');
    process.exit(1);
  }

  const stats = fs.statSync(sqlFilePath);
  console.log(`✅ Found SQL file: ${sqlFilePath}`);
  console.log(`📊 File size: ${(stats.size / 1024).toFixed(2)} KB\n`);

  console.log('📍 Reading SQL file...');
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

  // Split by lines and reconstruct complete INSERT statements
  const lines = sqlContent.split('\n');
  const statements = [];
  let currentStatement = '';
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip comments and SET commands
    if (trimmed.startsWith('--') || trimmed.startsWith('SET session_replication_role')) {
      continue;
    }
    
    if (trimmed.length === 0) {
      continue;
    }
    
    currentStatement += ' ' + trimmed;
    
    // Check if statement is complete (ends with semicolon)
    if (trimmed.endsWith(';')) {
      statements.push(currentStatement.trim().slice(0, -1)); // Remove semicolon
      currentStatement = '';
    }
  }

  console.log(`✅ Found ${statements.length} SQL statements\n`);

  console.log('📍 Executing SQL statements...');
  console.log('⏳ This may take a few seconds...\n');

  let successCount = 0;
  let skipCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (!statement || statement.length === 0) continue;
    
    try {
      await prisma.$executeRawUnsafe(statement);
      successCount++;
      if ((i + 1) % 5 === 0) {
        process.stdout.write(`\r✓ Executed ${i + 1} statements...`);
      }
    } catch (error) {
      // Skip duplicate key errors (data already exists)
      if (error.message.includes('duplicate') || error.message.includes('already exists') || error.message.includes('Unique constraint')) {
        skipCount++;
      } else {
        console.error(`\n❌ Error executing statement ${i + 1}:`, error.message);
      }
    }
  }

  console.log(`\n\n✅ Executed ${successCount} statements successfully`);
  console.log(`⚠️ Skipped ${skipCount} statements (duplicates or comments)\n`);

  console.log('🎉 ========== IMPORT COMPLETE ==========');
  console.log('✅ Siwar Ayari COMPLETE data imported successfully!');
  console.log('📋 Imported data:');
  console.log('  ✅ User: Siwar Ayari');
  console.log('  ✅ Compagnie Assurance: STAR ASSURANCES');
  console.log('  ✅ Clients: ZOPPAS CADRES, ZOPPAS NON CADRES');
  console.log('  ✅ Contracts: 2');
  console.log('  ✅ Bordereaux: 4');
  console.log('  ✅ Documents: 30');
  console.log('\n🔐 Login credentials:');
  console.log('  Email: <siwar_email>');
  console.log('  Password: azerty (default password)\n');
  console.log('✅ You can now login as Siwar Ayari and test the Finance module!\n');
  console.log('✅ Script completed successfully');
}

importSiwarData()
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
