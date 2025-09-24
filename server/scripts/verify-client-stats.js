const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyClientStats() {
  console.log('🔍 VERIFYING CLIENT STATISTICS DATA...\n');

  try {
    // Get all clients
    const clients = await prisma.client.findMany({
      select: {
        id: true,
        name: true,
        reglementDelay: true,
        reclamationDelay: true
      }
    });

    console.log(`📋 Found ${clients.length} clients in database\n`);

    for (const client of clients) {
      console.log(`\n🏢 CLIENT: ${client.name} (ID: ${client.id.slice(0, 8)})`);
      console.log(`   Délai Règlement: ${client.reglementDelay} jours`);
      console.log(`   Délai Réclamation: ${client.reclamationDelay} heures`);

      // 1. PAYMENT STATS (Finance Module Integration)
      console.log('\n💰 PAYMENT STATISTICS:');
      
      const bordereauxWithPayments = await prisma.bordereau.findMany({
        where: { 
          clientId: client.id,
          dateExecutionVirement: { not: null }
        },
        select: {
          reference: true,
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
          const deadline = bordereau.delaiReglement || client.reglementDelay;
          
          console.log(`   📄 ${bordereau.reference}: ${daysTaken} jours (limite: ${deadline}j) - ${daysTaken <= deadline ? '✅ À temps' : '❌ En retard'}`);
          
          if (daysTaken <= deadline) {
            paidOnTime++;
          } else {
            paidLate++;
          }
        }
      });

      const paymentOnTimeRate = totalPaid > 0 ? (paidOnTime / totalPaid) * 100 : 0;

      console.log(`   📊 RÉSULTATS PAIEMENTS:`);
      console.log(`      ✅ Payés dans les délais: ${paidOnTime}`);
      console.log(`      ❌ Payés en retard: ${paidLate}`);
      console.log(`      📈 Total sinistres payés: ${totalPaid}`);
      console.log(`      📊 Taux de ponctualité: ${paymentOnTimeRate.toFixed(1)}%`);

      // 2. RECLAMATION STATS
      console.log('\n📞 RECLAMATION STATISTICS:');
      
      const reclamations = await prisma.reclamation.findMany({
        where: { 
          clientId: client.id,
          status: { in: ['closed', 'CLOSED', 'resolved', 'RESOLVED'] }
        },
        select: {
          type: true,
          createdAt: true,
          updatedAt: true
        }
      });

      let handledOnTime = 0;
      let handledLate = 0;
      const totalHandled = reclamations.length;

      reclamations.forEach(reclamation => {
        const hoursToHandle = Math.floor(
          (reclamation.updatedAt.getTime() - reclamation.createdAt.getTime()) / (1000 * 60 * 60)
        );
        
        console.log(`   📞 ${reclamation.type}: ${hoursToHandle}h (limite: ${client.reclamationDelay}h) - ${hoursToHandle <= client.reclamationDelay ? '✅ À temps' : '❌ En retard'}`);
        
        if (hoursToHandle <= client.reclamationDelay) {
          handledOnTime++;
        } else {
          handledLate++;
        }
      });

      const reclamationOnTimeRate = totalHandled > 0 ? (handledOnTime / totalHandled) * 100 : 0;

      console.log(`   📊 RÉSULTATS RÉCLAMATIONS:`);
      console.log(`      ✅ Traitées dans les délais: ${handledOnTime}`);
      console.log(`      ❌ Traitées en retard: ${handledLate}`);
      console.log(`      📈 Total réclamations traitées: ${totalHandled}`);
      console.log(`      📊 Taux de ponctualité: ${reclamationOnTimeRate.toFixed(1)}%`);

      // 3. GENERAL STATS
      console.log('\n📈 GENERAL STATISTICS:');
      const [bordereauxCount, reclamationsCount, contractsCount] = await Promise.all([
        prisma.bordereau.count({ where: { clientId: client.id } }),
        prisma.reclamation.count({ where: { clientId: client.id } }),
        prisma.contract.count({ where: { clientId: client.id } })
      ]);

      console.log(`      📄 Total Bordereaux: ${bordereauxCount}`);
      console.log(`      📞 Total Réclamations: ${reclamationsCount}`);
      console.log(`      📑 Total Contrats: ${contractsCount}`);

      console.log('\n' + '='.repeat(80));
    }

    console.log('\n✅ VERIFICATION COMPLETE!');
    console.log('\n🎯 WHAT TO CHECK:');
    console.log('   1. Compare these numbers with the UI values');
    console.log('   2. If UI shows 0s but database has data, there might be an API issue');
    console.log('   3. If numbers match, the integration is working perfectly!');

  } catch (error) {
    console.error('❌ Error verifying client stats:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the verification
verifyClientStats();