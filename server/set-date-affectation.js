const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setDateAffectation() {
  console.log('🔄 Setting dateAffectation for assigned bordereaux...\n');

  const bordereaux = await prisma.bordereau.findMany({
    where: {
      statut: {
        in: ['ASSIGNE', 'EN_COURS', 'TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE', 'PAYE']
      },
      dateAffectation: null
    }
  });

  console.log(`Found ${bordereaux.length} bordereaux to update\n`);

  for (const b of bordereaux) {
    await prisma.bordereau.update({
      where: { id: b.id },
      data: { dateAffectation: b.updatedAt }
    });
    console.log(`✅ ${b.reference}: ${b.updatedAt.toLocaleDateString('fr-FR')}`);
  }

  console.log(`\n✅ Updated ${bordereaux.length} bordereaux`);
  await prisma.$disconnect();
}

setDateAffectation().catch(console.error);
