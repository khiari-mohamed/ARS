import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyAlertAssignments() {
  console.log('🔍 VERIFICATION: Alert Assignments vs Current Handler\n');
  console.log('=' .repeat(120));

  // Get bordereaux with SLA breaches (same logic as alerts)
  const now = new Date();
  const bordereaux = await prisma.bordereau.findMany({
    where: {
      statut: { notIn: ['CLOTURE', 'PAYE'] },
      archived: false
    },
    include: {
      client: { select: { name: true } },
      currentHandler: { select: { id: true, fullName: true, role: true } },
      contract: {
        include: {
          assignedManager: { select: { id: true, fullName: true, role: true } },
          teamLeader: { select: { id: true, fullName: true, role: true } }
        }
      }
    },
    orderBy: { dateReception: 'asc' },
    take: 20
  });

  console.log(`\nFound ${bordereaux.length} bordereaux to analyze\n`);

  for (const b of bordereaux) {
    // Calculate SLA days
    const daysSince = b.dateReception 
      ? Math.floor((now.getTime() - new Date(b.dateReception).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Check if SLA breach
    const isSLABreach = daysSince > (b.delaiReglement || 30);

    if (!isSLABreach) continue;

    console.log(`\n📋 Bordereau: ${b.reference}`);
    console.log(`   Client: ${b.client?.name || 'N/A'}`);
    console.log(`   Statut: ${b.statut}`);
    console.log(`   SLA: ${daysSince} jours (délai: ${b.delaiReglement})`);
    console.log(`   Date Réception: ${b.dateReception?.toLocaleDateString('fr-FR')}`);
    console.log('');
    console.log('   🔍 ASSIGNMENT ANALYSIS:');
    console.log(`   ├─ assignedToUserId: ${b.assignedToUserId || 'NULL'}`);
    console.log(`   ├─ currentHandlerId: ${b.currentHandlerId || 'NULL'}`);
    console.log(`   ├─ teamId: ${b.teamId || 'NULL'}`);
    console.log(`   ├─ chargeCompteId: ${b.chargeCompteId || 'NULL'}`);
    console.log('');
    console.log('   👤 CURRENT HANDLER:');
    if (b.currentHandler) {
      console.log(`   ├─ ID: ${b.currentHandler.id}`);
      console.log(`   ├─ Nom: ${b.currentHandler.fullName}`);
      console.log(`   └─ Rôle: ${b.currentHandler.role}`);
    } else {
      console.log(`   └─ ❌ AUCUN CURRENT HANDLER`);
    }
    console.log('');
    console.log('   📄 CONTRACT INFO:');
    if (b.contract) {
      console.log(`   ├─ Contract ID: ${b.contractId}`);
      if (b.contract.assignedManager) {
        console.log(`   ├─ Assigned Manager: ${b.contract.assignedManager.fullName} (${b.contract.assignedManager.role})`);
      }
      if (b.contract.teamLeader) {
        console.log(`   └─ Team Leader: ${b.contract.teamLeader.fullName} (${b.contract.teamLeader.role})`);
      }
    } else {
      console.log(`   └─ ❌ NO CONTRACT`);
    }
    console.log('');
    console.log('   ✅ UI SHOULD DISPLAY:');
    
    // This is the EXACT logic from SuperAdminAlerts.tsx
    const displayedName = b.currentHandler?.fullName || 
                          b.contract?.teamLeader?.fullName || 
                          'Non assigné';
    
    console.log(`   └─ "${displayedName}"`);
    console.log('');
    console.log('   ⚠️  POTENTIAL ISSUES:');
    const issues: string[] = [];
    
    if (!b.currentHandler && !b.contract?.teamLeader) {
      issues.push('Aucun gestionnaire assigné (ni currentHandler ni teamLeader)');
    }
    if (b.assignedToUserId && !b.currentHandler) {
      issues.push('assignedToUserId existe mais currentHandler est NULL');
    }
    if (b.currentHandlerId && !b.currentHandler) {
      issues.push('currentHandlerId existe mais relation currentHandler est NULL');
    }
    
    if (issues.length > 0) {
      issues.forEach(issue => console.log(`   ├─ ⚠️  ${issue}`));
    } else {
      console.log(`   └─ ✅ Pas de problème détecté`);
    }
    
    console.log('\n' + '-'.repeat(120));
  }

  console.log('\n\n📊 SUMMARY:');
  const withCurrentHandler = bordereaux.filter(b => b.currentHandler).length;
  const withTeamLeader = bordereaux.filter(b => b.contract?.teamLeader).length;
  const withAssignedTo = bordereaux.filter(b => b.assignedToUserId).length;
  const withNone = bordereaux.filter(b => !b.currentHandler && !b.contract?.teamLeader).length;

  console.log(`Total bordereaux analyzed: ${bordereaux.length}`);
  console.log(`With currentHandler: ${withCurrentHandler}`);
  console.log(`With contract.teamLeader: ${withTeamLeader}`);
  console.log(`With assignedToUserId: ${withAssignedTo}`);
  console.log(`With NONE: ${withNone}`);

  await prisma.$disconnect();
}

verifyAlertAssignments().catch(console.error);
