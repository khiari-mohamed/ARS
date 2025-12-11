const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixChefRoles() {
  console.log('\n========================================');
  console.log('FIXING CHEF D\'ÉQUIPE ROLES');
  console.log('========================================\n');

  const usersToUpdate = [
    { id: '6d62cd9a-6cad-4a95-9d7d-ede13312148c', name: 'Mohamed Gharbi', email: 'senior1@ars.tn' },
    { id: '6b68a596-ba7e-4d7b-9c81-5b3a0b829e64', name: 'Leila Mansouri', email: 'senior2@ars.tn' },
  ];

  console.log('Users to update from GESTIONNAIRE_SENIOR to CHEF_EQUIPE:\n');
  usersToUpdate.forEach((user) => {
    console.log(`  - ${user.name} (${user.email})`);
  });

  console.log('\n⏳ Updating roles...\n');

  for (const user of usersToUpdate) {
    try {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { role: 'CHEF_EQUIPE' },
      });

      console.log(`✅ Updated ${user.name} to CHEF_EQUIPE`);
    } catch (error) {
      console.error(`❌ Failed to update ${user.name}:`, error.message);
    }
  }

  console.log('\n========================================');
  console.log('VERIFICATION');
  console.log('========================================\n');

  // Verify the changes
  for (const user of usersToUpdate) {
    const updated = await prisma.user.findUnique({
      where: { id: user.id },
      select: { fullName: true, role: true },
    });

    if (updated) {
      console.log(`${updated.fullName}: ${updated.role} ${updated.role === 'CHEF_EQUIPE' ? '✅' : '❌'}`);
    }
  }

  console.log('\n========================================');
  console.log('CLIENT VISIBILITY AFTER FIX');
  console.log('========================================\n');

  const clients = await prisma.client.findMany({
    include: {
      chargeCompte: true,
      contracts: {
        include: {
          teamLeader: true,
        },
      },
    },
  });

  const chefs = await prisma.user.findMany({
    where: { role: 'CHEF_EQUIPE' },
    select: { id: true, fullName: true },
  });

  chefs.forEach((chef) => {
    const visibleClients = clients.filter((client) => {
      const isChargeCompte = client.chargeCompteId === chef.id;
      const hasContractAsTeamLeader = client.contracts.some((c) => c.teamLeaderId === chef.id);
      const hasContractAsManager = client.contracts.some((c) => c.assignedManagerId === chef.id);

      return isChargeCompte || hasContractAsTeamLeader || hasContractAsManager;
    });

    console.log(`👤 ${chef.fullName} (CHEF_EQUIPE)`);
    console.log(`   ✅ Will see ${visibleClients.length} clients:`);
    visibleClients.forEach((client) => {
      console.log(`      - ${client.name}`);
    });
    console.log('');
  });

  console.log('========================================\n');

  await prisma.$disconnect();
}

fixChefRoles().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
