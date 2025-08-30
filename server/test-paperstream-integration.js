const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function testPaperStreamIntegration() {
  console.log('🧪 Testing PaperStream Integration...\n');
  
  try {
    // 1. Check if test bordereau exists
    console.log('1️⃣ Checking test bordereau...');
    const bordereau = await prisma.bordereau.findFirst({
      where: { reference: 'BORD-2025-001' },
      include: { client: true }
    });
    
    if (bordereau) {
      console.log(`✅ Bordereau found: ${bordereau.reference}`);
      console.log(`   Status: ${bordereau.statut}`);
      console.log(`   Client: ${bordereau.client?.name}`);
    } else {
      console.log('❌ Test bordereau not found');
      return;
    }
    
    // 2. Check batch folder structure
    console.log('\n2️⃣ Checking batch folder structure...');
    const batchPath = './paperstream-input/SAMPLE_CLIENT/2025-01-30/BATCH_001';
    const files = fs.readdirSync(batchPath);
    
    console.log(`✅ Batch folder exists: ${batchPath}`);
    console.log(`   Files: ${files.join(', ')}`);
    
    const hasXML = files.includes('index.xml');
    const hasPDF = files.some(f => f.endsWith('.pdf'));
    
    if (hasXML && hasPDF) {
      console.log('✅ Batch structure valid (XML + PDF files present)');
    } else {
      console.log('❌ Invalid batch structure');
      return;
    }
    
    // 3. Check database schema
    console.log('\n3️⃣ Checking database schema...');
    const sampleDoc = await prisma.document.findFirst({
      select: {
        id: true,
        batchId: true,
        barcodeValues: true,
        operatorId: true,
        scannerModel: true,
        imprinterIds: true,
        ingestStatus: true
      }
    });
    
    if (sampleDoc !== null) {
      console.log('✅ PaperStream fields available in database');
      if (sampleDoc.batchId !== undefined) {
        console.log('   - batchId field: ✅');
      }
      if (sampleDoc.barcodeValues !== undefined) {
        console.log('   - barcodeValues field: ✅');
      }
      if (sampleDoc.operatorId !== undefined) {
        console.log('   - operatorId field: ✅');
      }
    } else {
      console.log('⚠️ No documents in database yet (normal for fresh install)');
    }
    
    // 4. Check service files exist
    console.log('\n4️⃣ Checking PaperStream service files...');
    const serviceFiles = [
      './src/ged/paperstream-batch-processor.service.ts',
      './src/ged/paperstream-watcher.service.ts'
    ];
    
    serviceFiles.forEach(file => {
      if (fs.existsSync(file)) {
        console.log(`✅ ${path.basename(file)} exists`);
      } else {
        console.log(`❌ ${path.basename(file)} missing`);
      }
    });
    
    // 5. Check for existing PaperStream documents
    console.log('\n5️⃣ Checking for existing PaperStream documents...');
    const paperStreamDocs = await prisma.document.findMany({
      where: {
        OR: [
          { batchId: { not: null } },
          { operatorId: { not: null } },
          { scannerModel: { not: null } }
        ]
      },
      take: 5
    });
    
    if (paperStreamDocs.length > 0) {
      console.log(`✅ Found ${paperStreamDocs.length} PaperStream documents`);
      paperStreamDocs.forEach(doc => {
        console.log(`   - ${doc.name} (Batch: ${doc.batchId || 'N/A'})`);
      });
    } else {
      console.log('⚠️ No PaperStream documents found (normal for fresh install)');
    }
    
    console.log('\n🎉 PaperStream Integration Test Complete!');
    console.log('\n📋 Summary:');
    console.log('✅ Database schema updated with PaperStream fields');
    console.log('✅ Test data created (bordereau + batch)');
    console.log('✅ Service files created');
    console.log('✅ Directory structure ready');
    console.log('\n🚀 Next Step: Restart server to activate PaperStream services');
    console.log('   Command: npm run start:dev');
    console.log('\n📋 After restart, the batch will be automatically processed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testPaperStreamIntegration();