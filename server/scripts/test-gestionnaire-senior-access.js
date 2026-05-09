const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testGestionnaireSeniorAccess() {
  console.log('🔍 Testing GESTIONNAIRE_SENIOR access in Finance module...\n');

  try {
    // Find Cyrine Chouk (GESTIONNAIRE_SENIOR)
    const seniorUser = await prisma.user.findFirst({
      where: { 
        fullName: { contains: 'Cyrine', mode: 'insensitive' },
        role: 'GESTIONNAIRE_SENIOR'
      },
      select: { id: true, fullName: true, email: true, role: true }
    });

    // If not found by name, try any GESTIONNAIRE_SENIOR
    const fallbackUser = !seniorUser ? await prisma.user.findFirst({
      where: { role: 'GESTIONNAIRE_SENIOR' },
      select: { id: true, fullName: true, email: true, role: true }
    }) : null;

    const user = seniorUser || fallbackUser;

    if (!user) {
      console.log('❌ No GESTIONNAIRE_SENIOR user found in database');
      return;
    }

    console.log('✅ Testing access for GESTIONNAIRE_SENIOR:');
    console.log(`   Name: ${user.fullName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Role: ${user.role}\n`);

    // Get contracts assigned to this user as team leader
    const assignedContracts = await prisma.contract.findMany({
      where: { teamLeaderId: user.id },
      include: {
        client: true,
        teamLeader: { select: { fullName: true } }
      }
    });

    console.log(`📋 Contracts assigned to ${user.fullName}:`);
    if (assignedContracts.length === 0) {
      console.log('   ⚠️ NO CONTRACTS ASSIGNED!\n');
    } else {
      assignedContracts.forEach(contract => {
        console.log(`   - ${contract.client.name} (Contract ID: ${contract.id})`);
      });
      console.log('');
    }

    // Get ALL bordereaux in TRAITE status
    const allBordereauxTraites = await prisma.bordereau.findMany({
      where: {
        statut: 'TRAITE',
        archived: false
      },
      include: {
        client: true,
        contract: {
          include: {
            teamLeader: { select: { id: true, fullName: true } }
          }
        },
        ordresVirement: {
          include: { donneurOrdre: true },
          orderBy: { dateCreation: 'desc' }
        }
      },
      orderBy: { dateCloture: 'desc' }
    });

    console.log(`📊 ALL Bordereaux TRAITÉS in database: ${allBordereauxTraites.length}`);
    console.log('─'.repeat(100));
    allBordereauxTraites.forEach(b => {
      const teamLeader = b.contract?.teamLeader;
      const belongsToSenior = teamLeader?.id === user.id;
      const ov = b.ordresVirement[0];
      
      console.log(`${belongsToSenior ? '✅ SHOULD SEE' : '❌ SHOULD NOT SEE'} | ${b.client.name.padEnd(20)} | ${b.reference.padEnd(25)} | Team Leader: ${teamLeader?.fullName || 'NONE'}`);
    });
    console.log('');

    // Count what senior SHOULD see
    const shouldSeeBordereaux = allBordereauxTraites.filter(b => 
      b.contract?.teamLeaderId === user.id
    );

    console.log(`\n📈 SUMMARY - Bordereaux Traités:`);
    console.log(`   Total in DB: ${allBordereauxTraites.length}`);
    console.log(`   Senior SHOULD see: ${shouldSeeBordereaux.length}`);
    console.log(`   Senior SHOULD NOT see: ${allBordereauxTraites.length - shouldSeeBordereaux.length}\n`);

    // Get ALL manual OV entries (no bordereau)
    const allManualOVs = await prisma.ordreVirement.findMany({
      where: {
        bordereauId: null
      },
      include: {
        donneurOrdre: true
      },
      orderBy: { dateCreation: 'desc' }
    });

    console.log(`📊 ALL Manual OV Entries (no bordereau): ${allManualOVs.length}`);
    console.log('─'.repeat(100));
    allManualOVs.forEach(ov => {
      const createdBySenior = ov.utilisateurSante === user.id;
      console.log(`${createdBySenior ? '✅ SHOULD SEE' : '❌ SHOULD NOT SEE'} | ${(ov.clientName || 'Entrée manuelle').padEnd(20)} | ${ov.reference.padEnd(25)} | Created by: ${ov.utilisateurSante}`);
    });
    console.log('');

    // Count what senior SHOULD see
    const shouldSeeManualOVs = allManualOVs.filter(ov => 
      ov.utilisateurSante === user.id
    );

    console.log(`\n📈 SUMMARY - Manual OV Entries:`);
    console.log(`   Total in DB: ${allManualOVs.length}`);
    console.log(`   Senior SHOULD see: ${shouldSeeManualOVs.length}`);
    console.log(`   Senior SHOULD NOT see: ${allManualOVs.length - shouldSeeManualOVs.length}\n`);

    // FINAL VERDICT
    console.log('\n' + '='.repeat(100));
    console.log('🎯 EXPECTED BEHAVIOR FOR GESTIONNAIRE_SENIOR:');
    console.log('='.repeat(100));
    console.log(`1. Bordereaux Traités: Should see ${shouldSeeBordereaux.length} out of ${allBordereauxTraites.length}`);
    console.log(`2. Manual OV Entries: Should see ${shouldSeeManualOVs.length} out of ${allManualOVs.length}`);
    console.log('\n❌ CURRENT ISSUE: Senior is seeing ALL data (not filtered by their contracts/created entries)');
    console.log('✅ FIX NEEDED: Apply access filter in getBordereauxTraites() and getManualOVEntries()');
    console.log('='.repeat(100));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testGestionnaireSeniorAccess();
