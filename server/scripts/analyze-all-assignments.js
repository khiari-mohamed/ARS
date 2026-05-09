const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeAllAssignments() {
  console.log('=== COMPLETE BORDEREAU & DOCUMENT ASSIGNMENT ANALYSIS ===\n');

  const bordereaux = await prisma.bordereau.findMany({
    include: {
      currentHandler: { select: { fullName: true, role: true } },
      team: { select: { fullName: true, role: true } },
      chargeCompte: { select: { fullName: true, role: true } },
      contract: {
        include: {
          teamLeader: { select: { fullName: true, role: true } }
        }
      },
      documents: {
        include: {
          assignedTo: { select: { fullName: true, role: true } }
        }
      }
    },
    orderBy: { reference: 'asc' }
  });

  console.log(`Total Bordereaux: ${bordereaux.length}\n`);

  for (const b of bordereaux) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`BORDEREAU: ${b.reference}`);
    console.log(`${'='.repeat(80)}`);
    
    // Bordereau-level assignments
    console.log('\n📋 BORDEREAU-LEVEL ASSIGNMENTS:');
    console.log(`  assignedToUserId: ${b.assignedToUserId || 'NULL'}`);
    console.log(`  currentHandlerId: ${b.currentHandlerId || 'NULL'}`);
    console.log(`  teamId: ${b.teamId || 'NULL'}`);
    console.log(`  chargeCompteId: ${b.chargeCompteId || 'NULL'}`);
    console.log(`  contractId: ${b.contractId || 'NULL'}`);
    
    if (b.currentHandler) {
      console.log(`  ➜ currentHandler: ${b.currentHandler.fullName} (${b.currentHandler.role})`);
    }
    if (b.team) {
      console.log(`  ➜ team: ${b.team.fullName} (${b.team.role})`);
    }
    if (b.chargeCompte) {
      console.log(`  ➜ chargeCompte: ${b.chargeCompte.fullName} (${b.chargeCompte.role})`);
    }
    if (b.contract?.teamLeader) {
      console.log(`  ➜ contract.teamLeader: ${b.contract.teamLeader.fullName} (${b.contract.teamLeader.role})`);
    }
    
    if (b.assignedToUserId) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: b.assignedToUserId },
        select: { fullName: true, role: true }
      });
      if (assignedUser) {
        console.log(`  ➜ assignedToUser: ${assignedUser.fullName} (${assignedUser.role})`);
      }
    }
    
    // Document-level assignments
    console.log(`\n📄 DOCUMENTS (${b.documents.length} total):`);
    
    if (b.documents.length === 0) {
      console.log('  No documents');
    } else {
      const assignmentSummary = {};
      
      b.documents.forEach((doc, idx) => {
        const assignedTo = doc.assignedTo 
          ? `${doc.assignedTo.fullName} (${doc.assignedTo.role})`
          : 'NOT ASSIGNED';
        
        assignmentSummary[assignedTo] = (assignmentSummary[assignedTo] || 0) + 1;
        
        console.log(`  Doc ${idx + 1}: ${doc.name}`);
        console.log(`    ➜ Assigned to: ${assignedTo}`);
      });
      
      console.log('\n  📊 SUMMARY:');
      Object.entries(assignmentSummary).forEach(([user, count]) => {
        console.log(`    ${user}: ${count} document(s)`);
      });
      
      // Determine primary gestionnaire
      const gestionnaires = b.documents
        .filter(d => d.assignedTo && d.assignedTo.role === 'GESTIONNAIRE')
        .map(d => d.assignedTo.fullName);
      
      if (gestionnaires.length > 0) {
        const counts = gestionnaires.reduce((acc, name) => {
          acc[name] = (acc[name] || 0) + 1;
          return acc;
        }, {});
        const primary = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
        console.log(`\n  ✅ PRIMARY GESTIONNAIRE: ${primary}`);
      } else if (b.contract?.teamLeader && b.contract.teamLeader.role === 'GESTIONNAIRE_SENIOR') {
        console.log(`\n  ✅ GESTIONNAIRE_SENIOR (via contract): ${b.contract.teamLeader.fullName}`);
      } else {
        console.log(`\n  ⚠️  NO GESTIONNAIRE ASSIGNED`);
      }
    }
  }
  
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('ANALYSIS COMPLETE');
  console.log(`${'='.repeat(80)}`);

  await prisma.$disconnect();
}

analyzeAllAssignments().catch(console.error);
