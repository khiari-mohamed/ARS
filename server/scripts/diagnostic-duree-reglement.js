/**
 * 🔍 DIAGNOSTIC SCRIPT: Durée de Traitement Formula Comparison (CORRECTED)
 * 
 * This script will:
 * 1. Fetch 2 bordereaux from DB (1 TRAITÉ, 1 not TRAITÉ)
 * 2. Apply BOTH formulas (OLD and NEW) for DURÉE DE TRAITEMENT
 * 3. Show what the UI should display
 * 4. Help identify which formula is actually being used
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Color codes for terminal output
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

async function diagnoseDureeReglement() {
  try {
    log(colors.cyan + colors.bright, '\n🔍 DIAGNOSTIC: Durée de Traitement Formula\n');
    log(colors.cyan, '='.repeat(80));

    // 1. Get one TRAITÉ bordereau
    const bordereauTraite = await prisma.bordereau.findFirst({
      where: { statut: 'TRAITE' },
      include: {
        client: true,
        ordresVirement: {
          orderBy: { dateCreation: 'desc' },
          take: 1,
        },
      },
      orderBy: { dateReception: 'desc' },
    });

    // 2. Get one NON-TRAITÉ bordereau (with virement if possible)
    const bordereauNonTraite = await prisma.bordereau.findFirst({
      where: { 
        statut: { not: 'TRAITE' },
      },
      include: {
        client: true,
        ordresVirement: {
          orderBy: { dateCreation: 'desc' },
          take: 1,
        },
      },
      orderBy: { dateReception: 'desc' },
    });

    if (!bordereauTraite && !bordereauNonTraite) {
      log(colors.red, '❌ No bordereaux found in database!');
      return;
    }

    // Process each bordereau
    const bordereaux = [
      { label: 'TRAITÉ', data: bordereauTraite },
      { label: 'NON-TRAITÉ', data: bordereauNonTraite },
    ];

    for (const { label, data: bordereau } of bordereaux) {
      if (!bordereau) {
        log(colors.yellow, `\n⚠️  No ${label} bordereau found, skipping...\n`);
        continue;
      }

      log(colors.blue + colors.bright, `\n📋 BORDEREAU ${label}: ${bordereau.reference}`);
      log(colors.cyan, '-'.repeat(80));

      // Display basic info
      log(colors.bright, '\n📊 Basic Information:');
      console.log(`   Reference:           ${bordereau.reference}`);
      console.log(`   Client:              ${bordereau.client?.fullName || 'N/A'}`);
      console.log(`   Statut:              ${bordereau.statut}`);
      console.log(`   Délai Règlement:     ${bordereau.delaiReglement} jours`);
      console.log(`   Date Réception:      ${bordereau.dateReception?.toISOString().split('T')[0] || 'NULL'}`);
      console.log(`   Date Clôture:        ${bordereau.dateCloture?.toISOString().split('T')[0] || 'NULL'}`);
      console.log(`   Date Exec Virement:  ${bordereau.dateExecutionVirement?.toISOString().split('T')[0] || 'NULL'}`);

      // Check ordre virement dates
      const ordreVirement = bordereau.ordresVirement?.[0];
      if (ordreVirement) {
        console.log(`   OV dateEtatFinal:    ${ordreVirement.dateEtatFinal?.toISOString().split('T')[0] || 'NULL'}`);
        console.log(`   OV dateTraitement:   ${ordreVirement.dateTraitement?.toISOString().split('T')[0] || 'NULL'}`);
      } else {
        console.log(`   Ordre Virement:      None`);
      }

      // Calculate with OLD formula (dateCloture - dateReceptionBO)
      log(colors.yellow + colors.bright, '\n🔴 OLD FORMULA (dateCloture - dateReceptionBO):');
      const oldFormulaDays = calculateDays(bordereau.dateReceptionBO, bordereau.dateCloture);
      
      if (oldFormulaDays !== null) {
        const oldStatus = oldFormulaDays <= bordereau.delaiReglement ? 'GREEN' : 'RED';
        log(colors.yellow, `   Result: ${oldFormulaDays} jours (${oldStatus})`);
        log(colors.yellow, `   UI Display: "${oldFormulaDays} jour${oldFormulaDays !== 1 ? 's' : ''}"`);
      } else {
        log(colors.yellow, `   Result: NULL`);
        log(colors.yellow, `   UI Display: "En attente"`);
      }

      // Calculate with NEW formula (dateCloture - dateReception)
      log(colors.green + colors.bright, '\n🟢 NEW FORMULA (dateCloture - dateReception):');
      const newFormulaDays = calculateDays(bordereau.dateReception, bordereau.dateCloture);
      
      if (newFormulaDays !== null) {
        const newStatus = newFormulaDays <= bordereau.delaiReglement ? 'GREEN' : 'RED';
        log(colors.green, `   Result: ${newFormulaDays} jours (${newStatus})`);
        log(colors.green, `   UI Display: "${newFormulaDays} jour${newFormulaDays !== 1 ? 's' : ''}"`);
      } else {
        log(colors.green, `   Result: NULL`);
        log(colors.green, `   UI Display: "En attente"`);
      }

      // Expected behavior
      log(colors.cyan + colors.bright, '\n✅ EXPECTED BEHAVIOR (NEW FORMULA):');
      if (bordereau.statut === 'TRAITE' && bordereau.dateCloture) {
        log(colors.green, `   Should show: ${newFormulaDays} jours`);
      } else {
        log(colors.green, `   Should show: "En attente"`);
      }

      // Comparison
      log(colors.bright, '\n🔍 COMPARISON:');
      console.log(`   Old Formula Result:  ${oldFormulaDays !== null ? oldFormulaDays + ' jours' : 'En attente'}`);
      console.log(`   New Formula Result:  ${newFormulaDays !== null ? newFormulaDays + ' jours' : 'En attente'}`);
      
      if (oldFormulaDays === newFormulaDays) {
        log(colors.green, `   ✅ Both formulas give SAME result`);
      } else {
        log(colors.red, `   ⚠️  Formulas give DIFFERENT results!`);
      }

      log(colors.cyan, '\n' + '='.repeat(80));
    }

    // Instructions
    log(colors.bright + colors.cyan, '\n📝 HOW TO USE THIS DIAGNOSTIC:\n');
    console.log('1. Check the UI for these bordereaux references');
    console.log('2. Look at the "Durée de traitement" column (NOT Durée de règlement)');
    console.log('3. Compare what you see in UI with:');
    console.log('   - 🔴 OLD FORMULA result (if UI matches this, backend not updated)');
    console.log('   - 🟢 NEW FORMULA result (if UI matches this, backend is correct)');
    console.log('4. If UI shows OLD formula result:');
    console.log('   → Backend not using new code OR browser cache');
    console.log('5. If UI shows NEW formula result:');
    console.log('   → Backend is correct! ✅');
    console.log('\n');

    log(colors.yellow, '💡 TIP: Look at "Durée de traitement" column, NOT "Durée de règlement"\n');

  } catch (error) {
    log(colors.red, '❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the diagnostic
diagnoseDureeReglement();
