const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestBordereau() {
  try {
    // Get first client
    const client = await prisma.client.findFirst();
    if (!client) {
      console.log('❌ No client found. Create a client first.');
      return;
    }

    // Create test bordereau with EN_ATTENTE status (for BO)
    const bordereau = await prisma.bordereau.create({
      data: {
        reference: `TEST-BO-${Date.now()}`,
        clientId: client.id,
        dateReception: new Date(),
        delaiReglement: 30,
        nombreBS: Math.floor(Math.random() * 5) + 1,
        statut: 'EN_ATTENTE' // This will show in BO Corbeille
      },
      include: {
        client: { select: { name: true } }
      }
    });

    console.log('✅ Created test bordereau for BO:');
    console.log(`   Reference: ${bordereau.reference}`);
    console.log(`   Client: ${bordereau.client?.name}`);
    console.log(`   Status: ${bordereau.statut}`);
    console.log(`   BS Count: ${bordereau.nombreBS}`);
    console.log('');
    console.log('This bordereau should now appear in BO Corbeille');
    console.log('Use "Envoyer au SCAN" button to move it to SCAN Corbeille');

  } catch (error) {
    console.error('Error creating test bordereau:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestBordereau();