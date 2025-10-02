const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDataStructure() {
  console.log('🔍 CHECKING DATA STRUCTURE DIFFERENCES');
  console.log('=====================================\n');

  try {
    // Check gestionnaire user
    const gestionnaire = await prisma.user.findFirst({
      where: { role: 'GESTIONNAIRE' }
    });
    
    if (!gestionnaire) {
      console.log('❌ No gestionnaire found');
      return;
    }
    
    console.log(`👤 Gestionnaire: ${gestionnaire.fullName} (${gestionnaire.email})\n`);
    
    // Check bordereaux assigned to this gestionnaire
    console.log('📋 BORDEREAUX assigned to gestionnaire:');
    const userBordereaux = await prisma.bordereau.findMany({
      where: {
        assignedToUserId: gestionnaire.id
      },
      include: {
        client: true,
        documents: true
      }
    });
    
    console.log(`Found ${userBordereaux.length} bordereaux assigned to gestionnaire`);
    userBordereaux.forEach(b => {
      console.log(`  ${b.reference}: ${b.statut} (${b.documents.length} documents)`);
    });
    
    // Check documents assigned to this gestionnaire
    console.log('\n📄 DOCUMENTS assigned to gestionnaire:');
    const userDocuments = await prisma.document.findMany({
      where: {
        assignedToUserId: gestionnaire.id
      }
    });
    
    console.log(`Found ${userDocuments.length} documents assigned to gestionnaire`);
    userDocuments.forEach(d => {
      console.log(`  ${d.name}: ${d.status || 'NO_STATUS'}`);
    });
    
    // Check documents with "Retourné" status pattern
    console.log('\n🔍 DOCUMENTS with Retourné-like status:');
    const retourneDocuments = await prisma.document.findMany({
      where: {
        OR: [
          { status: 'RETOURNE' },
          { status: 'RETOURNÉ' },
          { name: { contains: 'Retourné' } }
        ]
      }
    });
    
    console.log(`Found ${retourneDocuments.length} documents with Retourné status`);
    retourneDocuments.forEach(d => {
      console.log(`  ${d.name}: ${d.status} (assigned to: ${d.assignedToUserId || 'none'})`);
    });
    
    // Check if there's a different table/field being used
    console.log('\n🔍 CHECKING FOR OTHER DATA SOURCES:');
    
    // Check if there are any custom fields or JSON data
    const documentsWithCustomStatus = await prisma.document.findMany({
      where: {
        assignedToUserId: gestionnaire.id
      },
      select: {
        id: true,
        name: true,
        status: true,
        ocrResult: true
      }
    });
    
    documentsWithCustomStatus.forEach(d => {
      if (d.ocrResult && typeof d.ocrResult === 'object') {
        console.log(`  ${d.name}: OCR data might contain status info`);
      }
    });
    
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('  1. Dashboard shows individual DOCUMENTS');
    console.log('  2. Bordereaux module looks for BORDEREAUX');
    console.log('  3. Need to check if documents with "Retourné" status belong to bordereaux');
    console.log('  4. Or if we need to count documents instead of bordereaux');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDataStructure();