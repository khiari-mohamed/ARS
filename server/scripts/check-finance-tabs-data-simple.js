const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkFinanceTabsData() {
  console.log('🔍 Checking Finance Tabs Data...\n');

  try {
    // 1. ALERTES & RETARD TAB DATA
    console.log('🚨 ALERTES & RETARD:');
    
    const delayedBordereaux = await prisma.bordereau.count({
      where: {
        statut: { in: ['EN_COURS', 'ASSIGNE'] }
      }
    });

    const overdueVirements = await prisma.ordreVirement.count({
      where: {
        etatVirement: { in: ['NON_EXECUTE', 'EN_COURS_EXECUTION'] }
      }
    });

    console.log(`  Bordereaux en retard: ${delayedBordereaux}`);
    console.log(`  Virements en retard: ${overdueVirements}`);

    // 2. FORMAT BANCAIRE TAB DATA
    console.log('\n🏦 FORMAT BANCAIRE:');
    
    const totalFormats = await prisma.donneurOrdre.count();
    const activeFormats = await prisma.donneurOrdre.count({
      where: { statut: 'ACTIF' }
    });

    console.log(`  Total formats bancaires: ${totalFormats}`);
    console.log(`  Formats actifs: ${activeFormats}`);

    // 3. RAPPROCHEMENT AUTOMATIQUE TAB DATA
    console.log('\n🔄 RAPPROCHEMENT AUTOMATIQUE:');
    
    const totalBordereaux = await prisma.bordereau.count();
    const reconciledBordereaux = await prisma.bordereau.count({
      where: {
        virement: { isNot: null }
      }
    });

    const totalVirementAmount = await prisma.virement.aggregate({
      _sum: { montant: true }
    });

    console.log(`  Total bordereaux: ${totalBordereaux}`);
    console.log(`  Bordereaux rapprochés: ${reconciledBordereaux}`);
    console.log(`  Montant total: ${totalVirementAmount._sum.montant || 0} TND`);

    // 4. RAPPORT FINANCIER TAB DATA
    console.log('\n📊 RAPPORT FINANCIER:');
    
    const totalVirements = await prisma.virement.count();
    const confirmedVirements = await prisma.virement.count({
      where: { confirmed: true }
    });

    const totalOrdres = await prisma.ordreVirement.count();
    const ordresByStatus = await prisma.ordreVirement.groupBy({
      by: ['etatVirement'],
      _count: { etatVirement: true }
    });

    console.log(`  Total virements: ${totalVirements}`);
    console.log(`  Virements confirmés: ${confirmedVirements}`);
    console.log(`  Total ordres de virement: ${totalOrdres}`);
    
    console.log('  Répartition par état:');
    ordresByStatus.forEach(stat => {
      console.log(`    - ${stat.etatVirement}: ${stat._count.etatVirement}`);
    });

    // 5. ADDITIONAL DATA
    console.log('\n📈 DONNÉES SUPPLÉMENTAIRES:');
    
    const totalMembers = await prisma.member.count();
    const totalSocieties = await prisma.society.count();
    const totalClients = await prisma.client.count();

    console.log(`  Total membres: ${totalMembers}`);
    console.log(`  Total sociétés: ${totalSocieties}`);
    console.log(`  Total clients: ${totalClients}`);

    // 6. DATA SUMMARY FOR TABS
    console.log('\n📋 RÉSUMÉ PAR TAB:');
    console.log(`  ✅ Alertes Tab: ${delayedBordereaux + overdueVirements} alertes potentielles`);
    console.log(`  ✅ Format Bancaire Tab: ${totalFormats} formats disponibles`);
    console.log(`  ✅ Rapprochement Tab: ${reconciledBordereaux}/${totalBordereaux} rapprochés`);
    console.log(`  ✅ Rapport Financier Tab: ${totalVirements} virements, ${totalOrdres} ordres`);

    console.log('\n✅ Finance Tabs Data Check Complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkFinanceTabsData();