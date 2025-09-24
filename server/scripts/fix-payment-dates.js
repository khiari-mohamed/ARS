const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixPaymentDates() {
  console.log('🔧 CORRECTION DES DATES DE PAIEMENT');
  console.log('===================================\n');

  try {
    // Find all confirmed virements that don't have corresponding payment dates on bordereaux
    const confirmedVirements = await prisma.virement.findMany({
      where: {
        confirmed: true,
        bordereau: {
          dateExecutionVirement: null
        }
      },
      include: {
        bordereau: {
          select: {
            id: true,
            reference: true,
            clientId: true
          }
        }
      }
    });

    console.log(`🔍 Virements confirmés sans date de paiement: ${confirmedVirements.length}`);

    if (confirmedVirements.length === 0) {
      console.log('✅ Aucune correction nécessaire - toutes les dates sont synchronisées');
      return;
    }

    console.log('\n📋 Correction en cours...');

    let corrected = 0;
    for (const virement of confirmedVirements) {
      try {
        // Use the virement's confirmedAt date as the execution date
        const executionDate = virement.confirmedAt || virement.dateExecution;
        
        await prisma.bordereau.update({
          where: { id: virement.bordereauId },
          data: {
            dateDepotVirement: virement.dateDepot,
            dateExecutionVirement: executionDate,
            statut: 'VIREMENT_EXECUTE'
          }
        });

        console.log(`   ✅ ${virement.bordereau.reference}: ${executionDate.toLocaleDateString()}`);
        corrected++;
      } catch (error) {
        console.log(`   ❌ ${virement.bordereau.reference}: ${error.message}`);
      }
    }

    console.log(`\n📊 RÉSULTATS:`);
    console.log(`   • Virements traités: ${confirmedVirements.length}`);
    console.log(`   • Corrections réussies: ${corrected}`);
    console.log(`   • Erreurs: ${confirmedVirements.length - corrected}`);

    // Verify the fix by running the same test
    console.log('\n🧪 VÉRIFICATION POST-CORRECTION:');
    const testClientId = await getFirstClientId();
    
    if (testClientId) {
      const paymentStats = await getPaymentTimingStats(testClientId);
      console.log(`   • Payés dans les délais: ${paymentStats.paidOnTime}`);
      console.log(`   • Payés en retard: ${paymentStats.paidLate}`);
      console.log(`   • Total sinistres payés: ${paymentStats.totalPaid}`);
      console.log(`   • Taux de ponctualité: ${paymentStats.onTimeRate.toFixed(1)}%`);
    }

  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function getFirstClientId() {
  const client = await prisma.client.findFirst({
    select: { id: true, name: true }
  });
  return client?.id;
}

async function getPaymentTimingStats(clientId) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { reglementDelay: true }
  });

  const reglementDelay = client?.reglementDelay || 30;

  const bordereauxWithPayments = await prisma.bordereau.findMany({
    where: { 
      clientId,
      dateExecutionVirement: { not: null }
    },
    select: {
      dateReception: true,
      dateExecutionVirement: true,
      delaiReglement: true
    }
  });

  let paidOnTime = 0;
  let paidLate = 0;
  const totalPaid = bordereauxWithPayments.length;

  bordereauxWithPayments.forEach(bordereau => {
    if (bordereau.dateExecutionVirement && bordereau.dateReception) {
      const daysTaken = Math.floor(
        (bordereau.dateExecutionVirement.getTime() - bordereau.dateReception.getTime()) / (1000 * 60 * 60 * 24)
      );
      const deadline = bordereau.delaiReglement || reglementDelay;
      
      if (daysTaken <= deadline) {
        paidOnTime++;
      } else {
        paidLate++;
      }
    }
  });

  return {
    totalPaid,
    paidOnTime,
    paidLate,
    onTimeRate: totalPaid > 0 ? (paidOnTime / totalPaid) * 100 : 0
  };
}

// Run the fix
fixPaymentDates().catch(console.error);