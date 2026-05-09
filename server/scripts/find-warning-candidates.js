/**
 * 🔍 Find bordereaux that SHOULD show warning icon in UI
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m',
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

async function findWarningCandidates() {
  try {
    log(colors.cyan + colors.bright, '\n🔍 FINDING BORDEREAUX THAT SHOULD SHOW ⚠️ WARNING ICON\n');
    log(colors.cyan, '='.repeat(80));

    // Find TRAITÉ without dateCloture (these SHOULD show warning icon)
    const shouldShowWarning = await prisma.bordereau.findMany({
      where: {
        statut: 'TRAITE',
        dateCloture: null
      },
      select: {
        id: true,
        reference: true,
        statut: true,
        dateReception: true,
        dateCloture: true,
        delaiReglement: true,
      },
      orderBy: { dateReception: 'desc' },
      take: 10
    });

    if (shouldShowWarning.length > 0) {
      log(colors.yellow + colors.bright, `\n✅ Found ${shouldShowWarning.length} bordereaux that SHOULD show ⚠️ warning icon:\n`);
      
      shouldShowWarning.forEach(b => {
        const now = new Date();
        const days = Math.floor(
          (now.getTime() - new Date(b.dateReception).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        console.log(`   📋 ${b.reference}`);
        console.log(`      Status: TRAITÉ`);
        console.log(`      dateCloture: NULL`);
        console.log(`      UI should show: [${days} jours] ⚠️ (orange badge)`);
        console.log(`      Tooltip: "Durée approximative - Date de clôture manquante"\n`);
      });

      log(colors.green, '\n💡 To test in UI:');
      console.log('   1. Search for one of these references in the table');
      console.log('   2. Look at the "Durée de traitement" column');
      console.log('   3. You should see an orange badge with ⚠️ icon');
      console.log('   4. Hover over ⚠️ to see the tooltip\n');
    } else {
      log(colors.red, '\n❌ No bordereaux found that should show warning icon');
      log(colors.yellow, '\n   All TRAITÉ bordereaux have dateCloture set correctly!');
      log(colors.yellow, '   Or there are no TRAITÉ bordereaux in the database.\n');
    }

    // Also show bordereaux with invalid dateCloture (these should show "En cours")
    log(colors.cyan + colors.bright, '\n📊 BORDEREAUX WITH INVALID DATA (showing "En cours"):\n');
    
    const invalidData = await prisma.bordereau.findMany({
      where: {
        dateCloture: { not: null },
        statut: { notIn: ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'] }
      },
      select: {
        reference: true,
        statut: true,
        dateCloture: true,
      },
      take: 5
    });

    if (invalidData.length > 0) {
      invalidData.forEach(b => {
        console.log(`   📋 ${b.reference} (${b.statut})`);
        console.log(`      Has dateCloture but status is not finished`);
        console.log(`      UI shows: "En cours" (correct - invalid data ignored)\n`);
      });
    }

    log(colors.cyan, '='.repeat(80));

  } catch (error) {
    log(colors.red, '❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

findWarningCandidates();
