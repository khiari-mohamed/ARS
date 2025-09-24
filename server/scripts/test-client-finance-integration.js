const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testClientFinanceIntegration() {
  console.log('🧪 TEST INTÉGRATION CLIENT-FINANCE');
  console.log('===================================\n');

  try {
    // Test the exact same logic as in client.service.ts
    const clientId = await getFirstClientId();
    
    if (!clientId) {
      console.log('❌ Aucun client trouvé dans la base de données');
      return;
    }

    console.log(`🏢 Test avec client ID: ${clientId}\n`);

    // Test payment timing stats (same as client.service.ts lines 280-320)
    const paymentStats = await getPaymentTimingStats(clientId);
    console.log('📊 STATISTIQUES DE PAIEMENT (Module Finance):');
    console.log(`   • Payés dans les délais: ${paymentStats.paidOnTime}`);
    console.log(`   • Payés en retard: ${paymentStats.paidLate}`);
    console.log(`   • Total sinistres payés: ${paymentStats.totalPaid}`);
    console.log(`   • Taux de ponctualité: ${paymentStats.onTimeRate.toFixed(1)}%\n`);

    // Test reclamation timing stats (same as client.service.ts lines 322-350)
    const reclamationStats = await getReclamationTimingStats(clientId);
    console.log('📞 STATISTIQUES DE RÉCLAMATIONS:');
    console.log(`   • Traitées dans les délais: ${reclamationStats.handledOnTime}`);
    console.log(`   • Traitées en retard: ${reclamationStats.handledLate}`);
    console.log(`   • Total réclamations traitées: ${reclamationStats.totalHandled}`);
    console.log(`   • Taux de ponctualité: ${reclamationStats.onTimeRate.toFixed(1)}%\n`);

    // Test the complete performance metrics call
    const performanceMetrics = await getPerformanceMetrics(clientId);
    console.log('🎯 MÉTRIQUES DE PERFORMANCE COMPLÈTES:');
    console.log('   Payment Stats:', JSON.stringify(performanceMetrics.paymentStats, null, 2));
    console.log('   Reclamation Stats:', JSON.stringify(performanceMetrics.reclamationTimingStats, null, 2));

    // Verify data sources
    console.log('\n🔍 VÉRIFICATION DES SOURCES DE DONNÉES:');
    await verifyDataSources(clientId);

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function getFirstClientId() {
  const client = await prisma.client.findFirst({
    select: { id: true, name: true }
  });
  if (client) {
    console.log(`📋 Client sélectionné: ${client.name}`);
  }
  return client?.id;
}

// Exact copy of client.service.ts getPaymentTimingStats method
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

// Exact copy of client.service.ts getReclamationTimingStats method
async function getReclamationTimingStats(clientId) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { reclamationDelay: true }
  });

  const reclamationDelay = client?.reclamationDelay || 48;

  const reclamations = await prisma.reclamation.findMany({
    where: { clientId },
    select: {
      createdAt: true,
      updatedAt: true,
      status: true
    }
  });

  let handledOnTime = 0;
  let handledLate = 0;
  const totalHandled = reclamations.length;

  reclamations.forEach(reclamation => {
    if (reclamation.updatedAt && reclamation.createdAt && reclamation.updatedAt > reclamation.createdAt) {
      const hoursToHandle = Math.floor(
        (reclamation.updatedAt.getTime() - reclamation.createdAt.getTime()) / (1000 * 60 * 60)
      );
      
      if (hoursToHandle <= reclamationDelay) {
        handledOnTime++;
      } else {
        handledLate++;
      }
    }
  });

  return {
    totalHandled,
    handledOnTime,
    handledLate,
    onTimeRate: totalHandled > 0 ? (handledOnTime / totalHandled) * 100 : 0
  };
}

// Exact copy of client.service.ts getPerformanceMetrics method
async function getPerformanceMetrics(clientId) {
  const client = await prisma.client.findUnique({ 
    where: { id: clientId },
    select: { reglementDelay: true, reclamationDelay: true }
  });
  
  if (!client) throw new Error('Client not found');

  const [paymentStats, reclamationTimingStats] = await Promise.all([
    getPaymentTimingStats(clientId),
    getReclamationTimingStats(clientId)
  ]);

  return {
    paymentStats,
    reclamationTimingStats
  };
}

async function verifyDataSources(clientId) {
  // Check bordereaux with payment dates
  const bordereauxCount = await prisma.bordereau.count({
    where: { clientId }
  });

  const bordereauxWithPayment = await prisma.bordereau.count({
    where: { 
      clientId,
      dateExecutionVirement: { not: null }
    }
  });

  console.log(`   • Total bordereaux: ${bordereauxCount}`);
  console.log(`   • Bordereaux avec date de paiement: ${bordereauxWithPayment}`);
  console.log(`   • Couverture paiement: ${bordereauxCount > 0 ? ((bordereauxWithPayment / bordereauxCount) * 100).toFixed(1) : 0}%`);

  // Check reclamations
  const reclamationsCount = await prisma.reclamation.count({
    where: { clientId }
  });

  console.log(`   • Total réclamations: ${reclamationsCount}`);

  // Check virements (Finance module)
  const virementsCount = await prisma.virement.count({
    where: {
      bordereau: { clientId }
    }
  });

  console.log(`   • Virements (Finance): ${virementsCount}`);

  // Sample data
  if (bordereauxWithPayment > 0) {
    const sampleBordereau = await prisma.bordereau.findFirst({
      where: { 
        clientId,
        dateExecutionVirement: { not: null }
      },
      select: {
        reference: true,
        dateReception: true,
        dateExecutionVirement: true,
        delaiReglement: true
      }
    });

    if (sampleBordereau) {
      const daysTaken = Math.floor(
        (sampleBordereau.dateExecutionVirement.getTime() - sampleBordereau.dateReception.getTime()) / (1000 * 60 * 60 * 24)
      );
      console.log(`\n   📋 Exemple de bordereau avec paiement:`);
      console.log(`      - Référence: ${sampleBordereau.reference}`);
      console.log(`      - Réception: ${sampleBordereau.dateReception.toLocaleDateString()}`);
      console.log(`      - Paiement: ${sampleBordereau.dateExecutionVirement.toLocaleDateString()}`);
      console.log(`      - Délai: ${daysTaken} jours (limite: ${sampleBordereau.delaiReglement})`);
    }
  }
}

// Run the test
testClientFinanceIntegration().catch(console.error);