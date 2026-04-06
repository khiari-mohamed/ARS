// Check BTK bordereau status
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBordereau() {
  const bordereau = await prisma.bordereau.findFirst({
    where: { reference: 'BTK BR 2026721437' },
    include: {
      client: true,
      contract: true
    }
  });
  
  if (!bordereau) {
    console.log('❌ Bordereau not found!');
    return;
  }
  
  console.log('✅ Bordereau found:');
  console.log(`   Reference: ${bordereau.reference}`);
  console.log(`   Client: ${bordereau.client?.name}`);
  console.log(`   Status: ${bordereau.statut}`);
  console.log(`   Nombre BS: ${bordereau.nombreBS}`);
  
  if (bordereau.statut !== 'TRAITE') {
    console.log('\n⚠️ Status is not TRAITE - updating...');
    await prisma.bordereau.update({
      where: { id: bordereau.id },
      data: { statut: 'TRAITE' }
    });
    console.log('✅ Status updated to TRAITE');
  }
  
  await prisma.$disconnect();
}

checkBordereau();
