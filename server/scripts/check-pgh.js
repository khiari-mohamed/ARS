const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPGHBordereaux() {
  console.log('\n🔍 CHECKING PGH BORDEREAUX ASSIGNMENTS\n');
  console.log('='.repeat(100));

  const pghBordereaux = await prisma.bordereau.findMany({
    where: {
      reference: {
        startsWith: 'PGH-BR-23'
      }
    },
    include: {
      client: true,
      contract: {
        include: {
          assignedManager: true,
          teamLeader: true
        }
      },
      currentHandler: true
    },
    orderBy: {
      reference: 'asc'
    }
  });

  console.log(`\nFound ${pghBordereaux.length} PGH bordereaux\n`);

  for (const bordereau of pghBordereaux) {
    console.log(`📋 ${bordereau.reference} (${bordereau.statut})`);
    console.log(`   Client: ${bordereau.client?.name || 'N/A'}`);
    
    // Check contract
    if (bordereau.contract) {
      console.log(`   ✅ Contract exists: ${bordereau.contract.id}`);
      
      if (bordereau.contract.assignedManager) {
        console.log(`   👤 contract.assignedManager: ${bordereau.contract.assignedManager.fullName} (${bordereau.contract.assignedManager.role})`);
        console.log(`      ✅ Should show: ${bordereau.contract.assignedManager.role === 'GESTIONNAIRE_SENIOR' ? '👨💼' : '👤'} ${bordereau.contract.assignedManager.fullName}`);
      } else {
        console.log(`   ❌ contract.assignedManager: NULL`);
      }
      
      if (bordereau.contract.teamLeader) {
        console.log(`   👥 contract.teamLeader: ${bordereau.contract.teamLeader.fullName} (${bordereau.contract.teamLeader.role})`);
      } else {
        console.log(`   ❌ contract.teamLeader: NULL`);
      }
    } else {
      console.log(`   ❌ No contract linked`);
    }
    
    // Check currentHandler
    if (bordereau.currentHandler) {
      console.log(`   🔄 currentHandler: ${bordereau.currentHandler.fullName} (${bordereau.currentHandler.role})`);
      if (bordereau.currentHandler.role === 'GESTIONNAIRE' || bordereau.currentHandler.role === 'GESTIONNAIRE_SENIOR') {
        console.log(`      ✅ Should show: ${bordereau.currentHandler.role === 'GESTIONNAIRE_SENIOR' ? '👨💼' : '👤'} ${bordereau.currentHandler.fullName}`);
      } else {
        console.log(`      ⚠️ Role is ${bordereau.currentHandler.role} - should NOT show`);
      }
    } else {
      console.log(`   ❌ currentHandler: NULL`);
    }
    
    // Final verdict
    console.log(`   🎯 FINAL DISPLAY:`);
    if (bordereau.contract?.assignedManager) {
      const icon = bordereau.contract.assignedManager.role === 'GESTIONNAIRE_SENIOR' ? '👨💼' : '👤';
      console.log(`      ${icon} ${bordereau.contract.assignedManager.fullName} (from contract.assignedManager)`);
    } else if (bordereau.currentHandler && (bordereau.currentHandler.role === 'GESTIONNAIRE' || bordereau.currentHandler.role === 'GESTIONNAIRE_SENIOR')) {
      const icon = bordereau.currentHandler.role === 'GESTIONNAIRE_SENIOR' ? '👨💼' : '👤';
      console.log(`      ${icon} ${bordereau.currentHandler.fullName} (from currentHandler)`);
    } else {
      console.log(`      ❌ Non assigné (CORRECT - no valid assignment)`);
    }
    
    console.log('');
  }

  console.log('='.repeat(100));
  
  // Summary
  const withContractManager = pghBordereaux.filter(b => b.contract?.assignedManager).length;
  const withCurrentHandler = pghBordereaux.filter(b => b.currentHandler && (b.currentHandler.role === 'GESTIONNAIRE' || b.currentHandler.role === 'GESTIONNAIRE_SENIOR')).length;
  const trulyUnassigned = pghBordereaux.filter(b => !b.contract?.assignedManager && (!b.currentHandler || (b.currentHandler.role !== 'GESTIONNAIRE' && b.currentHandler.role !== 'GESTIONNAIRE_SENIOR'))).length;
  
  console.log(`\n📊 SUMMARY:`);
  console.log(`   With contract.assignedManager: ${withContractManager}`);
  console.log(`   With valid currentHandler: ${withCurrentHandler}`);
  console.log(`   Truly unassigned: ${trulyUnassigned}`);
  console.log(`   Total: ${pghBordereaux.length}\n`);

  await prisma.$disconnect();
}

checkPGHBordereaux().catch(console.error);
