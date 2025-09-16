const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testChefEquipeEndpoints() {
  console.log('🧪 Testing Chef d\'Équipe data directly from database...');

  try {
    // Get chef d'équipe user
    const chefEquipe = await prisma.user.findFirst({
      where: { role: 'CHEF_EQUIPE' }
    });

    if (!chefEquipe) {
      console.log('❌ No Chef d\'Équipe found. Run populate script first.');
      return;
    }

    console.log(`👨💼 Testing with Chef: ${chefEquipe.fullName}`);

    // Test the corbeille logic directly (same as the service)
    const gestionnaires = await prisma.user.findMany({
      where: { 
        role: 'GESTIONNAIRE',
        teamLeaderId: chefEquipe.id
      }
    });

    const teamMemberIds = gestionnaires.map(g => g.id);
    const allManagedIds = [...teamMemberIds, chefEquipe.id];

    console.log(`👥 Team Members: ${gestionnaires.length}`);

    // Test corbeille queries
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
                in: teamMemberIds.length > 0 ? teamMemberIds : ['no-members']
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

    console.log('\n📋 CORBEILLE TEST RESULTS:');
    console.log(`📥 Non-Affectés: ${nonAffectes.length} bordereaux`);
    console.log(`🔄 En Cours: ${enCours.length} bordereaux`);
    console.log(`✅ Traités: ${traites.length} bordereaux`);

    // Test dashboard stats
    const [totalAssigned, inProgress, completedToday, overdue] = await Promise.all([
      prisma.bordereau.count({
        where: {
          assignedToUserId: { in: allManagedIds },
          statut: { in: ['ASSIGNE', 'EN_COURS'] }
        }
      }),
      prisma.bordereau.count({
        where: {
          assignedToUserId: { in: allManagedIds },
          statut: 'EN_COURS'
        }
      }),
      prisma.bordereau.count({
        where: {
          assignedToUserId: { in: allManagedIds },
          statut: 'TRAITE',
          updatedAt: { 
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      prisma.bordereau.count({
        where: {
          assignedToUserId: { in: allManagedIds },
          statut: { in: ['ASSIGNE', 'EN_COURS'] },
          dateReception: {
            lte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
          }
        }
      })
    ]);

    console.log('\n📊 DASHBOARD STATS:');
    console.log(`📋 Total Assigned: ${totalAssigned}`);
    console.log(`🔄 In Progress: ${inProgress}`);
    console.log(`✅ Completed Today: ${completedToday}`);
    console.log(`⏰ Overdue: ${overdue}`);

    // Test action scenarios
    console.log('\n🎯 ACTION BUTTON TEST SCENARIOS:');
    
    if (nonAffectes.length > 0) {
      console.log(`✅ AFFECTER: ${nonAffectes.length} bordereaux ready for assignment`);
      console.log(`   Example: ${nonAffectes[0].reference} (${nonAffectes[0].client.name})`);
    } else {
      console.log('⚠️ AFFECTER: No bordereaux available for assignment');
    }

    if (nonAffectes.length > 1) {
      console.log(`✅ REJETER: Can reject bordereau ${nonAffectes[1].reference}`);
    } else {
      console.log('⚠️ REJETER: No bordereaux available for rejection');
    }

    if (nonAffectes.length > 2) {
      console.log(`✅ TRAITER: Chef can handle ${nonAffectes[2].reference} personally`);
    } else {
      console.log('⚠️ TRAITER: No bordereaux available for personal handling');
    }

    // Test gestionnaire workload
    console.log('\n👥 GESTIONNAIRE WORKLOAD:');
    for (const gestionnaire of gestionnaires) {
      const workload = await prisma.bordereau.count({
        where: {
          assignedToUserId: gestionnaire.id,
          statut: { in: ['ASSIGNE', 'EN_COURS'] }
        }
      });
      
      const utilization = Math.round((workload / gestionnaire.capacity) * 100);
      console.log(`   ${gestionnaire.fullName}: ${workload}/${gestionnaire.capacity} (${utilization}%)`);
    }

    console.log('\n✅ ENDPOINT LOGIC TEST COMPLETED SUCCESSFULLY!');
    console.log('\n🎯 FRONTEND TESTING:');
    console.log('1. Start server: npm run start:dev');
    console.log('2. Login as Chef d\'Équipe');
    console.log('3. Navigate to Chef d\'Équipe module');
    console.log('4. Verify the numbers match what we see here');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testChefEquipeEndpoints()
    .then(() => {
      console.log('\n🚀 Database test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testChefEquipeEndpoints };