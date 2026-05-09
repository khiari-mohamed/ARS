/**
 * 🔍 SPECIFIC DIAGNOSTIC: Check specific bordereaux from user's table
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

function calculateDays(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

async function checkSpecificBordereaux() {
  try {
    log(colors.cyan + colors.bright, '\n🔍 CHECKING SPECIFIC BORDEREAUX FROM USER TABLE\n');
    log(colors.cyan, '='.repeat(100));

    // References from user's table that showed unexpected values
    const references = [
      'C-BULLETIN-2026-38057',  // Showed 35 jours but status is ASSIGNE
      'ALT SFAX ACTIFS BR 27-2025',  // Showed 22 jours but status is ASSIGNE
      'DTT-BULLETIN-2026-74641',  // Showed "En attente" - correct
      'PGH-BR 23-BBM BM',  // Showed "En attente" but status is VIREMENT_EXECUTE
    ];

    for (const ref of references) {
      const bordereau = await prisma.bordereau.findFirst({
        where: { 
          reference: { contains: ref.split('-')[0] }  // Partial match
        },
        include: {
          client: true,
          ordresVirement: {
            orderBy: { dateCreation: 'desc' },
            take: 1,
          },
        },
      });

      if (!bordereau) {
        log(colors.yellow, `\n⚠️  Bordereau "${ref}" not found (trying partial match...)`);
        continue;
      }

      log(colors.blue + colors.bright, `\n📋 ${bordereau.reference}`);
      log(colors.cyan, '-'.repeat(100));

      console.log(`   Statut:              ${bordereau.statut}`);
      console.log(`   Date Réception:      ${bordereau.dateReception?.toISOString().split('T')[0] || 'NULL'}`);
      console.log(`   Date Clôture:        ${bordereau.dateCloture?.toISOString().split('T')[0] || 'NULL'}`);
      console.log(`   Délai Règlement:     ${bordereau.delaiReglement} jours`);

      const ordreVirement = bordereau.ordresVirement?.[0];
      const dateExecutionVirement = ordreVirement?.dateEtatFinal || 
                                    ordreVirement?.dateTraitement || 
                                    bordereau.dateExecutionVirement;

      if (dateExecutionVirement) {
        console.log(`   Date Exec Virement:  ${new Date(dateExecutionVirement).toISOString().split('T')[0]}`);
      } else {
        console.log(`   Date Exec Virement:  NULL`);
      }

      // OLD Formula
      const oldDays = calculateDays(bordereau.dateReception, dateExecutionVirement);
      log(colors.red, `\n   🔴 OLD: ${oldDays !== null ? oldDays + ' jours' : 'En attente'}`);

      // NEW Formula
      const newDays = calculateDays(bordereau.dateReception, bordereau.dateCloture);
      log(colors.green, `   🟢 NEW: ${newDays !== null ? newDays + ' jours' : 'En attente'}`);

      // Expected
      if (bordereau.statut === 'TRAITE') {
        log(colors.cyan, `   ✅ EXPECTED: ${newDays !== null ? newDays + ' jours' : 'En attente'} (TRAITÉ)`);
      } else {
        log(colors.cyan, `   ✅ EXPECTED: En attente (Status: ${bordereau.statut}, not TRAITÉ)`);
      }

      // Check if dateCloture exists but shouldn't
      if (bordereau.dateCloture && bordereau.statut !== 'TRAITE') {
        log(colors.red + colors.bright, `   ⚠️  WARNING: dateCloture exists but status is ${bordereau.statut} (not TRAITÉ)!`);
        log(colors.yellow, `   → This bordereau has invalid data in database`);
        log(colors.yellow, `   → Should run: UPDATE "Bordereau" SET "dateCloture" = NULL WHERE id = '${bordereau.id}';`);
      }
    }

    log(colors.cyan, '\n' + '='.repeat(100));
    log(colors.bright, '\n📝 SUMMARY:\n');
    console.log('If you see bordereaux with:');
    console.log('  - Status NOT "TRAITÉ" but dateCloture exists → Database has invalid data');
    console.log('  - UI shows number but should show "En attente" → Clear browser cache');
    console.log('  - UI matches NEW formula → Backend is correct ✅');
    console.log('  - UI matches OLD formula → Backend not updated ❌\n');

  } catch (error) {
    log(colors.red, '❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSpecificBordereaux();
