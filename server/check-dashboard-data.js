const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDashboardData() {
  console.log('=== CHECKING DASHBOARD DATA ===\n');

  // Get all users
  const users = await prisma.user.findMany({
    where: {
      role: { in: ['CHEF_EQUIPE', 'GESTIONNAIRE'] }
    },
    select: {
      id: true,
      fullName: true,
      role: true,
      teamLeaderId: true
    }
  });

  console.log('📊 USERS:');
  users.forEach(u => {
    console.log(`  - ${u.fullName} (${u.role}) [ID: ${u.id}] [TeamLeader: ${u.teamLeaderId || 'None'}]`);
  });
  console.log('');

  // Get all bordereaux
  const bordereaux = await prisma.bordereau.findMany({
    include: {
      client: { select: { name: true } }
    }
  });

  console.log(`📦 TOTAL BORDEREAUX: ${bordereaux.length}\n`);

  // Get all documents
  const documents = await prisma.document.findMany({
    include: {
      bordereau: { include: { client: true } },
      assignedTo: { select: { fullName: true } }
    }
  });

  console.log(`📄 TOTAL DOCUMENTS: ${documents.length}\n`);

  // Check data for each user
  for (const user of users) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`👤 ${user.fullName} (${user.role})`);
    console.log(`${'='.repeat(80)}`);

    if (user.role === 'CHEF_EQUIPE') {
      // Chef d'équipe should see bordereaux where teamId = their ID
      const chefBordereaux = bordereaux.filter(b => b.teamId === user.id);
      const chefDocs = documents.filter(d => d.bordereau?.teamId === user.id);

      console.log(`\n📦 BORDEREAUX (teamId = ${user.id}):`);
      console.log(`  Total: ${chefBordereaux.length}`);
      
      const byClient = {};
      const byGestionnaire = {};
      
      chefBordereaux.forEach(b => {
        const clientName = b.client?.name || 'Unknown';
        byClient[clientName] = (byClient[clientName] || 0) + 1;
        
        const gestName = b.assignedToUserId || 'Non assigné';
        byGestionnaire[gestName] = (byGestionnaire[gestName] || 0) + 1;
      });

      console.log(`\n  Par client:`);
      Object.entries(byClient).forEach(([client, count]) => {
        console.log(`    ${client}: ${count}`);
      });

      console.log(`\n  Par gestionnaire:`);
      Object.entries(byGestionnaire).forEach(([gest, count]) => {
        const gestUser = users.find(u => u.id === gest);
        const gestName = gestUser ? gestUser.fullName : gest;
        console.log(`    ${gestName}: ${count}`);
      });

      console.log(`\n📄 DOCUMENTS (bordereau.teamId = ${user.id}):`);
      console.log(`  Total: ${chefDocs.length}`);
      
      const docsByType = {};
      chefDocs.forEach(d => {
        docsByType[d.type] = (docsByType[d.type] || 0) + 1;
      });
      
      console.log(`\n  Par type:`);
      Object.entries(docsByType).forEach(([type, count]) => {
        console.log(`    ${type}: ${count}`);
      });

    } else if (user.role === 'GESTIONNAIRE') {
      // Gestionnaire should see:
      // 1. Bordereaux assigned to them
      // 2. Bordereaux from their chef's team (if they have teamLeaderId)
      
      const ownBordereaux = bordereaux.filter(b => b.assignedToUserId === user.id);
      const chefBordereaux = user.teamLeaderId 
        ? bordereaux.filter(b => b.teamId === user.teamLeaderId)
        : [];
      
      const ownDocs = documents.filter(d => d.assignedToUserId === user.id);
      const chefDocs = user.teamLeaderId
        ? documents.filter(d => d.bordereau?.teamId === user.teamLeaderId)
        : [];

      console.log(`\n📦 OWN BORDEREAUX (assignedToUserId = ${user.id}):`);
      console.log(`  Total: ${ownBordereaux.length}`);
      
      const ownByClient = {};
      ownBordereaux.forEach(b => {
        const clientName = b.client?.name || 'Unknown';
        ownByClient[clientName] = (ownByClient[clientName] || 0) + 1;
      });
      
      console.log(`  Par client:`);
      Object.entries(ownByClient).forEach(([client, count]) => {
        console.log(`    ${client}: ${count}`);
      });

      if (user.teamLeaderId) {
        console.log(`\n📦 CHEF'S TEAM BORDEREAUX (teamId = ${user.teamLeaderId}):`);
        console.log(`  Total: ${chefBordereaux.length}`);
        
        const chefByClient = {};
        chefBordereaux.forEach(b => {
          const clientName = b.client?.name || 'Unknown';
          chefByClient[clientName] = (chefByClient[clientName] || 0) + 1;
        });
        
        console.log(`  Par client:`);
        Object.entries(chefByClient).forEach(([client, count]) => {
          console.log(`    ${client}: ${count}`);
        });
      }

      console.log(`\n📦 TOTAL SHOULD SEE: ${ownBordereaux.length + chefBordereaux.length}`);

      console.log(`\n📄 OWN DOCUMENTS (assignedToUserId = ${user.id}):`);
      console.log(`  Total: ${ownDocs.length}`);

      if (user.teamLeaderId) {
        console.log(`\n📄 CHEF'S TEAM DOCUMENTS (bordereau.teamId = ${user.teamLeaderId}):`);
        console.log(`  Total: ${chefDocs.length}`);
      }

      console.log(`\n📄 TOTAL DOCUMENTS SHOULD SEE: ${ownDocs.length + chefDocs.length}`);
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ ANALYSIS COMPLETE');
  console.log(`${'='.repeat(80)}\n`);

  await prisma.$disconnect();
}

checkDashboardData().catch(console.error);
