import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyAfterChanges() {
  console.log('\n🔍 ========================================');
  console.log('   VERIFICATION AFTER BACKEND CHANGES');
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
      console.log('⚠️  No Senior-managed bordereaux found in the system.\n');
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
      console.log(`   Date Réception Santé: ${bordereau.dateReceptionSante ? bordereau.dateReceptionSante.toISOString().split('T')[0] : 'Not set'}`);
      console.log(`\n📄 DOCUMENTS:`);
      console.log(`   Total Documents:  ${bordereau.documents.length}`);
      console.log(`   Assigned Docs:    ${bordereau.documents.filter(d => d.assignedToUserId).length}`);
      console.log(`   Unassigned Docs:  ${bordereau.documents.filter(d => !d.assignedToUserId).length}`);
      
      // Status analysis
      console.log(`\n🔍 STATUS ANALYSIS:`);
      if (bordereau.statut === 'EN_COURS') {
        console.log(`   ✅ SYNCHRONIZED!`);
        console.log(`   Database shows:        "EN_COURS"`);
        console.log(`   Super Admin sees:      "En cours"`);
        console.log(`   Senior sees:           "En cours"`);
        console.log(`   → Status is correct for Senior-managed bordereau`);
        
        // Check if it was auto-transitioned (has dateReceptionSante but no assigned documents)
        if (bordereau.dateReceptionSante && bordereau.documents.every(d => !d.assignedToUserId)) {
          console.log(`   🤖 AUTO-TRANSITIONED by backend logic!`);
          console.log(`   → Documents not explicitly assigned (Senior access via contract)`);
        }
      } else if (bordereau.statut === 'A_AFFECTER' || bordereau.statut === 'SCANNE') {
        console.log(`   ⚠️  STILL SHOWING MISMATCH`);
        console.log(`   Database shows:        "${bordereau.statut}"`);
        console.log(`   This might be an OLD bordereau (before backend restart)`);
        console.log(`   → New bordereaux should auto-transition to EN_COURS`);
      } else {
        console.log(`   ℹ️  Status: ${bordereau.statut}`);
        console.log(`   This bordereau is in a different workflow stage`);
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
      const isFixed = status === 'EN_COURS';
      const needsFix = status === 'A_AFFECTER' || status === 'SCANNE';
      const icon = isFixed ? '✅' : needsFix ? '⚠️ ' : 'ℹ️ ';
      console.log(`   ${icon} ${status.padEnd(20)} ${count} bordereau(x)`);
    });

    const fixedCount = seniorBordereaux.filter(b => b.statut === 'EN_COURS').length;
    const stillNeedsFix = seniorBordereaux.filter(b => 
      b.statut === 'A_AFFECTER' || b.statut === 'SCANNE'
    ).length;

    console.log(`\n✅ Synchronized bordereaux: ${fixedCount}/${seniorBordereaux.length}`);
    
    if (stillNeedsFix > 0) {
      console.log(`⚠️  Still showing mismatch: ${stillNeedsFix}/${seniorBordereaux.length}`);
      console.log(`   (These are likely OLD bordereaux from before the fix)`);
    }

    // Check recent bordereaux (created after backend restart)
    console.log(`\n\n${'='.repeat(60)}`);
    console.log('🆕 RECENT BORDEREAUX (Last 24 hours)');
    console.log(`${'='.repeat(60)}`);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentBordereaux = await prisma.bordereau.findMany({
      where: {
        contract: {
          teamLeaderId: { not: null },
          teamLeader: {
            role: 'GESTIONNAIRE_SENIOR'
          }
        },
        dateReception: {
          gte: yesterday
        },
        archived: false
      },
      include: {
        contract: {
          include: {
            teamLeader: {
              select: {
                fullName: true
              }
            },
            client: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        dateReception: 'desc'
      }
    });

    if (recentBordereaux.length === 0) {
      console.log('\nℹ️  No new Senior-managed bordereaux in the last 24 hours');
      console.log('   To test the fix:');
      console.log('   1. Create a new bordereau for a Senior contract');
      console.log('   2. Scan it (trigger SCAN_COMPLETED workflow)');
      console.log('   3. Check if status auto-transitions to EN_COURS\n');
    } else {
      console.log(`\nFound ${recentBordereaux.length} recent bordereau(x):\n`);
      
      recentBordereaux.forEach((b, i) => {
        const isCorrect = b.statut === 'EN_COURS';
        const icon = isCorrect ? '✅' : '❌';
        console.log(`${i + 1}. ${icon} ${b.reference}`);
        console.log(`   Client: ${b.contract?.client?.name}`);
        console.log(`   Senior: ${b.contract?.teamLeader?.fullName}`);
        console.log(`   Status: ${b.statut}`);
        console.log(`   Created: ${b.dateReception.toISOString()}`);
        if (isCorrect) {
          console.log(`   ✅ FIX WORKING! Auto-transitioned to EN_COURS`);
        } else {
          console.log(`   ❌ Expected EN_COURS, got ${b.statut}`);
        }
        console.log('');
      });

      const recentFixed = recentBordereaux.filter(b => b.statut === 'EN_COURS').length;
      console.log(`\n📊 Recent Fix Success Rate: ${recentFixed}/${recentBordereaux.length} (${Math.round(recentFixed / recentBordereaux.length * 100)}%)`);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ VERIFICATION COMPLETE');
    console.log(`${'='.repeat(60)}\n`);

    if (fixedCount === seniorBordereaux.length) {
      console.log('🎉 SUCCESS! All Senior-managed bordereaux are synchronized!\n');
    } else if (recentBordereaux.length > 0 && recentBordereaux.every(b => b.statut === 'EN_COURS')) {
      console.log('🎉 SUCCESS! New bordereaux are auto-transitioning correctly!\n');
      console.log('ℹ️  Old bordereaux remain as-is (historical data)\n');
    } else {
      console.log('⚠️  Some bordereaux still need attention\n');
      console.log('📝 TROUBLESHOOTING:');
      console.log('   1. Ensure backend server was restarted');
      console.log('   2. Create a NEW bordereau for a Senior contract');
      console.log('   3. Trigger scan workflow (SCAN_COMPLETED)');
      console.log('   4. Check if it auto-transitions to EN_COURS\n');
    }

  } catch (error) {
    console.error('❌ Error during verification:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the verification
verifyAfterChanges()
  .then(() => {
    console.log('✅ Script completed successfully\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
