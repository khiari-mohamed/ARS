const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkChefEquipeData() {
  console.log('🔍 Checking Chef d\'Équipe data...');

  try {
    // Get chef d'équipe user
    const chefEquipe = await prisma.user.findFirst({
      where: { role: 'CHEF_EQUIPE' }
    });

    if (!chefEquipe) {
      console.log('❌ No Chef d\'Équipe found. Run populate script first.');
      return;
    }

    console.log(`👨‍💼 Chef d'Équipe: ${chefEquipe.fullName} (${chefEquipe.email})`);

    // Get team members (all gestionnaires if no team structure)
    let gestionnaires = await prisma.user.findMany({
      where: { 
        role: 'GESTIONNAIRE',
        teamLeaderId: chefEquipe.id
      }
    });
    
    if (gestionnaires.length === 0) {
      gestionnaires = await prisma.user.findMany({
        where: { role: 'GESTIONNAIRE' }
      });
      console.log('⚠️ No team structure found, using all gestionnaires');
    }

    console.log(`👥 Team Members: ${gestionnaires.length}`);
    gestionnaires.forEach(g => {
      console.log(`   - ${g.fullName} (Capacity: ${g.capacity})`);
    });

    // Check bordereaux by status for corbeille
    const [nonAffectes, enCours, traites] = await Promise.all([
      // Non-assigned items ready for assignment
      prisma.bordereau.findMany({
        where: {
          statut: { in: ['SCANNE', 'A_AFFECTER'] },
          OR: [
            { assignedToUserId: null },
            { currentHandlerId: chefEquipe.id }
          ]
        },
        include: {
          client: { select: { name: true } },
          documents: { select: { name: true } }
        }
      }),

      // Items currently being processed by team members
      prisma.bordereau.findMany({
        where: {
          statut: { in: ['ASSIGNE', 'EN_COURS'] },
          OR: [
            { teamId: chefEquipe.id },
            { 
              assignedToUserId: { 
                in: gestionnaires.map(g => g.id)
              } 
            }
          ]
        },
        include: {
          client: { select: { name: true } },
          currentHandler: { select: { fullName: true } }
        }
      }),

      // Recently completed items
      prisma.bordereau.findMany({
        where: {
          statut: { in: ['TRAITE', 'CLOTURE'] },
          OR: [
            { teamId: chefEquipe.id },
            { 
              assignedToUserId: { 
                in: gestionnaires.map(g => g.id)
              } 
            }
          ],
          updatedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        include: {
          client: { select: { name: true } },
          currentHandler: { select: { fullName: true } }
        }
      })
    ]);

    console.log('\n📋 CORBEILLE DATA:');
    console.log(`📥 Non-Affectés (Tab 1): ${nonAffectes.length} bordereaux`);
    nonAffectes.slice(0, 3).forEach(b => {
      console.log(`   - ${b.reference} | ${b.client.name} | ${b.statut} | ${b.nombreBS} BS | ${b.documents.length} docs`);
    });
    if (nonAffectes.length > 3) console.log(`   ... and ${nonAffectes.length - 3} more`);

    console.log(`🔄 En Cours (Tab 2): ${enCours.length} bordereaux`);
    enCours.slice(0, 3).forEach(b => {
      console.log(`   - ${b.reference} | ${b.client.name} | ${b.statut} | Assigned to: ${b.currentHandler?.fullName || 'N/A'}`);
    });
    if (enCours.length > 3) console.log(`   ... and ${enCours.length - 3} more`);

    console.log(`✅ Traités (Tab 3): ${traites.length} bordereaux`);
    traites.slice(0, 3).forEach(b => {
      console.log(`   - ${b.reference} | ${b.client.name} | ${b.statut} | Completed by: ${b.currentHandler?.fullName || 'N/A'}`);
    });
    if (traites.length > 3) console.log(`   ... and ${traites.length - 3} more`);

    // Check workload for each gestionnaire
    console.log('\n👥 WORKLOAD ANALYSIS:');
    for (const gestionnaire of gestionnaires) {
      const assignedCount = await prisma.bordereau.count({
        where: {
          assignedToUserId: gestionnaire.id,
          statut: { in: ['ASSIGNE', 'EN_COURS'] }
        }
      });
      
      const utilizationRate = Math.round((assignedCount / gestionnaire.capacity) * 100);
      const status = utilizationRate >= 100 ? '🔴 OVERLOADED' : 
                    utilizationRate >= 80 ? '🟡 HIGH' : 
                    utilizationRate >= 50 ? '🟢 MEDIUM' : '⚪ LOW';
      
      console.log(`   ${gestionnaire.fullName}: ${assignedCount}/${gestionnaire.capacity} (${utilizationRate}%) ${status}`);
    }

    // Check recent notifications
    const notifications = await prisma.notification.findMany({
      where: { userId: chefEquipe.id },
      orderBy: { createdAt: 'desc' },
      take: 3
    });

    console.log('\n🔔 RECENT NOTIFICATIONS:');
    notifications.forEach(n => {
      console.log(`   - ${n.title}: ${n.message}`);
    });

    // Check audit logs
    const auditLogs = await prisma.auditLog.findMany({
      where: { userId: chefEquipe.id },
      orderBy: { timestamp: 'desc' },
      take: 3
    });

    console.log('\n📚 RECENT AUDIT LOGS:');
    auditLogs.forEach(log => {
      console.log(`   - ${log.action}: ${JSON.stringify(log.details)}`);
    });

    // Check dashboard data
    console.log('\n📊 DASHBOARD DATA:');
    const [clients, documents, reclamations] = await Promise.all([
      prisma.client.findMany({ select: { id: true, name: true } }),
      prisma.document.findMany({
        include: { bordereau: { include: { client: true } } },
        where: { bordereau: { archived: false } }
      }),
      prisma.reclamation.findMany({
        include: { client: true },
        where: { status: { in: ['OPEN', 'IN_PROGRESS'] } }
      })
    ]);

    console.log(`📋 Clients: ${clients.length}`);
    clients.forEach(c => console.log(`   - ${c.name}`));
    
    console.log(`📄 Documents: ${documents.length}`);
    const docTypes = {};
    documents.forEach(doc => {
      docTypes[doc.type] = (docTypes[doc.type] || 0) + 1;
    });
    Object.entries(docTypes).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count}`);
    });
    
    console.log(`📞 Reclamations: ${reclamations.length}`);

    // API endpoints to test
    console.log('\n🔗 API ENDPOINTS TO TEST:');
    console.log('GET /api/bordereaux/chef-equipe/dashboard-stats');
    console.log('GET /api/bordereaux/chef-equipe/dashboard-dossiers');
    console.log('GET /api/bordereaux/chef-equipe/corbeille');

    console.log('\n✅ Data check completed successfully!');

  } catch (error) {
    console.error('❌ Error checking data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  checkChefEquipeData()
    .then(() => {
      console.log('\n🎯 Ready for testing!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Check failed:', error);
      process.exit(1);
    });
}

module.exports = { checkChefEquipeData };