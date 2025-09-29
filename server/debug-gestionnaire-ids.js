const { PrismaClient } = require('@prisma/prisma');

const prisma = new PrismaClient();

async function debugGestionnaireIds() {
  try {
    console.log('🔍 Debugging gestionnaire corbeille IDs...\n');

    const testGestionnaire = await prisma.user.findFirst({
      where: { 
        fullName: { contains: 'Test Gestionnaire', mode: 'insensitive' },
        role: 'GESTIONNAIRE'
      }
    });

    // Get what the corbeille API should return
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
      }
    });

    console.log('📊 WHAT FRONTEND SHOULD RECEIVE:');
    console.log('═══════════════════════════════════════════════════════\n');

    const frontendData = assignedBordereaux.flatMap(b => 
      b.documents.length > 0 
        ? b.documents.map(doc => ({
            id: doc.id, // This is what frontend gets as ID
            reference: b.reference,
            client: b.client?.name,
            hasRealPDF: doc.path && !doc.path.includes('placeholder')
          }))
        : [{
            id: b.id, // Fallback to bordereau ID
            reference: b.reference,
            client: b.client?.name,
            hasRealPDF: false
          }]
    );

    frontendData.slice(0, 10).forEach((item, index) => {
      console.log(`${index + 1}. ID: ${item.id}`);
      console.log(`   Reference: ${item.reference}`);
      console.log(`   Client: ${item.client}`);
      console.log(`   Has PDF: ${item.hasRealPDF ? '✅' : '❌'}`);
      console.log('');
    });

    console.log(`Total items frontend receives: ${frontendData.length}\n`);

    // Check if these IDs exist as documents
    console.log('🔍 CHECKING IF FRONTEND IDs EXIST AS DOCUMENTS:');
    console.log('═══════════════════════════════════════════════════════\n');

    for (let i = 0; i < Math.min(frontendData.length, 5); i++) {
      const item = frontendData[i];
      const doc = await prisma.document.findUnique({
        where: { id: item.id }
      });
      
      console.log(`ID: ${item.id}`);
      console.log(`Reference: ${item.reference}`);
      console.log(`Document exists: ${doc ? '✅' : '❌'}`);
      if (doc) {
        console.log(`Document path: ${doc.path}`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugGestionnaireIds();