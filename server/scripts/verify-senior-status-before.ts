import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyBeforeChanges() {
  console.log('\n🔍 ========================================');
  console.log('   VERIFICATION BEFORE BACKEND CHANGES');
  console.log('========================================\n');

  try {
    // Find all Senior-managed bordereaux
    const seniorBordereaux = await prisma.bordereau.findMany({
      where: {
        contract: {
          teamLeaderId: { not: null },
          teamLeader: {
            role: 'GESTIONNAIRE_SENIOR'
          }
        },
        archived: false
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
        },
        documents: {
          select: {
            id: true,
            status: true,
            assignedToUserId: true
          }
        }
      },
      orderBy: {
        dateReception: 'desc'
      },
      take: 10
    });

    console.log(`📊 Found ${seniorBordereaux.length} Senior-managed bordereaux\n`);

    if (seniorBordereaux.length === 0) {
      console.log('⚠️  No Senior-managed bordereaux found in the system.');
      console.log('   This might mean:');
      console.log('   - No contracts have teamLeaderId assigned');
      console.log('   - No Gestionnaire Senior users exist');
      console.log('   - All bordereaux are archived\n');
      return;
    }

    // Display detailed information for each
    seniorBordereaux.forEach((bordereau, index) => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📋 BORDEREAU #${index + 1}`);
      console.log(`${'='.repeat(60)}`);
      console.log(`Reference:           ${bordereau.reference}`);
      console.log(`Client:              ${bordereau.contract?.client?.name || 'N/A'}`);
      console.log(`Contract ID:         ${bordereau.contractId}`);
      console.log(`\n👤 GESTIONNAIRE SENIOR:`);
      console.log(`   Name:             ${bordereau.contract?.teamLeader?.fullName || 'N/A'}`);
      console.log(`   ID:               ${bordereau.contract?.teamLeaderId || 'N/A'}`);
      console.log(`   Role:             ${bordereau.contract?.teamLeader?.role || 'N/A'}`);
      console.log(`\n📊 CURRENT STATUS:`);
      console.log(`   Database Status:  ${bordereau.statut}`);
      console.log(`   Date Reception:   ${bordereau.dateReception.toISOString().split('T')[0]}`);
      console.log(`   Date Fin Scan:    ${bordereau.dateFinScan ? bordereau.dateFinScan.toISOString().split('T')[0] : 'Not scanned yet'}`);
      console.log(`\n📄 DOCUMENTS:`);
      console.log(`   Total Documents:  ${bordereau.documents.length}`);
      console.log(`   Assigned Docs:    ${bordereau.documents.filter(d => d.assignedToUserId).length}`);
      console.log(`   Unassigned Docs:  ${bordereau.documents.filter(d => !d.assignedToUserId).length}`);
      
      // Status analysis
      console.log(`\n🔍 STATUS ANALYSIS:`);
      if (bordereau.statut === 'A_AFFECTER' || bordereau.statut === 'SCANNE') {
        console.log(`   ⚠️  MISMATCH DETECTED!`);
        console.log(`   Database shows:        "${bordereau.statut}"`);
        console.log(`   Super Admin sees:      "À affecter" or "Scanné"`);
        console.log(`   Senior should see:     "En cours" (via contract relationship)`);
        console.log(`   → This bordereau will be AUTO-FIXED after backend restart`);
      } else if (bordereau.statut === 'EN_COURS') {
        console.log(`   ✅ Already synchronized`);
        console.log(`   Database shows:        "EN_COURS"`);
        console.log(`   Super Admin sees:      "En cours"`);
        console.log(`   Senior sees:           "En cours"`);
      } else {
        console.log(`   ℹ️  Status: ${bordereau.statut}`);
        console.log(`   This bordereau is in a different workflow stage`);
      }

      // Expected behavior after fix
      if (bordereau.statut === 'A_AFFECTER' || bordereau.statut === 'SCANNE') {
        console.log(`\n🎯 EXPECTED AFTER FIX:`);
        console.log(`   When next bordereau is scanned for this contract:`);
        console.log(`   1. Status will auto-transition: SCANNE → EN_COURS`);
        console.log(`   2. Super Admin will see: "En cours"`);
        console.log(`   3. Senior will see: "En cours"`);
        console.log(`   4. ✅ SYNCHRONIZED!`);
      }
    });

    // Summary statistics
    console.log(`\n\n${'='.repeat(60)}`);
    console.log('📈 SUMMARY STATISTICS');
    console.log(`${'='.repeat(60)}`);
    
    const statusCounts = seniorBordereaux.reduce((acc, b) => {
      acc[b.statut] = (acc[b.statut] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\nStatus Distribution:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      const needsFix = status === 'A_AFFECTER' || status === 'SCANNE';
      const icon = needsFix ? '⚠️ ' : status === 'EN_COURS' ? '✅' : 'ℹ️ ';
      console.log(`   ${icon} ${status.padEnd(20)} ${count} bordereau(x)`);
    });

    const needsFixCount = seniorBordereaux.filter(b => 
      b.statut === 'A_AFFECTER' || b.statut === 'SCANNE'
    ).length;

    console.log(`\n🔧 Bordereaux needing fix: ${needsFixCount}/${seniorBordereaux.length}`);
    
    if (needsFixCount > 0) {
      console.log(`\n⚠️  ACTION REQUIRED:`);
      console.log(`   ${needsFixCount} Senior-managed bordereau(x) currently show mismatch`);
      console.log(`   After backend restart, NEW scanned bordereaux will auto-fix`);
      console.log(`   Existing bordereaux will remain as-is (historical data)`);
    } else {
      console.log(`\n✅ All Senior-managed bordereaux are already synchronized!`);
    }

    // Check for contracts with Senior but no bordereaux
    console.log(`\n\n${'='.repeat(60)}`);
    console.log('🔍 CONTRACTS WITH GESTIONNAIRE SENIOR');
    console.log(`${'='.repeat(60)}`);

    const seniorContracts = await prisma.contract.findMany({
      where: {
        teamLeaderId: { not: null },
        teamLeader: {
          role: 'GESTIONNAIRE_SENIOR'
        }
      },
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
        },
        _count: {
          select: {
            bordereaux: true
          }
        }
      }
    });

    console.log(`\nTotal contracts with Senior: ${seniorContracts.length}\n`);

    seniorContracts.forEach((contract, index) => {
      console.log(`${index + 1}. ${contract.client?.name || 'Unknown Client'}`);
      console.log(`   Senior: ${contract.teamLeader?.fullName || 'N/A'}`);
      console.log(`   Bordereaux: ${contract._count.bordereaux}`);
      console.log('');
    });

    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ VERIFICATION COMPLETE');
    console.log(`${'='.repeat(60)}\n`);

    console.log('📝 NEXT STEPS:');
    console.log('   1. Review the data above');
    console.log('   2. Note any bordereaux with status A_AFFECTER or SCANNE');
    console.log('   3. Restart the backend server');
    console.log('   4. Run verify-senior-status-after.ts to compare');
    console.log('   5. Test by scanning a new bordereau for a Senior contract\n');

  } catch (error) {
    console.error('❌ Error during verification:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the verification
verifyBeforeChanges()
  .then(() => {
    console.log('✅ Script completed successfully\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
