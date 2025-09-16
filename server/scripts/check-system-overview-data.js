const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSystemOverviewData() {
  console.log('🔍 Checking System Overview Data for ComprehensiveSystemDashboard...\n');

  try {
    // 1. Bureau d'Ordre (BO) Statistics
    console.log('📋 BUREAU D\'ORDRE STATISTICS:');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayEntries, pendingEntries, totalEntries] = await Promise.all([
      prisma.bordereau.count({
        where: { createdAt: { gte: today } }
      }),
      prisma.bordereau.count({
        where: { statut: 'EN_ATTENTE' }
      }),
      prisma.bordereau.count()
    ]);

    console.log(`  Today Entries: ${todayEntries}`);
    console.log(`  Pending Entries: ${pendingEntries}`);
    console.log(`  Total Entries: ${totalEntries}`);
    console.log(`  BO Status: ${pendingEntries > 100 ? 'OVERLOADED' : pendingEntries > 50 ? 'BUSY' : 'NORMAL'}`);

    // 2. SCAN Service Statistics
    console.log('\n📷 SCAN SERVICE STATISTICS:');
    const [pendingScan, scanningInProgress, processedToday, scanErrors] = await Promise.all([
      prisma.bordereau.count({
        where: { statut: 'A_SCANNER' }
      }),
      prisma.bordereau.count({
        where: { statut: 'SCAN_EN_COURS' }
      }),
      prisma.bordereau.count({
        where: {
          statut: 'SCANNE',
          dateFinScan: { gte: today }
        }
      }),
      prisma.bordereau.count({
        where: { statut: 'EN_DIFFICULTE' }
      })
    ]);

    const totalScanQueue = pendingScan + scanningInProgress;
    console.log(`  Pending Scan: ${pendingScan}`);
    console.log(`  Scanning In Progress: ${scanningInProgress}`);
    console.log(`  Processed Today: ${processedToday}`);
    console.log(`  Scan Errors: ${scanErrors}`);
    console.log(`  Total Queue: ${totalScanQueue}`);
    console.log(`  Scan Status: ${totalScanQueue > 50 ? 'OVERLOADED' : totalScanQueue > 20 ? 'BUSY' : 'NORMAL'}`);

    // 3. Teams Statistics (Chef d'Équipe)
    console.log('\n👥 TEAMS STATISTICS:');
    const teams = await prisma.user.findMany({
      where: { role: 'CHEF_EQUIPE', active: true },
      include: {
        bordereauxTeam: {
          where: {
            statut: { in: ['A_AFFECTER', 'ASSIGNE', 'EN_COURS'] }
          }
        },
        bordereauxCurrentHandler: {
          where: {
            statut: { in: ['ASSIGNE', 'EN_COURS'] }
          }
        }
      }
    });

    const teamStats = teams.map(team => {
      const teamWorkload = team.bordereauxTeam.length;
      const personalWorkload = team.bordereauxCurrentHandler.length;
      const totalWorkload = teamWorkload + personalWorkload;

      let status = 'NORMAL';
      if (totalWorkload > 50) status = 'OVERLOADED';
      else if (totalWorkload > 25) status = 'BUSY';

      return {
        id: team.id,
        name: team.fullName,
        teamWorkload,
        personalWorkload,
        totalWorkload,
        status
      };
    });

    const overloadedTeams = teamStats.filter(t => t.status === 'OVERLOADED').length;
    const busyTeams = teamStats.filter(t => t.status === 'BUSY').length;
    const normalTeams = teamStats.filter(t => t.status === 'NORMAL').length;

    console.log(`  Total Teams: ${teams.length}`);
    console.log(`  Overloaded Teams: ${overloadedTeams}`);
    console.log(`  Busy Teams: ${busyTeams}`);
    console.log(`  Normal Teams: ${normalTeams}`);
    
    teamStats.forEach(team => {
      console.log(`    - ${team.name}: ${team.totalWorkload} dossiers (${team.status})`);
    });

    // 4. Gestionnaires Statistics
    console.log('\n👤 GESTIONNAIRES STATISTICS:');
    const gestionnaires = await prisma.user.findMany({
      where: { role: 'GESTIONNAIRE', active: true },
      include: {
        bordereauxCurrentHandler: {
          where: {
            statut: { in: ['ASSIGNE', 'EN_COURS'] }
          }
        }
      }
    });

    const gestionnaireStats = gestionnaires.map(gest => {
      const workload = gest.bordereauxCurrentHandler.length;
      
      let status = 'NORMAL';
      if (workload > 20) status = 'OVERLOADED';
      else if (workload > 10) status = 'BUSY';

      return {
        id: gest.id,
        name: gest.fullName,
        workload,
        status
      };
    });

    const overloadedGestionnaires = gestionnaireStats.filter(g => g.status === 'OVERLOADED').length;
    const busyGestionnaires = gestionnaireStats.filter(g => g.status === 'BUSY').length;
    const normalGestionnaires = gestionnaireStats.filter(g => g.status === 'NORMAL').length;

    console.log(`  Total Gestionnaires: ${gestionnaires.length}`);
    console.log(`  Overloaded Gestionnaires: ${overloadedGestionnaires}`);
    console.log(`  Busy Gestionnaires: ${busyGestionnaires}`);
    console.log(`  Normal Gestionnaires: ${normalGestionnaires}`);

    gestionnaireStats.forEach(gest => {
      console.log(`    - ${gest.name}: ${gest.workload} dossiers (${gest.status})`);
    });

    // 5. Workflow Status Distribution
    console.log('\n🔄 WORKFLOW STATUS DISTRIBUTION:');
    const statusDistribution = await prisma.bordereau.groupBy({
      by: ['statut'],
      _count: { statut: true }
    });

    const statusMap = {};
    statusDistribution.forEach(s => {
      statusMap[s.statut] = s._count.statut;
      console.log(`  ${s.statut}: ${s._count.statut}`);
    });

    const totalActive = statusDistribution
      .filter(s => !['CLOTURE', 'VIREMENT_EXECUTE'].includes(s.statut))
      .reduce((sum, s) => sum + s._count.statut, 0);

    console.log(`  Total Active: ${totalActive}`);

    // Identify bottlenecks
    const bottlenecks = [];
    if (statusMap['A_SCANNER'] > 20) bottlenecks.push('SCAN_QUEUE');
    if (statusMap['A_AFFECTER'] > 30) bottlenecks.push('CHEF_ASSIGNMENT');
    if (statusMap['ASSIGNE'] > 50) bottlenecks.push('GESTIONNAIRE_PROCESSING');
    if (statusMap['PRET_VIREMENT'] > 10) bottlenecks.push('FINANCE_PROCESSING');

    console.log(`  Bottlenecks: ${bottlenecks.length > 0 ? bottlenecks.join(', ') : 'None'}`);

    // 6. SLA Statistics
    console.log('\n⏰ SLA STATISTICS:');
    const now = new Date();
    
    const [atRisk, overdue, critical] = await Promise.all([
      prisma.bordereau.count({
        where: {
          statut: { in: ['ASSIGNE', 'EN_COURS'] },
          dateReception: {
            lte: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000) // 20 days ago
          },
          delaiReglement: { gte: 25 }
        }
      }),
      prisma.bordereau.count({
        where: {
          statut: { in: ['ASSIGNE', 'EN_COURS'] },
          dateReception: {
            lte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
          },
          delaiReglement: { lte: 30 }
        }
      }),
      prisma.bordereau.count({
        where: {
          statut: { in: ['ASSIGNE', 'EN_COURS'] },
          dateReception: {
            lte: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000) // 45 days ago
          }
        }
      })
    ]);

    // Calculate SLA compliance rate
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [totalProcessed, onTimeProcessed] = await Promise.all([
      prisma.bordereau.count({
        where: {
          statut: { in: ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'] },
          updatedAt: { gte: last30Days }
        }
      }),
      prisma.bordereau.count({
        where: {
          statut: { in: ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'] },
          updatedAt: { gte: last30Days },
          dateReceptionSante: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    const complianceRate = totalProcessed > 0 ? Math.round((onTimeProcessed / totalProcessed) * 100) : 100;

    console.log(`  At Risk: ${atRisk}`);
    console.log(`  Overdue: ${overdue}`);
    console.log(`  Critical: ${critical}`);
    console.log(`  Compliance Rate: ${complianceRate}%`);
    console.log(`  SLA Status: ${critical > 0 ? 'CRITICAL' : overdue > 10 ? 'WARNING' : 'GOOD'}`);

    // 7. Alerts Statistics
    console.log('\n🚨 ALERTS STATISTICS:');
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalAlerts, criticalAlerts, unresolvedAlerts] = await Promise.all([
      prisma.alertLog.count({
        where: { createdAt: { gte: last24Hours } }
      }),
      prisma.alertLog.count({
        where: {
          createdAt: { gte: last24Hours },
          alertLevel: 'HIGH'
        }
      }),
      prisma.alertLog.count({
        where: { resolved: false }
      })
    ]);

    console.log(`  Total Alerts (24h): ${totalAlerts}`);
    console.log(`  Critical Alerts (24h): ${criticalAlerts}`);
    console.log(`  Unresolved Alerts: ${unresolvedAlerts}`);
    console.log(`  Alert Status: ${criticalAlerts > 5 ? 'CRITICAL' : unresolvedAlerts > 10 ? 'WARNING' : 'GOOD'}`);

    // 8. Summary for ComprehensiveSystemDashboard
    console.log('\n📊 COMPREHENSIVE SYSTEM DASHBOARD SUMMARY:');
    console.log('Expected data structure for /super-admin/system-overview endpoint:');
    
    const expectedData = {
      bo: {
        todayEntries,
        pendingEntries,
        totalEntries,
        avgProcessingTime: 45, // minutes
        status: pendingEntries > 100 ? 'OVERLOADED' : pendingEntries > 50 ? 'BUSY' : 'NORMAL'
      },
      scan: {
        pendingScan,
        scanningInProgress,
        processedToday,
        errorCount: scanErrors,
        totalQueue: totalScanQueue,
        status: totalScanQueue > 50 ? 'OVERLOADED' : totalScanQueue > 20 ? 'BUSY' : 'NORMAL'
      },
      teams: {
        totalTeams: teams.length,
        overloadedTeams,
        busyTeams,
        normalTeams,
        teams: teamStats
      },
      gestionnaires: {
        totalGestionnaires: gestionnaires.length,
        overloadedGestionnaires,
        busyGestionnaires,
        normalGestionnaires,
        gestionnaires: gestionnaireStats
      },
      workflow: {
        statusDistribution: statusMap,
        totalActive,
        bottlenecks
      },
      sla: {
        atRisk,
        overdue,
        critical,
        complianceRate,
        status: critical > 0 ? 'CRITICAL' : overdue > 10 ? 'WARNING' : 'GOOD'
      },
      alerts: {
        totalAlerts,
        criticalAlerts,
        unresolvedAlerts,
        status: criticalAlerts > 5 ? 'CRITICAL' : unresolvedAlerts > 10 ? 'WARNING' : 'GOOD'
      }
    };

    console.log(JSON.stringify(expectedData, null, 2));

    // 9. Test the actual endpoint
    console.log('\n🧪 TESTING ACTUAL ENDPOINT:');
    console.log('Run this command to test the endpoint:');
    console.log('curl http://localhost:3001/super-admin/system-overview');

  } catch (error) {
    console.error('❌ Error checking system overview data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSystemOverviewData();