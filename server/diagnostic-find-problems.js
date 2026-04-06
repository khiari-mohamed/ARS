/**
 * 🔍 DIAGNOSTIC: Find All Problematic Bordereaux
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

async function findProblems() {
  try {
    log(colors.cyan + colors.bright, '\n🔍 FINDING ALL PROBLEMATIC BORDEREAUX\n');
    log(colors.cyan, '='.repeat(80));

    // Problem 1: dateCloture exists but status is not TRAITE/CLOTURE/VIREMENT_EXECUTE
    log(colors.yellow + colors.bright, '\n⚠️  PROBLEM 1: Invalid dateCloture (not TRAITÉ but has dateCloture)');
    const invalidDateCloture = await prisma.bordereau.findMany({
      where: {
        dateCloture: { not: null },
        statut: { notIn: ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'] }
      },
      select: {
        id: true,
        reference: true,
        statut: true,
        dateReception: true,
        dateCloture: true,
        delaiReglement: true,
      },
      orderBy: { dateReception: 'desc' }
    });

    if (invalidDateCloture.length > 0) {
      log(colors.red, `\n   Found ${invalidDateCloture.length} bordereaux with invalid dateCloture:\n`);
      invalidDateCloture.forEach(b => {
        const days = Math.floor(
          (new Date(b.dateCloture).getTime() - new Date(b.dateReception).getTime()) / (1000 * 60 * 60 * 24)
        );
        console.log(`   - ${b.reference} (${b.statut})`);
        console.log(`     dateCloture: ${b.dateCloture.toISOString().split('T')[0]}`);
        console.log(`     dureeTraitement would show: ${days} jours (WRONG!)`);
        console.log(`     Should show: "En cours" or "En attente"\n`);
      });

      log(colors.yellow, '   💡 FIX: Run this SQL:');
      console.log(`   UPDATE "Bordereau" SET "dateCloture" = NULL WHERE statut NOT IN ('TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE') AND "dateCloture" IS NOT NULL;\n`);
    } else {
      log(colors.green, '   ✅ No invalid dateCloture found!\n');
    }

    // Problem 2: VIREMENT_EXECUTE but no dateCloture
    log(colors.yellow + colors.bright, '\n⚠️  PROBLEM 2: VIREMENT_EXECUTE without dateCloture');
    const virementWithoutCloture = await prisma.bordereau.findMany({
      where: {
        statut: 'VIREMENT_EXECUTE',
        dateCloture: null
      },
      include: {
        ordresVirement: {
          orderBy: { dateCreation: 'desc' },
          take: 1
        }
      },
      orderBy: { dateReception: 'desc' }
    });

    if (virementWithoutCloture.length > 0) {
      log(colors.red, `\n   Found ${virementWithoutCloture.length} VIREMENT_EXECUTE without dateCloture:\n`);
      virementWithoutCloture.forEach(b => {
        const virementDate = b.ordresVirement?.[0]?.dateEtatFinal || b.ordresVirement?.[0]?.dateTraitement;
        console.log(`   - ${b.reference} (${b.statut})`);
        console.log(`     dateCloture: NULL`);
        console.log(`     Virement date: ${virementDate ? virementDate.toISOString().split('T')[0] : 'N/A'}`);
        console.log(`     dureeTraitement shows: "En cours" (WRONG!)`);
        console.log(`     Should show: number of days\n`);
      });

      log(colors.yellow, '   💡 FIX: These bordereaux need dateCloture set');
      console.log(`   Option 1: Set to virement date (approximation)`);
      console.log(`   Option 2: Ask business team for correct processing completion date\n`);
    } else {
      log(colors.green, '   ✅ No VIREMENT_EXECUTE without dateCloture found!\n');
    }

    // Problem 3: TRAITE without dateCloture
    log(colors.yellow + colors.bright, '\n⚠️  PROBLEM 3: TRAITÉ without dateCloture');
    const traiteWithoutCloture = await prisma.bordereau.findMany({
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
      },
      orderBy: { dateReception: 'desc' }
    });

    if (traiteWithoutCloture.length > 0) {
      log(colors.red, `\n   Found ${traiteWithoutCloture.length} TRAITÉ without dateCloture:\n`);
      traiteWithoutCloture.forEach(b => {
        console.log(`   - ${b.reference} (${b.statut})`);
        console.log(`     dateCloture: NULL (WRONG!)`);
        console.log(`     dureeTraitement shows: "En cours" or "En attente"`);
        console.log(`     Should show: number of days\n`);
      });

      log(colors.yellow, '   💡 FIX: These should have been set automatically by markAsProcessed()');
      console.log(`   Check if the workflow is working correctly\n`);
    } else {
      log(colors.green, '   ✅ No TRAITÉ without dateCloture found!\n');
    }

    log(colors.cyan, '='.repeat(80));
    log(colors.bright, '\n📊 SUMMARY:\n');
    console.log(`   Invalid dateCloture: ${invalidDateCloture.length}`);
    console.log(`   VIREMENT_EXECUTE without dateCloture: ${virementWithoutCloture.length}`);
    console.log(`   TRAITÉ without dateCloture: ${traiteWithoutCloture.length}`);
    console.log(`   Total problems: ${invalidDateCloture.length + virementWithoutCloture.length + traiteWithoutCloture.length}\n`);

    if (invalidDateCloture.length + virementWithoutCloture.length + traiteWithoutCloture.length === 0) {
      log(colors.green + colors.bright, '   🎉 NO PROBLEMS FOUND! Database is clean!\n');
    }

  } catch (error) {
    log(colors.red, '❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

findProblems();
