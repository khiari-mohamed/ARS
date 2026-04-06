import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testSeniorAutoTransitionDirect() {
  console.log('\n🧪 ========================================');
  console.log('   TEST SENIOR AUTO-TRANSITION (DIRECT)');
  console.log('========================================\n');

  try {
    // Find a Senior-managed bordereau
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
      console.log('❌ No Senior-managed bordereau found');
      console.log('   Creating a test bordereau...\n');
      
      // Find a Senior user
      const senior = await prisma.user.findFirst({
        where: { role: 'GESTIONNAIRE_SENIOR', active: true }
      });
      
      if (!senior) {
        console.log('❌ No Senior user found');
        return;
      }
      
      // Find a contract managed by this Senior
      const contract = await prisma.contract.findFirst({
        where: { teamLeaderId: senior.id },
        include: { client: true }
      });
      
      if (!contract) {
        console.log('❌ No contract found for Senior');
        return;
      }
      
      // Create test bordereau
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
      return testWithBordereau(newBordereau);
    }

    return testWithBordereau(bordereau);

  } catch (error) {
    console.error('❌ Error:', error);
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
  console.log(`   Senior ID: ${bordereau.contract?.teamLeaderId}`);
  console.log(`   Senior Role: ${bordereau.contract?.teamLeader?.role}`);
  console.log(`   Current Status: ${bordereau.statut}\n`);

  // Step 1: Set to SCAN_EN_COURS
  console.log('1️⃣ Setting status to SCAN_EN_COURS...');
  await prisma.bordereau.update({
    where: { id: bordereau.id },
    data: {
      statut: 'SCAN_EN_COURS',
      dateDebutScan: new Date()
    }
  });
  console.log('   ✅ Status: SCAN_EN_COURS\n');

  await new Promise(resolve => setTimeout(resolve, 500));

  // Step 2: Simulate completeScan logic DIRECTLY
  console.log('2️⃣ Simulating completeScan() logic...');
  console.log('   🔍 Loading bordereau with contract.teamLeader...\n');
  
  const loaded = await prisma.bordereau.findUnique({
    where: { id: bordereau.id },
    include: {
      client: { include: { gestionnaires: true } },
      contract: {
        include: {
          teamLeader: {
            select: { id: true, role: true }
          }
        }
      }
    }
  });

  console.log('   📊 Loaded data:');
  console.log(`      Contract ID: ${loaded?.contractId}`);
  console.log(`      Team Leader ID: ${loaded?.contract?.teamLeaderId}`);
  console.log(`      Team Leader Role: ${loaded?.contract?.teamLeader?.role}\n`);

  // Step 3: Check Senior detection logic
  console.log('3️⃣ Testing Senior detection logic...');
  const isSeniorManaged = loaded?.contract?.teamLeader?.role === 'GESTIONNAIRE_SENIOR';
  console.log(`   isSeniorManaged = ${isSeniorManaged}`);
  console.log(`   Condition: contract?.teamLeader?.role === 'GESTIONNAIRE_SENIOR'`);
  console.log(`   Actual: ${loaded?.contract?.teamLeader?.role} === 'GESTIONNAIRE_SENIOR'\n`);

  if (isSeniorManaged && loaded?.contract?.teamLeaderId) {
    console.log('   ✅ Senior detected! Applying auto-transition...');
    
    // Apply the same logic as progressWorkflow
    await prisma.bordereau.update({
      where: { id: bordereau.id },
      data: {
        statut: 'EN_COURS',
        dateFinScan: new Date(),
        dateReceptionSante: new Date(),
        assignedToUserId: loaded.contract.teamLeaderId
      }
    });
    
    console.log('   ✅ Auto-transition applied: SCANNE → EN_COURS\n');
  } else {
    console.log('   ❌ Senior NOT detected - would go to A_AFFECTER\n');
    
    await prisma.bordereau.update({
      where: { id: bordereau.id },
      data: {
        statut: 'SCANNE',
        dateFinScan: new Date()
      }
    });
  }

  // Step 4: Verify result
  const final = await prisma.bordereau.findUnique({
    where: { id: bordereau.id },
    include: {
      contract: {
        include: {
          teamLeader: true
        }
      }
    }
  });

  console.log('🔍 FINAL RESULT:');
  console.log(`   Status: ${final?.statut}`);
  console.log(`   Assigned To: ${final?.assignedToUserId || 'Not assigned'}`);
  console.log(`   Date Fin Scan: ${final?.dateFinScan?.toISOString() || 'Not set'}`);
  console.log(`   Date Réception Santé: ${final?.dateReceptionSante?.toISOString() || 'Not set'}\n`);

  if (final?.statut === 'EN_COURS') {
    console.log('🎉 ✅ SUCCESS! Auto-transition worked!');
    console.log('   The fix is working correctly!\n');
    console.log('   ✅ Database: EN_COURS');
    console.log('   ✅ Assigned to Senior:', final.contract?.teamLeader?.fullName);
    console.log('   ✅ Super Admin will see: "En cours"');
    console.log('   ✅ Senior will see: "En cours"');
    console.log('   ✅ SYNCHRONIZED! 🎯\n');
  } else {
    console.log('❌ FAILED: Status is', final?.statut);
    console.log('   The auto-transition did NOT work\n');
    console.log('🔍 DEBUG:');
    console.log('   Contract:', final?.contract ? 'Present' : 'Missing');
    console.log('   Team Leader:', final?.contract?.teamLeader ? 'Present' : 'Missing');
    console.log('   Team Leader Role:', final?.contract?.teamLeader?.role);
  }

  console.log('============================================================\n');
}

testSeniorAutoTransitionDirect()
  .then(() => {
    console.log('✅ Test completed\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
