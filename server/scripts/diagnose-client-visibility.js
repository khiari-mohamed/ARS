const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnoseClientVisibility() {
  console.log('\n========================================');
  console.log('CLIENT & CONTRACT VISIBILITY DIAGNOSIS');
  console.log('========================================\n');

  // Get all clients
  const clients = await prisma.client.findMany({
    include: {
      chargeCompte: true,
      compagnieAssurance: true,
      contracts: {
        include: {
          assignedManager: true,
          teamLeader: true,
        },
      },
      gestionnaires: true,
    },
  });

  console.log(`📊 TOTAL CLIENTS: ${clients.length}\n`);

  // Get all users with role info
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { role: 'SUPER_ADMIN' },
        { role: 'CHEF_EQUIPE' },
        { role: 'GESTIONNAIRE' },
      ],
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
    },
  });

  console.log('👥 USERS:\n');
  users.forEach((user) => {
    console.log(`  - ${user.fullName} (${user.role}) - ID: ${user.id}`);
  });

  console.log('\n========================================');
  console.log('CLIENT DETAILS & RELATIONSHIPS');
  console.log('========================================\n');

  clients.forEach((client, index) => {
    console.log(`\n${index + 1}. CLIENT: ${client.name}`);
    console.log(`   ID: ${client.id}`);
    console.log(`   Status: ${client.status}`);
    console.log(`   Compagnie Assurance: ${client.compagnieAssurance?.nom || 'N/A'}`);
    console.log(`   Chargé de Compte: ${client.chargeCompte?.fullName || 'NONE'} (ID: ${client.chargeCompteId || 'NULL'})`);
    console.log(`   Gestionnaires (${client.gestionnaires.length}):`);
    
    if (client.gestionnaires.length === 0) {
      console.log(`      ⚠️  NO GESTIONNAIRES ASSIGNED`);
    } else {
      client.gestionnaires.forEach((gest) => {
        console.log(`      - ${gest.fullName} (${gest.role}) - ID: ${gest.id}`);
      });
    }

    console.log(`   Contracts (${client.contracts.length}):`);
    if (client.contracts.length === 0) {
      console.log(`      ⚠️  NO CONTRACTS`);
    } else {
      client.contracts.forEach((contract) => {
        console.log(`      - Contract ID: ${contract.id}`);
        console.log(`        Assigned Manager: ${contract.assignedManager?.fullName || 'NONE'} (ID: ${contract.assignedManagerId || 'NULL'})`);
        console.log(`        Team Leader: ${contract.teamLeader?.fullName || 'NONE'} (ID: ${contract.teamLeaderId || 'NULL'})`);
        console.log(`        SLA: R:${contract.delaiReglement}j, C:${contract.delaiReclamation}j`);
        console.log(`        Period: ${new Date(contract.startDate).toLocaleDateString()} - ${new Date(contract.endDate).toLocaleDateString()}`);
      });
    }
  });

  console.log('\n========================================');
  console.log('VISIBILITY RULES');
  console.log('========================================\n');

  const chefEquipes = users.filter((u) => u.role === 'CHEF_EQUIPE');

  chefEquipes.forEach((chef) => {
    console.log(`\n👤 ${chef.fullName} (CHEF_EQUIPE)`);
    console.log(`   Should see clients where:`);
    console.log(`   - Client.chargeCompteId = ${chef.id}`);
    console.log(`   - OR Client has gestionnaires containing ${chef.id}`);
    console.log(`   - OR Contract.teamLeaderId = ${chef.id}`);
    console.log(`   - OR Contract.assignedManagerId = ${chef.id}`);

    const visibleClients = clients.filter((client) => {
      const isChargeCompte = client.chargeCompteId === chef.id;
      const isGestionnaire = client.gestionnaires.some((g) => g.id === chef.id);
      const hasContractAsTeamLeader = client.contracts.some((c) => c.teamLeaderId === chef.id);
      const hasContractAsManager = client.contracts.some((c) => c.assignedManagerId === chef.id);

      return isChargeCompte || isGestionnaire || hasContractAsTeamLeader || hasContractAsManager;
    });

    console.log(`\n   ✅ SHOULD SEE ${visibleClients.length} CLIENTS:`);
    visibleClients.forEach((client) => {
      const reasons = [];
      if (client.chargeCompteId === chef.id) reasons.push('Chargé de Compte');
      if (client.gestionnaires.some((g) => g.id === chef.id)) reasons.push('Gestionnaire');
      if (client.contracts.some((c) => c.teamLeaderId === chef.id)) reasons.push('Team Leader on Contract');
      if (client.contracts.some((c) => c.assignedManagerId === chef.id)) reasons.push('Manager on Contract');

      console.log(`      - ${client.name} (${reasons.join(', ')})`);
    });

    if (visibleClients.length === 0) {
      console.log(`      ⚠️  NO CLIENTS VISIBLE - THIS IS THE PROBLEM!`);
    }
  });

  console.log('\n========================================');
  console.log('SUPER ADMIN VISIBILITY');
  console.log('========================================\n');

  const superAdmins = users.filter((u) => u.role === 'SUPER_ADMIN');
  superAdmins.forEach((admin) => {
    console.log(`👤 ${admin.fullName} (SUPER_ADMIN)`);
    console.log(`   ✅ Should see ALL ${clients.length} clients`);
  });

  console.log('\n========================================');
  console.log('RECOMMENDATIONS');
  console.log('========================================\n');

  const clientsWithoutRelations = clients.filter((client) => {
    return (
      !client.chargeCompteId &&
      client.gestionnaires.length === 0 &&
      !client.contracts.some((c) => c.teamLeaderId || c.assignedManagerId)
    );
  });

  if (clientsWithoutRelations.length > 0) {
    console.log('⚠️  CLIENTS WITH NO RELATIONSHIPS (invisible to Chef d\'équipe):');
    clientsWithoutRelations.forEach((client) => {
      console.log(`   - ${client.name} (ID: ${client.id})`);
    });
    console.log('\n   FIX: Assign chargeCompteId, gestionnaires, or contract relationships');
  }

  const contractsWithoutTeamLeader = clients.flatMap((c) =>
    c.contracts.filter((contract) => !contract.teamLeaderId)
  );

  if (contractsWithoutTeamLeader.length > 0) {
    console.log('\n⚠️  CONTRACTS WITHOUT TEAM LEADER:');
    contractsWithoutTeamLeader.forEach((contract) => {
      console.log(`   - Contract ID: ${contract.id} (Client: ${contract.clientName})`);
    });
    console.log('\n   FIX: Assign teamLeaderId to contracts');
  }

  console.log('\n========================================\n');

  await prisma.$disconnect();
}

diagnoseClientVisibility().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
