const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBordereauHistory() {
  console.log('🔍 Checking bordereau assignment history...\n');

  const bordereau = await prisma.bordereau.findFirst({
    where: { statut: 'ASSIGNE' },
    include: {
      traitementHistory: {
        where: {
          OR: [
            { action: 'ASSIGNED' },
            { toStatus: 'ASSIGNE' }
          ]
        },
        orderBy: { createdAt: 'asc' },
        take: 1
      }
    }
  });

  if (bordereau) {
    console.log('📋 Bordereau:', bordereau.reference);
    console.log('📅 Date Réception BO:', bordereau.dateReceptionBO);
    console.log('📅 Date Affectation:', bordereau.dateAffectation);
    console.log('📜 History:', bordereau.traitementHistory);
  } else {
    console.log('❌ No ASSIGNE bordereau found');
  }

  await prisma.$disconnect();
}

checkBordereauHistory().catch(console.error);
