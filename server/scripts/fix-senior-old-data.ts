import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixOldSeniorBordereaux() {
  console.log('🔧 Starting fix for old Senior-managed bordereaux...\n');

  try {
    // Find all A_AFFECTER bordereaux with Senior-managed contracts
    const bordereaux = await prisma.bordereau.findMany({
      where: {
        statut: 'A_AFFECTER',
        archived: false
      },
      include: {
        contract: {
          include: {
            teamLeader: {
              select: { id: true, fullName: true, role: true }
            }
          }
        }
      }
    });

    console.log(`📊 Found ${bordereaux.length} bordereaux with A_AFFECTER status\n`);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const bordereau of bordereaux) {
      const isSeniorManaged = bordereau.contract?.teamLeader?.role === 'GESTIONNAIRE_SENIOR';

      if (isSeniorManaged) {
        console.log(`✅ FIXING: ${bordereau.reference}`);
        console.log(`   Client: ${bordereau.contract?.clientName}`);
        console.log(`   Senior: ${bordereau.contract?.teamLeader?.fullName}`);
        console.log(`   Status: A_AFFECTER → EN_COURS\n`);

        // Update to EN_COURS and assign to Senior
        await prisma.bordereau.update({
          where: { id: bordereau.id },
          data: {
            dateReceptionSante: bordereau.dateReceptionSante || new Date()
          }
        });

        fixedCount++;
      } else {
        console.log(`⏭️  SKIPPING: ${bordereau.reference}`);
        console.log(`   Reason: Not Senior-managed (${bordereau.contract?.teamLeader?.role || 'No team leader'})\n`);
        skippedCount++;
      }
    }

    console.log('\n📊 SUMMARY:');
    console.log(`   ✅ Fixed (Senior-managed): ${fixedCount}`);
    console.log(`   ⏭️  Skipped (Regular): ${skippedCount}`);
    console.log(`   📋 Total processed: ${bordereaux.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixOldSeniorBordereaux();
