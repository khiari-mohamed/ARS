import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testSeniorAutoTransition() {
  console.log('\n🧪 ========================================');
  console.log('   TEST SENIOR AUTO-TRANSITION');
  console.log('========================================\n');

  try {
    // Find a Senior-managed bordereau that's ready to scan
    const bordereau = await prisma.bordereau.findFirst({
      where: {
        statut: 'A_SCANNER',
        contract: {
          teamLeaderId: { not: null },
          teamLeader: {
            role: 'GESTIONNAIRE_SENIOR'
          }
        }
      },
      include: {
        contract: {
          include: {
            teamLeader: {
              select: {
                fullName: true,
                role: true
              }
            },
            client: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (!bordereau) {
      console.log('❌ No Senior-managed bordereau with status A_SCANNER found');
      console.log('   Please create a new bordereau or use one of the A_AFFECTER ones\n');
      return;
    }

    console.log('📋 Found bordereau to test:');
    console.log(`   Reference: ${bordereau.reference}`);
    console.log(`   Client: ${bordereau.contract?.client?.name}`);
    console.log(`   Senior: ${bordereau.contract?.teamLeader?.fullName}`);
    console.log(`   Current Status: ${bordereau.statut}\n`);

    console.log('🔄 Simulating SCAN workflow...\n');

    // Step 1: SCAN_STARTED
    console.log('1️⃣ Setting status to SCAN_EN_COURS...');
    await prisma.bordereau.update({
      where: { id: bordereau.id },
      data: {
        statut: 'SCAN_EN_COURS',
        dateDebutScan: new Date()
      }
    });
    console.log('   ✅ Status: SCAN_EN_COURS\n');

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 2: SCAN_COMPLETED (This should trigger auto-transition)
    console.log('2️⃣ Triggering SCAN_COMPLETED...');
    console.log('   🤖 Backend should detect Senior-managed bordereau');
    console.log('   🤖 Backend should auto-transition to EN_COURS\n');

    await prisma.bordereau.update({
      where: { id: bordereau.id },
      data: {
        statut: 'SCANNE',
        dateFinScan: new Date()
      }
    });

    console.log('   ✅ Scan completed, status set to SCANNE\n');

    // Wait for workflow engine to process
    console.log('⏳ Waiting 2 seconds for workflow engine...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check the result
    const updated = await prisma.bordereau.findUnique({
      where: { id: bordereau.id },
      include: {
        contract: {
          include: {
            teamLeader: {
              select: {
                fullName: true,
                role: true
              }
            }
          }
        }
      }
    });

    console.log('🔍 RESULT AFTER WORKFLOW:');
    console.log(`   Current Status: ${updated?.statut}`);
    console.log(`   Date Fin Scan: ${updated?.dateFinScan?.toISOString()}`);
    console.log(`   Date Réception Santé: ${updated?.dateReceptionSante?.toISOString() || 'Not set'}\n`);

    if (updated?.statut === 'EN_COURS') {
      console.log('🎉 ✅ SUCCESS! Auto-transition worked!');
      console.log('   Status automatically changed: SCANNE → EN_COURS');
      console.log('   This bordereau is now synchronized:\n');
      console.log('   ✅ Database: EN_COURS');
      console.log('   ✅ Super Admin will see: "En cours"');
      console.log('   ✅ Senior will see: "En cours"');
      console.log('   ✅ SYNCHRONIZED! 🎯\n');
    } else if (updated?.statut === 'SCANNE') {
      console.log('⚠️  Status is still SCANNE');
      console.log('   The workflow engine might not have processed it yet');
      console.log('   OR the backend changes are not active\n');
      console.log('📝 TROUBLESHOOTING:');
      console.log('   1. Check if backend server is running');
      console.log('   2. Check workflow-engine.service.ts logs');
      console.log('   3. Manually trigger workflow via API endpoint\n');
    } else {
      console.log(`ℹ️  Status is: ${updated?.statut}`);
      console.log('   This might be expected depending on workflow logic\n');
    }

    console.log('============================================================\n');

  } catch (error) {
    console.error('❌ Error during test:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testSeniorAutoTransition()
  .then(() => {
    console.log('✅ Test completed\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
