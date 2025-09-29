const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkCurrentDocumentIds() {
  try {
    console.log('🔍 Checking current document IDs for Test Gestionnaire...\n');

    // Find the Test Gestionnaire user
    const testGestionnaire = await prisma.user.findFirst({
      where: { 
        fullName: { contains: 'Test Gestionnaire', mode: 'insensitive' },
        role: 'GESTIONNAIRE'
      }
    });

    // Get assigned bordereaux with documents
    const assignedBordereaux = await prisma.bordereau.findMany({
      where: {
        assignedToUserId: testGestionnaire.id,
        statut: { in: ['ASSIGNE', 'EN_COURS'] }
      },
      include: {
        client: { select: { name: true } },
        documents: {
          select: { 
            id: true,
            name: true, 
            type: true,
            path: true
          }
        }
      },
      take: 10 // Just first 10 for testing
    });

    console.log('📊 CURRENT DOCUMENT IDs (what should appear in frontend):');
    console.log('═══════════════════════════════════════════════════════\n');

    assignedBordereaux.forEach((bordereau, index) => {
      console.log(`${index + 1}. Bordereau: ${bordereau.reference}`);
      console.log(`   Client: ${bordereau.client?.name}`);
      
      if (bordereau.documents.length > 0) {
        bordereau.documents.forEach(doc => {
          console.log(`   📄 Document ID: ${doc.id}`);
          console.log(`      Name: ${doc.name}`);
          console.log(`      Path: ${doc.path}`);
          console.log(`      ✅ This ID should work for PDF viewing`);
        });
      } else {
        console.log(`   ❌ No documents - will use bordereau ID: ${bordereau.id}`);
        console.log(`      ⚠️  This ID will NOT work for PDF viewing`);
      }
      console.log('');
    });

    // Check the specific failing ID
    const failingId = 'ec2cf97f-5cf1-4205-a434-32ca63294427';
    console.log(`🔍 CHECKING FAILING ID: ${failingId}`);
    console.log('═══════════════════════════════════════════════════════');
    
    const failingDoc = await prisma.document.findUnique({
      where: { id: failingId }
    });

    if (failingDoc) {
      console.log('✅ Document exists in database');
    } else {
      console.log('❌ Document does NOT exist in database');
      console.log('💡 This means the frontend is using an old/cached ID');
    }

    // Check if it's a bordereau ID instead
    const failingBordereau = await prisma.bordereau.findUnique({
      where: { id: failingId }
    });

    if (failingBordereau) {
      console.log('✅ This is a bordereau ID, not a document ID');
      console.log(`   Reference: ${failingBordereau.reference}`);
    } else {
      console.log('❌ Not a bordereau ID either');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCurrentDocumentIds();