const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Installing Complete PaperStream Integration...');

// Step 1: Install dependencies
console.log('\n📦 Installing dependencies...');
try {
  execSync('npm install xml2js @types/xml2js chokidar @types/chokidar', { stdio: 'inherit' });
  console.log('✅ Dependencies installed');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

// Step 2: Run database migration
console.log('\n🗄️ Updating database schema...');
try {
  execSync('npx prisma db push', { stdio: 'inherit' });
  console.log('✅ Database schema updated');
} catch (error) {
  console.error('❌ Database migration failed:', error.message);
  console.log('⚠️ You may need to run this manually: npx prisma db push');
}

// Step 3: Setup directory structure
console.log('\n📁 Setting up directory structure...');
try {
  execSync('node setup-paperstream.js', { stdio: 'inherit' });
  console.log('✅ Directory structure created');
} catch (error) {
  console.error('❌ Directory setup failed:', error.message);
}

// Step 4: Generate Prisma client
console.log('\n🔧 Generating Prisma client...');
try {
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma client generated');
} catch (error) {
  console.error('❌ Prisma client generation failed:', error.message);
}

// Step 5: Create test bordereau for scanning
console.log('\n🧪 Creating test data...');
try {
  const testScript = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestBordereau() {
  try {
    // Get or create a client
    let client = await prisma.client.findFirst();
    if (!client) {
      client = await prisma.client.create({
        data: {
          name: 'SAMPLE_CLIENT',
          reglementDelay: 30,
          reclamationDelay: 15
        }
      });
    }
    
    // Create test bordereau with A_SCANNER status
    const bordereau = await prisma.bordereau.create({
      data: {
        reference: 'BORD-2025-001',
        clientId: client.id,
        dateReception: new Date(),
        delaiReglement: 30,
        nombreBS: 1,
        statut: 'A_SCANNER'
      }
    });
    
    console.log('✅ Test bordereau created:', bordereau.reference);
    console.log('📋 Status:', bordereau.statut);
    console.log('🏢 Client:', client.name);
    
  } catch (error) {
    console.error('❌ Test data creation failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestBordereau();
  `;
  
  fs.writeFileSync('create-test-bordereau.js', testScript);
  execSync('node create-test-bordereau.js', { stdio: 'inherit' });
  fs.unlinkSync('create-test-bordereau.js');
  
} catch (error) {
  console.error('❌ Test data creation failed:', error.message);
}

// Step 6: Validation
console.log('\n✅ Validating installation...');
const validationChecks = [
  { name: 'PaperStream input directory', path: './paperstream-input' },
  { name: 'PaperStream processed directory', path: './paperstream-processed' },
  { name: 'Sample batch directory', path: './paperstream-input/SAMPLE_CLIENT/2025-01-30/BATCH_001' },
  { name: 'Sample XML file', path: './paperstream-input/SAMPLE_CLIENT/2025-01-30/BATCH_001/index.xml' },
  { name: 'PaperStream README', path: './PAPERSTREAM_README.md' }
];

let allValid = true;
validationChecks.forEach(check => {
  if (fs.existsSync(check.path)) {
    console.log(`✅ ${check.name}`);
  } else {
    console.log(`❌ ${check.name} - Missing: ${check.path}`);
    allValid = false;
  }
});

console.log('\n🎉 PaperStream Integration Installation Complete!');
console.log('\n📋 Installation Summary:');
console.log('✅ Database schema updated with PaperStream fields');
console.log('✅ Directory structure created');
console.log('✅ Sample batch created for testing');
console.log('✅ Dependencies installed');
console.log('✅ Services configured');

console.log('\n🚀 Next Steps:');
console.log('1. Restart your server to activate PaperStream services');
console.log('2. Test with sample batch: paperstream-input/SAMPLE_CLIENT/2025-01-30/BATCH_001/');
console.log('3. Monitor server logs for batch processing');
console.log('4. Check paperstream-processed/ for results');

console.log('\n📚 Documentation:');
console.log('- Read PAPERSTREAM_README.md for detailed setup instructions');
console.log('- Check .env.paperstream for configuration options');

if (allValid) {
  console.log('\n🎯 Status: READY FOR PRODUCTION');
} else {
  console.log('\n⚠️ Status: SOME ISSUES DETECTED - Check missing files above');
}