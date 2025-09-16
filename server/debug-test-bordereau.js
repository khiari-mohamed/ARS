const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugTestBordereau() {
  try {
    // Find the specific test bordereau
    const testBordereau = await prisma.bordereau.findFirst({
      where: {
        reference: { contains: 'TEST-BO-' }
      },
      include: {
        client: { select: { name: true } }
      }
    });

    if (testBordereau) {
      console.log('Found test bordereau:');
      console.log(`Reference: ${testBordereau.reference}`);
      console.log(`Status: ${testBordereau.statut}`);
      console.log(`Client: ${testBordereau.client?.name}`);
      console.log(`Archived: ${testBordereau.archived}`);
      console.log(`Created: ${testBordereau.createdAt}`);
    } else {
      console.log('❌ Test bordereau not found');
    }

    // Check all EN_ATTENTE bordereaux
    const enAttenteCount = await prisma.bordereau.count({
      where: { statut: 'EN_ATTENTE' }
    });
    console.log(`\nTotal EN_ATTENTE bordereaux: ${enAttenteCount}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugTestBordereau();