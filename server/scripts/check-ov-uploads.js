const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOVUploads() {
  console.log('🔍 Checking OV uploads in database...\n');
  
  try {
    // Check all OrdreVirement records
    const allOVs = await prisma.ordreVirement.findMany({
      select: {
        id: true,
        reference: true,
        bordereauId: true,
        uploadedPdfPath: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log(`📊 Found ${allOVs.length} recent OVs:\n`);
    
    allOVs.forEach((ov, index) => {
      console.log(`${index + 1}. ${ov.reference}`);
      console.log(`   ID: ${ov.id}`);
      console.log(`   Bordereau ID: ${ov.bordereauId || 'NULL (Manual OV)'}`);
      console.log(`   Uploaded PDF Path: ${ov.uploadedPdfPath || 'NULL ❌'}`);
      console.log(`   Created: ${ov.createdAt.toLocaleString()}`);
      console.log('');
    });
    
    // Check OVDocument table
    const ovDocs = await prisma.oVDocument.findMany({
      select: {
        id: true,
        name: true,
        ordreVirementId: true,
        bordereauId: true,
        type: true,
        uploadedAt: true
      },
      orderBy: { uploadedAt: 'desc' },
      take: 10
    });
    
    console.log(`\n📄 Found ${ovDocs.length} OV Documents:\n`);
    
    ovDocs.forEach((doc, index) => {
      console.log(`${index + 1}. ${doc.name}`);
      console.log(`   OV ID: ${doc.ordreVirementId}`);
      console.log(`   Bordereau ID: ${doc.bordereauId || 'NULL'}`);
      console.log(`   Type: ${doc.type}`);
      console.log(`   Uploaded: ${doc.uploadedAt.toLocaleString()}`);
      console.log('');
    });
    
    // Check if uploadedPdfPath field exists
    console.log('\n🔧 Checking if uploadedPdfPath field exists in schema...');
    const tableInfo = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'OrdreVirement' 
      AND column_name = 'uploadedPdfPath'
    `;
    
    if (tableInfo.length > 0) {
      console.log('✅ uploadedPdfPath field EXISTS in database');
    } else {
      console.log('❌ uploadedPdfPath field DOES NOT EXIST in database');
      console.log('   Run: npx prisma db push');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkOVUploads();
