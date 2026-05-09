const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCCABordereaux() {
  console.log('\n🔍 CHECKING CCA BORDEREAUX ASSIGNMENTS\n');
  console.log('='.repeat(100));

  const ccaBordereaux = await prisma.bordereau.findMany({
    where: {
      client: {
        name: 'CCA'
      }
    },
    include: {
      client: true,
      contract: {
        include: {
          assignedManager: true,
          teamLeader: true
        }
      },
      currentHandler: true
    },
    orderBy: {
      reference: 'asc'
    },
    take: 10
  });

  console.log(`\nFound ${ccaBordereaux.length} CCA bordereaux (showing first 10)\n`);

  for (const bordereau of ccaBordereaux) {
    console.log(`📋 ${bordereau.reference} (${bordereau.statut})`);
    
    if (bordereau.contract?.assignedManager) {
      console.log(`   ✅ contract.assignedManager: ${bordereau.contract.assignedManager.fullName} (${bordereau.contract.assignedManager.role})`);
      const icon = bordereau.contract.assignedManager.role === 'GESTIONNAIRE_SENIOR' ? '👨💼' : '👤';
      console.log(`      Should display: ${icon} ${bordereau.contract.assignedManager.fullName}`);
    } else {
      console.log(`   ❌ contract.assignedManager: NULL`);
    }
    
    if (bordereau.currentHandler) {
      console.log(`   🔄 currentHandler: ${bordereau.currentHandler.fullName} (${bordereau.currentHandler.role})`);
      if (bordereau.currentHandler.role === 'GESTIONNAIRE' || bordereau.currentHandler.role === 'GESTIONNAIRE_SENIOR') {
        const icon = bordereau.currentHandler.role === 'GESTIONNAIRE_SENIOR' ? '👨💼' : '👤';
        console.log(`      Should display: ${icon} ${bordereau.currentHandler.fullName}`);
      }
    } else {
      console.log(`   ❌ currentHandler: NULL`);
    }
    
    console.log('');
  }

  await prisma.$disconnect();
}

checkCCABordereaux().catch(console.error);
