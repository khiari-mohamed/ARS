const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDateReceptionBO() {
  console.log('🔧 FIXING dateReceptionBO values...\n');

  // Find all bordereaux where dateReceptionBO != dateReception
  const bordereaux = await prisma.bordereau.findMany({
    select: {
      id: true,
      reference: true,
      dateReception: true,
      dateReceptionBO: true
    }
  });

  let fixed = 0;
  let alreadyCorrect = 0;

  for (const b of bordereaux) {
    const dateReception = new Date(b.dateReception);
    const dateReceptionBO = b.dateReceptionBO ? new Date(b.dateReceptionBO) : null;

    // Check if they're different (comparing date strings)
    if (!dateReceptionBO || dateReception.toISOString() !== dateReceptionBO.toISOString()) {
      await prisma.bordereau.update({
        where: { id: b.id },
        data: { dateReceptionBO: b.dateReception }
      });
      
      if (fixed < 10) {
        console.log(`✅ Fixed ${b.reference}:`);
        console.log(`   FROM: ${dateReceptionBO ? dateReceptionBO.toISOString() : 'NULL'}`);
        console.log(`   TO:   ${dateReception.toISOString()}\n`);
      }
      fixed++;
    } else {
      alreadyCorrect++;
    }
  }

  console.log(`\n📊 SUMMARY:`);
  console.log(`   Total Bordereaux: ${bordereaux.length}`);
  console.log(`   Fixed: ${fixed}`);
  console.log(`   Already Correct: ${alreadyCorrect}`);

  await prisma.$disconnect();
}

fixDateReceptionBO().catch(console.error);
