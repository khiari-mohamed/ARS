const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkGestionnaireData() {
  console.log('\n🔍 ========== DIAGNOSTIC COMPLET GESTIONNAIRES & CHEFS D\'ÉQUIPE ==========\n');

  // Get all users
  const allUsers = await prisma.user.findMany({
    where: {
      role: { in: ['GESTIONNAIRE', 'CHEF_EQUIPE', 'SUPER_ADMIN'] }
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      teamLeaderId: true,
      active: true
    }
  });

  console.log(`📊 Total utilisateurs: ${allUsers.length}\n`);

  for (const user of allUsers) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`👤 ${user.fullName} (${user.email})`);
    console.log(`   Role: ${user.role} | ID: ${user.id} | Active: ${user.active}`);
    if (user.teamLeaderId) {
      const leader = allUsers.find(u => u.id === user.teamLeaderId);
      console.log(`   Chef d'équipe: ${leader?.fullName || 'Unknown'}`);
    }
    console.log(`${'='.repeat(80)}`);

    // Check assigned documents
    const assignedDocs = await prisma.document.findMany({
      where: { assignedToUserId: user.id },
      include: {
        bordereau: {
          include: {
            client: true,
            contract: true
          }
        }
      }
    });

    console.log(`\n📄 Documents assignés: ${assignedDocs.length}`);
    
    if (assignedDocs.length > 0) {
      const byStatus = {};
      const byType = {};
      const byClient = {};
      const byBordereau = {};

      assignedDocs.forEach(doc => {
        // Count by status
        const status = doc.status || 'null';
        byStatus[status] = (byStatus[status] || 0) + 1;

        // Count by type
        const type = doc.type || 'UNKNOWN';
        byType[type] = (byType[type] || 0) + 1;

        // Count by client
        const clientName = doc.bordereau?.client?.name || 'No Client';
        byClient[clientName] = (byClient[clientName] || 0) + 1;

        // Count by bordereau
        const bordereauRef = doc.bordereau?.reference || doc.bordereauId || 'No Bordereau';
        byBordereau[bordereauRef] = (byBordereau[bordereauRef] || 0) + 1;
      });

      console.log('\n   📊 Par Statut:');
      Object.entries(byStatus).forEach(([status, count]) => {
        if (count > 0) console.log(`      ${status}: ${count}`);
      });

      console.log('\n   📋 Par Type:');
      Object.entries(byType).forEach(([type, count]) => {
        console.log(`      ${type}: ${count}`);
      });

      console.log('\n   🏢 Par Client:');
      Object.entries(byClient).forEach(([client, count]) => {
        console.log(`      ${client}: ${count}`);
      });

      console.log('\n   📦 Par Bordereau:');
      Object.entries(byBordereau).forEach(([ref, count]) => {
        console.log(`      ${ref}: ${count}`);
      });

      // Show sample documents
      console.log('\n   📝 Échantillon de documents (5 premiers):');
      assignedDocs.slice(0, 5).forEach((doc, idx) => {
        console.log(`      ${idx + 1}. ${doc.name}`);
        console.log(`         - ID: ${doc.id}`);
        console.log(`         - Type: ${doc.type}`);
        console.log(`         - Statut: ${doc.status || 'null'}`);
        console.log(`         - Bordereau: ${doc.bordereau?.reference || doc.bordereauId}`);
        console.log(`         - Client: ${doc.bordereau?.client?.name || 'N/A'}`);
        console.log(`         - Date upload: ${doc.uploadedAt}`);
      });
    }

    // Check bordereaux where user is currentHandler
    const handledBordereaux = await prisma.bordereau.findMany({
      where: { currentHandlerId: user.id },
      include: {
        client: true,
        documents: true
      }
    });

    console.log(`\n📋 Bordereaux en tant que currentHandler: ${handledBordereaux.length}`);
    
    if (handledBordereaux.length > 0) {
      handledBordereaux.forEach((b, idx) => {
        console.log(`   ${idx + 1}. ${b.reference}`);
        console.log(`      - Statut: ${b.statut}`);
        console.log(`      - Client: ${b.client?.name || 'N/A'}`);
        console.log(`      - Documents: ${b.documents.length}`);
      });
    }

    // For CHEF_EQUIPE, check team members
    if (user.role === 'CHEF_EQUIPE') {
      const teamMembers = await prisma.user.findMany({
        where: { teamLeaderId: user.id },
        select: {
          id: true,
          fullName: true,
          role: true,
          assignedDocuments: {
            select: {
              id: true,
              status: true,
              type: true
            }
          }
        }
      });

      console.log(`\n👥 Membres de l'équipe: ${teamMembers.length}`);
      teamMembers.forEach(member => {
        console.log(`   - ${member.fullName} (${member.role}): ${member.assignedDocuments.length} documents`);
      });

      // Check contracts assigned to this chef
      const contracts = await prisma.contract.findMany({
        where: { teamLeaderId: user.id },
        include: {
          client: true,
          bordereaux: {
            include: {
              documents: true
            }
          }
        }
      });

      console.log(`\n📜 Contrats assignés: ${contracts.length}`);
      contracts.forEach(contract => {
        const totalDocs = contract.bordereaux.reduce((sum, b) => sum + b.documents.length, 0);
        console.log(`   - ${contract.clientName}: ${contract.bordereaux.length} bordereaux, ${totalDocs} documents`);
      });
    }

    // Check assignment history
    const assignmentHistory = await prisma.documentAssignmentHistory.findMany({
      where: {
        OR: [
          { assignedToUserId: user.id },
          { assignedByUserId: user.id },
          { fromUserId: user.id }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    if (assignmentHistory.length > 0) {
      console.log(`\n📜 Historique d'affectation (5 derniers):`);
      assignmentHistory.forEach((h, idx) => {
        console.log(`   ${idx + 1}. ${h.action} - ${h.createdAt.toISOString()}`);
        console.log(`      Raison: ${h.reason || 'N/A'}`);
      });
    }
  }

  // Global statistics
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('📊 STATISTIQUES GLOBALES');
  console.log(`${'='.repeat(80)}\n`);

  const totalDocuments = await prisma.document.count();
  const assignedDocuments = await prisma.document.count({
    where: { assignedToUserId: { not: null } }
  });
  const unassignedDocuments = await prisma.document.count({
    where: { assignedToUserId: null }
  });

  console.log(`Total documents: ${totalDocuments}`);
  console.log(`Documents assignés: ${assignedDocuments}`);
  console.log(`Documents non assignés: ${unassignedDocuments}`);

  const docsByStatus = await prisma.document.groupBy({
    by: ['status'],
    _count: true
  });

  console.log('\nDocuments par statut:');
  docsByStatus.forEach(group => {
    console.log(`   ${group.status || 'null'}: ${group._count}`);
  });

  const totalBordereaux = await prisma.bordereau.count();
  const bordereauByStatus = await prisma.bordereau.groupBy({
    by: ['statut'],
    _count: true
  });

  console.log(`\nTotal bordereaux: ${totalBordereaux}`);
  console.log('Bordereaux par statut:');
  bordereauByStatus.forEach(group => {
    console.log(`   ${group.statut}: ${group._count}`);
  });

  // Check for orphaned documents
  const orphanedDocs = await prisma.document.findMany({
    where: {
      bordereauId: null
    }
  });

  if (orphanedDocs.length > 0) {
    console.log(`\n⚠️  Documents orphelins (sans bordereau): ${orphanedDocs.length}`);
    orphanedDocs.slice(0, 5).forEach(doc => {
      console.log(`   - ${doc.name} (ID: ${doc.id})`);
    });
  }

  // Check for documents with invalid assignedToUserId
  const invalidAssignments = await prisma.document.findMany({
    where: {
      assignedToUserId: { not: null }
    },
    include: {
      assignedTo: true
    }
  });

  const docsWithInvalidUser = invalidAssignments.filter(doc => !doc.assignedTo);
  if (docsWithInvalidUser.length > 0) {
    console.log(`\n⚠️  Documents avec assignation invalide: ${docsWithInvalidUser.length}`);
    docsWithInvalidUser.slice(0, 5).forEach(doc => {
      console.log(`   - ${doc.name} (assignedToUserId: ${doc.assignedToUserId})`);
    });
  }

  console.log('\n✅ Diagnostic terminé\n');
}

checkGestionnaireData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
