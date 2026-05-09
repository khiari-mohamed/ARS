const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testBordereau() {
  try {
    const bordereau = await prisma.bordereau.findFirst({
      where: { reference: 'babe_2026-88396' },
      include: {
        User: true,
        chargeCompte: true,
        contract: {
          include: {
            teamLeader: true,
            client: true
          }
        },
        client: true
      }
    });

    console.log('=== BORDEREAU DATA ===');
    console.log('currentHandlerId:', bordereau?.currentHandlerId);
    
    // Fetch the currentHandler user
    if (bordereau?.currentHandlerId) {
      const currentHandler = await prisma.user.findUnique({
        where: { id: bordereau.currentHandlerId }
      });
      console.log('\n=== CURRENT HANDLER ===');
      console.log(currentHandler);
    }
    
    console.log('\n=== CONTRACT TEAM LEADER ===');
    console.log(bordereau?.contract?.teamLeader);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testBordereau();
