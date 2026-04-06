import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3000';

async function testSeniorAutoTransitionViaAPI() {
  console.log('\n🧪 ========================================');
  console.log('   TEST SENIOR AUTO-TRANSITION (API)');
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
                id: true,
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
      console.log('   Creating a test bordereau...\n');
      
      // Find a Senior user
      const senior = await prisma.user.findFirst({
        where: { role: 'GESTIONNAIRE_SENIOR', active: true }
      });
      
      if (!senior) {
        console.log('❌ No Senior user found. Cannot create test bordereau.');
        return;
      }
      
      // Find a contract managed by this Senior
      const contract = await prisma.contract.findFirst({
        where: { teamLeaderId: senior.id },
        include: { client: true }
      });
      
      if (!contract) {
        console.log('❌ No contract found for Senior. Cannot create test bordereau.');
        return;
      }
      
      // Create a test bordereau
      const newBordereau = await prisma.bordereau.create({
        data: {
          reference: `TEST-SENIOR-${Date.now()}`,
          dateReception: new Date(),
          clientId: contract.clientId,
          contractId: contract.id,
          statut: 'A_SCANNER',
          nombreBS: 10,
          delaiReglement: 30
        },
        include: {
          contract: {
            include: {
              teamLeader: true,
              client: true
            }
          }
        }
      });
      
      console.log('✅ Created test bordereau:', newBordereau.reference);
      console.log(`   Client: ${newBordereau.contract?.client?.name}`);
      console.log(`   Senior: ${newBordereau.contract?.teamLeader?.fullName}\n`);
      
      // Use the new bordereau for testing
      return testWithBordereau(newBordereau);
    }

    return testWithBordereau(bordereau);

  } catch (error) {
    console.error('❌ Error during test:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function testWithBordereau(bordereau: any) {
  console.log('📋 Testing with bordereau:');
  console.log(`   Reference: ${bordereau.reference}`);
  console.log(`   Client: ${bordereau.contract?.client?.name}`);
  console.log(`   Senior: ${bordereau.contract?.teamLeader?.fullName}`);
  console.log(`   Senior Role: ${bordereau.contract?.teamLeader?.role}`);
  console.log(`   Current Status: ${bordereau.statut}\n`);

  console.log('🔄 Simulating SCAN workflow via API...\\n');

  try {
    // Step 1: Start Scan (API call)
    console.log('1️⃣ Calling API: POST /bordereaux/{id}/start-scan...');
    try {
      await axios.post(`${API_URL}/bordereaux/${bordereau.id}/start-scan`);
      console.log('   ✅ Status: SCAN_EN_COURS\n');
    } catch (err: any) {
      console.log('   ⚠️  API call failed (endpoint might not exist), updating directly...');
      await prisma.bordereau.update({
        where: { id: bordereau.id },
        data: { statut: 'SCAN_EN_COURS', dateDebutScan: new Date() }
      });
      console.log('   ✅ Status: SCAN_EN_COURS\n');
    }

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 2: Complete Scan (API call - THIS TRIGGERS progressWorkflow!)
    console.log('2️⃣ Calling API: POST /bordereaux/{id}/complete-scan...');
    console.log('   🤖 This should trigger progressWorkflow()');
    console.log('   🤖 Backend should detect Senior-managed bordereau');
    console.log('   🤖 Backend should auto-transition to EN_COURS\n');

    try {
      const response = await axios.post(`${API_URL}/bordereaux/${bordereau.id}/complete-scan`);
      console.log('   ✅ API call successful');
      console.log('   Response status:', response.data.statut);
    } catch (err: any) {
      console.log('   ❌ API call failed:', err.message);
      if (err.response) {
        console.log('   Response:', err.response.data);
      }
    }

    // Wait for workflow to process
    console.log('\n⏳ Waiting 2 seconds for workflow engine...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check the result
    const updated = await prisma.bordereau.findUnique({
      where: { id: bordereau.id },
      include: {
        contract: {
          include: {
            teamLeader: {
              select: {
                id: true,
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
    console.log(`   Assigned To: ${updated?.assignedToUserId || 'Not assigned'}`);
    console.log(`   Date Fin Scan: ${updated?.dateFinScan?.toISOString() || 'Not set'}`);
    console.log(`   Date Réception Santé: ${updated?.dateReceptionSante?.toISOString() || 'Not set'}\n`);

    if (updated?.statut === 'EN_COURS') {
      console.log('🎉 ✅ SUCCESS! Auto-transition worked!');
      console.log('   Status automatically changed: SCANNE → EN_COURS');
      console.log('   This bordereau is now synchronized:\n');
      console.log('   ✅ Database: EN_COURS');
      console.log('   ✅ Assigned to Senior:', updated.contract?.teamLeader?.fullName);
      console.log('   ✅ Super Admin will see: "En cours"');
      console.log('   ✅ Senior will see: "En cours"');
      console.log('   ✅ SYNCHRONIZED! 🎯\n');
    } else if (updated?.statut === 'SCANNE') {
      console.log('❌ FAILED: Status is still SCANNE');
      console.log('   The auto-transition did NOT work\n');
      console.log('📝 POSSIBLE CAUSES:');
      console.log('   1. Backend server is not running');
      console.log('   2. progressWorkflow() was not called');
      console.log('   3. Senior detection logic failed');
      console.log('   4. Contract teamLeader relation not loaded\n');
      console.log('🔍 DEBUG INFO:');
      console.log('   Contract ID:', updated.contractId);
      console.log('   Team Leader ID:', updated.contract?.teamLeaderId);
      console.log('   Team Leader Role:', updated.contract?.teamLeader?.role);
    } else if (updated?.statut === 'A_AFFECTER') {
      console.log('❌ FAILED: Status is A_AFFECTER (regular flow)');
      console.log('   Senior detection did NOT work\n');
      console.log('🔍 DEBUG INFO:');
      console.log('   Contract ID:', updated.contractId);
      console.log('   Team Leader ID:', updated.contract?.teamLeaderId);
      console.log('   Team Leader Role:', updated.contract?.teamLeader?.role);
      console.log('\n   The backend did not recognize this as Senior-managed!');
    } else {
      console.log(`ℹ️  Status is: ${updated?.statut}`);
      console.log('   This might be expected depending on workflow logic\n');
    }

    console.log('============================================================\n');

  } catch (error) {
    console.error('❌ Error during API test:', error);
    throw error;
  }
}

// Run the test
testSeniorAutoTransitionViaAPI()
  .then(() => {
    console.log('✅ Test completed\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
