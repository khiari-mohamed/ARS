const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function populateDateAffectation() {
  console.log('🔄 Populating dateAffectation for bordereaux...\n');

  // Get all bordereaux with ASSIGNE or later status
  const bordereaux = await prisma.bordereau.findMany({
    where: {
      statut: {
        in: ['ASSIGNE', 'EN_COURS', 'TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE', 'PAYE']
      },
      dateAffectation: null
    },
    include: {
      traitementHistory: {
        where: {
          OR: [
            { action: 'ASSIGNED' },
            { action: 'AFFECTE' },
            { toStatus: 'ASSIGNE' }
          ]
        },
        orderBy: {
          createdAt: 'asc'
        },
        take: 1
      }
    }
  });

  console.log(`📊 Found ${bordereaux.length} bordereaux to update\n`);

  let updated = 0;
  let noHistory = 0;

  for (const bordereau of bordereaux) {
    if (bordereau.traitementHistory.length > 0) {
      // Use the first assignment date from history
      const affectationDate = bordereau.traitementHistory[0].createdAt;
      
      await prisma.bordereau.update({
        where: { id: bordereau.id },
        data: { dateAffectation: affectationDate }
      });
      
      console.log(`✅ ${bordereau.reference}: ${affectationDate.toLocaleDateString('fr-FR')}`);
      updated++;
    } else {
      // No history found, use updatedAt as fallback
      await prisma.bordereau.update({
        where: { id: bordereau.id },
        data: { dateAffectation: bordereau.updatedAt }
      });
      
      console.log(`⚠️ ${bordereau.reference}: ${bordereau.updatedAt.toLocaleDateString('fr-FR')} (fallback)`);
      noHistory++;
    }
  }

  console.log(`\n📊 SUMMARY:`);
  console.log(`✅ Updated with history: ${updated}`);
  console.log(`⚠️ Updated with fallback: ${noHistory}`);
  console.log(`📊 Total updated: ${updated + noHistory}`);

  await prisma.$disconnect();
}

populateDateAffectation().catch(console.error);
