import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectCVNBordereau() {
  console.log('\n🔍 ========================================');
  console.log('   INSPECTION: CVN BORDEREAU');
  console.log('========================================\n');

  try {
    // Find the cvn bordereau
    const bordereau = await prisma.bordereau.findFirst({
      where: { reference: 'cvn' },
      include: {
        contract: {
          include: {
            teamLeader: {
              select: {
                id: true,
                fullName: true,
                role: true,
                email: true
              }
            },
            client: {
              select: {
                name: true
              }
            }
          }
        },
        client: {
          select: {
            name: true
          }
        },
        documents: {
          select: {
            id: true,
            name: true,
            status: true,
            assignedToUserId: true
          }
        },
        currentHandler: {
          select: {
            fullName: true,
            role: true
          }
        }
      }
    });

    if (!bordereau) {
      console.log('❌ Bordereau "cvn" not found in database\n');
      return;
    }

    console.log('📋 BORDEREAU DETAILS:');
    console.log('─'.repeat(60));
    console.log(`Reference:           ${bordereau.reference}`);
    console.log(`Client:              ${bordereau.client?.name || 'N/A'}`);
    console.log(`Contract ID:         ${bordereau.contractId || 'NO CONTRACT LINKED ❌'}`);
    console.log(`Current Status:      ${bordereau.statut}`);
    console.log(`Date Reception:      ${bordereau.dateReception.toISOString().split('T')[0]}`);
    console.log(`Date Debut Scan:     ${bordereau.dateDebutScan ? bordereau.dateDebutScan.toISOString().split('T')[0] : 'Not started'}`);
    console.log(`Date Fin Scan:       ${bordereau.dateFinScan ? bordereau.dateFinScan.toISOString().split('T')[0] : 'Not finished'}`);
    console.log(`Date Reception Santé: ${bordereau.dateReceptionSante ? bordereau.dateReceptionSante.toISOString().split('T')[0] : 'Not set'}`);
    console.log(`Assigned To User ID: ${bordereau.assignedToUserId || 'Not assigned'}`);
    console.log(`Current Handler:     ${bordereau.currentHandler?.fullName || 'None'} (${bordereau.currentHandler?.role || 'N/A'})`);

    console.log('\n📄 CONTRACT DETAILS:');
    console.log('─'.repeat(60));
    if (bordereau.contract) {
      console.log(`Contract ID:         ${bordereau.contract.id}`);
      console.log(`Client Name:         ${bordereau.contract.client?.name || 'N/A'}`);
      console.log(`Team Leader ID:      ${bordereau.contract.teamLeaderId || 'NO TEAM LEADER ❌'}`);
      
      if (bordereau.contract.teamLeader) {
        console.log(`\n👤 TEAM LEADER (SENIOR):`);
        console.log(`   Name:             ${bordereau.contract.teamLeader.fullName}`);
        console.log(`   Role:             ${bordereau.contract.teamLeader.role}`);
        console.log(`   Email:            ${bordereau.contract.teamLeader.email || 'N/A'}`);
        console.log(`   ID:               ${bordereau.contract.teamLeader.id}`);
      } else {
        console.log(`\n❌ NO TEAM LEADER ASSIGNED TO CONTRACT!`);
      }
    } else {
      console.log('❌ NO CONTRACT LINKED TO BORDEREAU!');
    }

    console.log('\n📑 DOCUMENTS:');
    console.log('─'.repeat(60));
    console.log(`Total Documents:     ${bordereau.documents.length}`);
    bordereau.documents.forEach((doc, index) => {
      console.log(`\n  Document ${index + 1}:`);
      console.log(`    Name:            ${doc.name}`);
      console.log(`    Status:          ${doc.status || 'N/A'}`);
      console.log(`    Assigned To:     ${doc.assignedToUserId || 'Not assigned'}`);
    });

    console.log('\n\n🔍 AUTO-TRANSITION ANALYSIS:');
    console.log('═'.repeat(60));

    // Check if Senior-managed
    const isSeniorManaged = bordereau.contract?.teamLeaderId && 
                            bordereau.contract?.teamLeader?.role === 'GESTIONNAIRE_SENIOR';

    console.log(`\n1️⃣ Contract has teamLeaderId?`);
    if (bordereau.contract?.teamLeaderId) {
      console.log(`   ✅ YES: ${bordereau.contract.teamLeaderId}`);
    } else {
      console.log(`   ❌ NO - This is the problem!`);
    }

    console.log(`\n2️⃣ Team Leader is GESTIONNAIRE_SENIOR?`);
    if (bordereau.contract?.teamLeader?.role === 'GESTIONNAIRE_SENIOR') {
      console.log(`   ✅ YES: ${bordereau.contract.teamLeader.fullName}`);
    } else if (bordereau.contract?.teamLeader) {
      console.log(`   ❌ NO - Role is: ${bordereau.contract.teamLeader.role}`);
    } else {
      console.log(`   ❌ NO - No team leader assigned`);
    }

    console.log(`\n3️⃣ Is Senior-Managed?`);
    if (isSeniorManaged) {
      console.log(`   ✅ YES - Should auto-transition to EN_COURS`);
    } else {
      console.log(`   ❌ NO - Will follow regular workflow (A_AFFECTER)`);
    }

    console.log(`\n4️⃣ Current Status Check:`);
    console.log(`   Database Status:  ${bordereau.statut}`);
    if (bordereau.statut === 'EN_COURS') {
      console.log(`   ✅ CORRECT - Auto-transition worked!`);
    } else if (bordereau.statut === 'SCANNE') {
      console.log(`   ⚠️  STUCK at SCANNE - Auto-transition did NOT run`);
    } else if (bordereau.statut === 'A_AFFECTER') {
      console.log(`   ❌ WRONG - Went to A_AFFECTER (regular flow)`);
    } else {
      console.log(`   ℹ️  Status: ${bordereau.statut}`);
    }

    console.log('\n\n🎯 DIAGNOSIS:');
    console.log('═'.repeat(60));

    if (!bordereau.contractId) {
      console.log('❌ PROBLEM: Bordereau has NO contract linked');
      console.log('   Solution: Link bordereau to contract b02551f5-c3c4-4cfd-9745-582841a4677e');
    } else if (!bordereau.contract?.teamLeaderId) {
      console.log('❌ PROBLEM: Contract has NO teamLeaderId');
      console.log('   Solution: Set contract teamLeaderId to Siwar Ayari (f6b4e05f-4918-4650-89d0-7989845cd182)');
    } else if (bordereau.contract?.teamLeader?.role !== 'GESTIONNAIRE_SENIOR') {
      console.log('❌ PROBLEM: Team Leader is not GESTIONNAIRE_SENIOR');
      console.log(`   Current role: ${bordereau.contract.teamLeader?.role}`);
      console.log('   Solution: Assign a GESTIONNAIRE_SENIOR to this contract');
    } else if (bordereau.statut === 'SCANNE') {
      console.log('⚠️  PROBLEM: Status stuck at SCANNE');
      console.log('   Possible causes:');
      console.log('   1. completeScan() was not called (button might set status directly)');
      console.log('   2. progressWorkflow() did not run');
      console.log('   3. Backend code not restarted after changes');
      console.log('   Solution: Check backend logs for workflow execution');
    } else if (bordereau.statut === 'EN_COURS') {
      console.log('✅ SUCCESS! Auto-transition worked correctly!');
      console.log('   Status: SCANNE → EN_COURS');
      console.log('   Senior can see and work on this bordereau');
      console.log('   Super Admin sees same status as Senior');
    } else {
      console.log(`ℹ️  Status is ${bordereau.statut} - check if this is expected`);
    }

    console.log('\n\n📊 EXPECTED vs ACTUAL:');
    console.log('═'.repeat(60));
    console.log('Expected Flow (Senior-managed):');
    console.log('  A_SCANNER → SCAN_EN_COURS → SCANNE → EN_COURS ✅');
    console.log('');
    console.log('Actual Flow:');
    console.log(`  A_SCANNER → SCAN_EN_COURS → ${bordereau.statut} ${bordereau.statut === 'EN_COURS' ? '✅' : '❌'}`);

    console.log('\n\n' + '═'.repeat(60));
    console.log('✅ INSPECTION COMPLETE');
    console.log('═'.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error during inspection:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the inspection
inspectCVNBordereau()
  .then(() => {
    console.log('✅ Script completed successfully\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
