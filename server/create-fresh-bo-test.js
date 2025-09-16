const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createFreshBOTest() {
  try {
    const client = await prisma.client.findFirst();
    if (!client) {
      console.log('❌ No client found');
      return;
    }

    const bordereau = await prisma.bordereau.create({
      data: {
        reference: `BO-TEST-${Date.now()}`,
        clientId: client.id,
        dateReception: new Date(),
        delaiReglement: 30,
        nombreBS: 3,
        statut: 'EN_ATTENTE',
        archived: false
      }
    });

    console.log(`✅ Created: ${bordereau.reference} with status ${bordereau.statut}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createFreshBOTest();