const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function extractFinanceData() {
  console.log('🔍 EXTRACTING ALL FINANCE MODULE DATA');
  console.log('=====================================\n');

  try {
    // 1. BORDEREAUX DATA
    console.log('📋 1. BORDEREAUX DATA');
    console.log('---------------------');
    const bordereaux = await prisma.bordereau.findMany({
      include: {
        client: true,
        ordresVirement: true,
        virement: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Total Bordereaux: ${bordereaux.length}`);
    console.log('\nBordereaux by Status:');
    const bordereauxByStatus = bordereaux.reduce((acc, b) => {
      acc[b.statut] = (acc[b.statut] || 0) + 1;
      return acc;
    }, {});
    console.table(bordereauxByStatus);
    
    console.log('\nBordereaux TRAITÉ (for Suivi & Statut tab):');
    const bordereauxTraites = bordereaux.filter(b => b.statut === 'TRAITE');
    console.log(`Count: ${bordereauxTraites.length}`);
    bordereauxTraites.forEach(b => {
      console.log(`- ${b.reference} | ${b.client.name} | ${b.nombreBS} BS | ${b.dateCloture ? new Date(b.dateCloture).toLocaleDateString() : 'No closure date'}`);
    });

    // 2. ORDRE VIREMENT DATA
    console.log('\n📄 2. ORDRE VIREMENT DATA');
    console.log('-------------------------');
    const ordresVirement = await prisma.ordreVirement.findMany({
      include: {
        bordereau: { include: { client: true } },
        donneurOrdre: true,
        items: { include: { adherent: true } },
        historique: true
      },
      orderBy: { dateCreation: 'desc' }
    });
    
    console.log(`Total Ordres Virement: ${ordresVirement.length}`);
    console.log('\nOrdres by Status:');
    const ovByStatus = ordresVirement.reduce((acc, ov) => {
      acc[ov.etatVirement] = (acc[ov.etatVirement] || 0) + 1;
      return acc;
    }, {});
    console.table(ovByStatus);
    
    console.log('\nRecent Ordres Virement (for Dashboard):');
    ordresVirement.slice(0, 10).forEach(ov => {
      console.log(`- ${ov.reference} | ${ov.bordereau?.client?.name || 'Manual Entry'} | ${ov.montantTotal} TND | ${ov.etatVirement} | ${ov.demandeRecuperation ? 'Recovery Requested' : 'No Recovery'}`);
    });

    // 3. VIREMENT DATA (Legacy)
    console.log('\n💰 3. VIREMENT DATA (Legacy)');
    console.log('----------------------------');
    const virements = await prisma.virement.findMany({
      include: {
        bordereau: { include: { client: true } },
        confirmedBy: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Total Virements: ${virements.length}`);
    console.log(`Confirmed: ${virements.filter(v => v.confirmed).length}`);
    console.log(`Pending: ${virements.filter(v => !v.confirmed).length}`);

    // 4. ADHERENTS DATA
    console.log('\n👥 4. ADHERENTS DATA');
    console.log('-------------------');
    const adherents = await prisma.adherent.findMany({
      include: { client: true },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Total Adherents: ${adherents.length}`);
    console.log('\nAdherents by Client:');
    const adherentsByClient = adherents.reduce((acc, a) => {
      acc[a.client.name] = (acc[a.client.name] || 0) + 1;
      return acc;
    }, {});
    console.table(adherentsByClient);

    // 5. DONNEUR ORDRE DATA
    console.log('\n🏦 5. DONNEUR ORDRE DATA');
    console.log('-----------------------');
    const donneursOrdre = await prisma.donneurOrdre.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Total Donneurs d'Ordre: ${donneursOrdre.length}`);
    donneursOrdre.forEach(d => {
      console.log(`- ${d.nom} | ${d.banque} | ${d.statut}`);
    });

    // 6. SUIVI VIREMENT DATA
    console.log('\n📊 6. SUIVI VIREMENT DATA');
    console.log('-------------------------');
    const suiviVirements = await prisma.suiviVirement.findMany({
      include: {
        ordreVirement: { include: { donneurOrdre: true } }
      },
      orderBy: { dateInjection: 'desc' }
    });
    
    console.log(`Total Suivi Virements: ${suiviVirements.length}`);
    console.log('\nSuivi by Status:');
    const suiviByStatus = suiviVirements.reduce((acc, s) => {
      acc[s.etatVirement] = (acc[s.etatVirement] || 0) + 1;
      return acc;
    }, {});
    console.table(suiviByStatus);

    // 7. WIRE TRANSFER BATCH DATA (New System)
    console.log('\n🔄 7. WIRE TRANSFER BATCH DATA');
    console.log('------------------------------');
    const wireTransferBatches = await prisma.wireTransferBatch.findMany({
      include: {
        society: true,
        donneur: true,
        transfers: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Total Wire Transfer Batches: ${wireTransferBatches.length}`);
    console.log('\nBatches by Status:');
    const batchesByStatus = wireTransferBatches.reduce((acc, b) => {
      acc[b.status] = (acc[b.status] || 0) + 1;
      return acc;
    }, {});
    console.table(batchesByStatus);

    // 8. FINANCE DASHBOARD SUMMARY
    console.log('\n📈 8. FINANCE DASHBOARD SUMMARY');
    console.log('-------------------------------');
    const totalOrdres = ordresVirement.length + virements.length;
    const ordresEnCours = ordresVirement.filter(o => o.etatVirement === 'EN_COURS_EXECUTION').length + virements.filter(v => !v.confirmed).length;
    const ordresExecutes = ordresVirement.filter(o => o.etatVirement === 'EXECUTE').length + virements.filter(v => v.confirmed).length;
    const ordresRejetes = ordresVirement.filter(o => o.etatVirement === 'REJETE').length;
    const montantTotal = ordresVirement.reduce((sum, ov) => sum + ov.montantTotal, 0) + virements.reduce((sum, v) => sum + v.montant, 0);
    const demandesRecuperation = ordresVirement.filter(ov => ov.demandeRecuperation).length;
    const montantsRecuperes = ordresVirement.filter(ov => ov.montantRecupere).length;

    console.log('Dashboard Stats:');
    console.table({
      'Total Ordres': totalOrdres,
      'En Cours': ordresEnCours,
      'Exécutés': ordresExecutes,
      'Rejetés': ordresRejetes,
      'Montant Total (TND)': montantTotal,
      'Demandes Récupération': demandesRecuperation,
      'Montants Récupérés': montantsRecuperes
    });

    // 9. TRACKING TAB DATA ANALYSIS
    console.log('\n🎯 9. TRACKING TAB DATA ANALYSIS');
    console.log('---------------------------------');
    console.log('OV Tracking Records (what should appear in Suivi & Statut):');
    
    // Simulate the getOVTracking service
    const trackingData = wireTransferBatches.map(batch => {
      const now = new Date();
      const delayDays = Math.floor((now.getTime() - batch.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      const lastHistory = batch.history?.[0];
      const totalAmount = batch.transfers.reduce((sum, t) => sum + t.amount, 0);
      
      return {
        id: batch.id,
        reference: `OV/${batch.createdAt.getFullYear()}/${batch.id.substring(0, 8)}`,
        society: batch.society.name,
        dateInjected: batch.createdAt.toISOString().split('T')[0],
        dateExecuted: lastHistory?.changedAt ? lastHistory.changedAt.toISOString().split('T')[0] : null,
        status: mapBatchStatusToOV(batch.status),
        delay: delayDays,
        observations: lastHistory ? `Last change: ${lastHistory.status}` : 'Created',
        donneurOrdre: batch.donneur.name,
        totalAmount
      };
    });
    
    console.log(`Tracking Records Count: ${trackingData.length}`);
    trackingData.slice(0, 5).forEach(record => {
      console.log(`- ${record.reference} | ${record.society} | ${record.status} | ${record.totalAmount} TND`);
    });

    // 10. DATA VALIDATION
    console.log('\n✅ 10. DATA VALIDATION');
    console.log('----------------------');
    console.log('Checking data consistency...');
    
    const issues = [];
    
    // Check for bordereaux without clients
    const bordereauxWithoutClients = bordereaux.filter(b => !b.client);
    if (bordereauxWithoutClients.length > 0) {
      issues.push(`${bordereauxWithoutClients.length} bordereaux without clients`);
    }
    
    // Check for OV without amounts
    const ovWithoutAmounts = ordresVirement.filter(ov => !ov.montantTotal || ov.montantTotal === 0);
    if (ovWithoutAmounts.length > 0) {
      issues.push(`${ovWithoutAmounts.length} ordres virement without amounts`);
    }
    
    // Check for invalid dates
    const invalidDates = ordresVirement.filter(ov => !ov.dateCreation || isNaN(new Date(ov.dateCreation).getTime()));
    if (invalidDates.length > 0) {
      issues.push(`${invalidDates.length} ordres virement with invalid dates`);
    }
    
    if (issues.length === 0) {
      console.log('✅ No data issues found!');
    } else {
      console.log('⚠️ Issues found:');
      issues.forEach(issue => console.log(`  - ${issue}`));
    }

    console.log('\n🎉 DATA EXTRACTION COMPLETE!');
    console.log('============================');

  } catch (error) {
    console.error('❌ Error extracting data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function mapBatchStatusToOV(status) {
  const statusMap = {
    'CREATED': 'NON_EXECUTE',
    'VALIDATED': 'EN_COURS_EXECUTION',
    'PROCESSED': 'EXECUTE',
    'REJECTED': 'REJETE',
    'ARCHIVED': 'EXECUTE',
    'BLOCKED': 'BLOQUE'
  };
  return statusMap[status] || 'NON_EXECUTE';
}

// Run the extraction
extractFinanceData();