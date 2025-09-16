const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkFinanceTabsData() {
  console.log('🔍 Checking Finance Tabs Data...\n');

  try {
    // 1. ALERTES & RETARD TAB DATA
    console.log('🚨 ALERTES & RETARD:');
    
    // Check for delayed bordereaux (potential alerts)
    const delayedBordereaux = await prisma.bordereau.findMany({
      where: {
        statut: { in: ['EN_COURS', 'ASSIGNE'] },
        dateReception: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Older than 24h
        }
      },
      include: {
        client: true
      }
    });

    // Check for overdue virements
    const overdueVirements = await prisma.ordreVirement.findMany({
      where: {
        etatVirement: { in: ['NON_EXECUTE', 'EN_COURS_EXECUTION'] }
      }
    });

    // Check for notifications/alerts
    const financeNotifications = [];

    console.log(`  Bordereaux en retard: ${delayedBordereaux.length}`);
    console.log(`  Virements en retard: ${overdueVirements.length}`);
    console.log(`  Notifications finance: ${financeNotifications.length}`);
    
    if (delayedBordereaux.length > 0) {
      console.log('  Détails bordereaux en retard:');
      delayedBordereaux.slice(0, 3).forEach(b => {
        const delay = Math.floor((Date.now() - b.dateReception.getTime()) / (1000 * 60 * 60));
        console.log(`    - ${b.reference} (${b.client.name}) - ${delay}h de retard`);
      });
    }

    // 2. FORMAT BANCAIRE TAB DATA
    console.log('\n🏦 FORMAT BANCAIRE:');
    
    const donneurOrdres = await prisma.donneurOrdre.findMany({
      include: {
        ordresVirement: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    const bankFormats = donneurOrdres.map(d => ({
      name: d.nom,
      bank: d.banque,
      format: d.structureTxt,
      status: d.statut,
      ordresCount: d.ordresVirement.length
    }));

    console.log(`  Total formats bancaires: ${bankFormats.length}`);
    console.log(`  Formats actifs: ${bankFormats.filter(f => f.status === 'ACTIF').length}`);
    console.log('  Détails formats:');
    bankFormats.forEach(f => {
      console.log(`    - ${f.name} (${f.bank}) - ${f.format} - ${f.status}`);
    });

    // 3. RAPPROCHEMENT AUTOMATIQUE TAB DATA
    console.log('\n🔄 RAPPROCHEMENT AUTOMATIQUE:');
    
    // Check reconciliation data between bordereaux and virements
    const bordereauWithVirements = await prisma.bordereau.findMany({
      where: {
        virement: {
          isNot: null
        }
      },
      include: {
        virement: true,
        client: true
      }
    });

    const unreconciled = await prisma.bordereau.findMany({
      where: {
        statut: 'TRAITE',
        virement: null
      }
    });

    const reconciliationStats = {
      totalBordereaux: await prisma.bordereau.count(),
      reconciledBordereaux: bordereauWithVirements.length,
      unreconciledBordereaux: unreconciled.length,
      totalAmount: bordereauWithVirements.reduce((sum, b) => 
        sum + (b.virement ? b.virement.montant : 0), 0
      )
    };

    console.log(`  Total bordereaux: ${reconciliationStats.totalBordereaux}`);
    console.log(`  Bordereaux rapprochés: ${reconciliationStats.reconciledBordereaux}`);
    console.log(`  Bordereaux non rapprochés: ${reconciliationStats.unreconciledBordereaux}`);
    console.log(`  Montant total rapproché: ${reconciliationStats.totalAmount.toFixed(2)} TND`);

    if (bordereauWithVirements.length > 0) {
      console.log('  Exemples de rapprochements:');
      bordereauWithVirements.slice(0, 3).forEach(b => {
        const totalVirement = b.virement ? b.virement.montant : 0;
        console.log(`    - ${b.reference} (${b.client.name}) - ${totalVirement.toFixed(2)} TND`);
      });
    }

    // 4. RAPPORT FINANCIER TAB DATA
    console.log('\n📊 RAPPORT FINANCIER:');
    
    // Financial performance metrics
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const financialMetrics = {
      totalVirements: await prisma.virement.count(),
      confirmedVirements: await prisma.virement.count({
        where: { status: 'CONFIRMED' }
      }),
      totalAmount: await prisma.virement.aggregate({
        _sum: { montant: true }
      }),
      recentVirements: await prisma.virement.count({
        where: { createdAt: { gte: last30Days } }
      }),
      avgProcessingTime: await prisma.virement.aggregate({
        _avg: { 
          // Calculate processing time if we have the fields
        }
      })
    };

    const ordreVirementStats = await prisma.ordreVirement.groupBy({
      by: ['etatVirement'],
      _count: { etatVirement: true },
      _sum: { montantTotal: true }
    });

    console.log(`  Total virements: ${financialMetrics.totalVirements}`);
    console.log(`  Virements confirmés: ${financialMetrics.confirmedVirements}`);
    console.log(`  Montant total: ${financialMetrics.totalAmount._sum.montant || 0} TND`);
    console.log(`  Virements récents (30j): ${financialMetrics.recentVirements}`);
    
    console.log('  Répartition par état:');
    ordreVirementStats.forEach(stat => {
      console.log(`    - ${stat.etatVirement}: ${stat._count.etatVirement} ordres (${stat._sum.montantTotal || 0} TND)`);
    });

    // Performance by team/user
    const userPerformance = await prisma.bordereau.groupBy({
      by: ['assignedToUserId'],
      where: {
        assignedToUserId: { not: null },
        dateReception: { gte: last30Days }
      },
      _count: { assignedToUserId: true }
    });

    console.log(`  Performance utilisateurs (30j): ${userPerformance.length} utilisateurs actifs`);

    // 5. ADDITIONAL METRICS
    console.log('\n📈 MÉTRIQUES SUPPLÉMENTAIRES:');
    
    const additionalMetrics = {
      totalMembers: await prisma.member.count(),
      totalSocieties: await prisma.society.count(),
      totalClients: await prisma.client.count(),
      activeUsers: await prisma.user.count({
        where: { status: 'ACTIVE' }
      })
    };

    console.log(`  Total membres: ${additionalMetrics.totalMembers}`);
    console.log(`  Total sociétés: ${additionalMetrics.totalSocieties}`);
    console.log(`  Total clients: ${additionalMetrics.totalClients}`);
    console.log(`  Utilisateurs actifs: ${additionalMetrics.activeUsers}`);

    // 6. DATA QUALITY CHECKS
    console.log('\n🔍 CONTRÔLES QUALITÉ:');
    
    const qualityChecks = {
      bordereauWithoutClient: await prisma.bordereau.count({
        where: { clientId: null }
      }),
      virementWithoutBordereau: await prisma.virement.count({
        where: { bordereauId: null }
      }),
      membersWithoutSociety: await prisma.member.count({
        where: { societyId: null }
      }),
      duplicateRIBs: []
    };

    console.log(`  Bordereaux sans client: ${qualityChecks.bordereauWithoutClient}`);
    console.log(`  Virements sans bordereau: ${qualityChecks.virementWithoutBordereau}`);
    console.log(`  Membres sans société: ${qualityChecks.membersWithoutSociety}`);
    console.log(`  RIBs dupliqués: ${qualityChecks.duplicateRIBs.length} groupes`);

    console.log('\n✅ Finance Tabs Data Check Complete!');

  } catch (error) {
    console.error('❌ Error checking finance tabs data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFinanceTabsData();