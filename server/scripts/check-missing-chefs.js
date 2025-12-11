const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMissingChefs() {
  console.log('\n========================================');
  console.log('CHECKING MISSING CHEF D\'ÉQUIPE');
  console.log('========================================\n');

  // Get users who are assigned as team leaders in contracts
  const contracts = await prisma.contract.findMany({
    include: {
      teamLeader: true,
      assignedManager: true,
      client: true,
    },
  });

  console.log('📋 CONTRACTS AND THEIR TEAM LEADERS:\n');

  const teamLeaderIds = new Set();
  
  contracts.forEach((contract) => {
    console.log(`Contract: ${contract.clientName}`);
    console.log(`  Team Leader: ${contract.teamLeader?.fullName || 'NONE'}`);
    console.log(`  Team Leader ID: ${contract.teamLeaderId || 'NULL'}`);
    console.log(`  Team Leader Role: ${contract.teamLeader?.role || 'N/A'}`);
    console.log(`  Assigned Manager: ${contract.assignedManager?.fullName || 'NONE'}`);
    console.log(`  Manager Role: ${contract.assignedManager?.role || 'N/A'}\n`);
    
    if (contract.teamLeaderId) {
      teamLeaderIds.add(contract.teamLeaderId);
    }
  });

  console.log('========================================');
  console.log('USERS ASSIGNED AS TEAM LEADERS:');
  console.log('========================================\n');

  for (const userId of teamLeaderIds) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
      },
    });

    if (user) {
      const isChef = user.role === 'CHEF_EQUIPE';
      console.log(`${isChef ? '✅' : '❌'} ${user.fullName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Current Role: ${user.role}`);
      console.log(`   ID: ${user.id}`);
      
      if (!isChef) {
        console.log(`   ⚠️  PROBLEM: Should be CHEF_EQUIPE but is ${user.role}`);
      }
      console.log('');
    }
  }

  console.log('========================================');
  console.log('CLIENTS AND THEIR CHARGE DE COMPTE:');
  console.log('========================================\n');

  const clients = await prisma.client.findMany({
    include: {
      chargeCompte: true,
    },
  });

  clients.forEach((client) => {
    if (client.chargeCompte) {
      const isChef = client.chargeCompte.role === 'CHEF_EQUIPE';
      console.log(`${isChef ? '✅' : '❌'} ${client.name}`);
      console.log(`   Chargé de Compte: ${client.chargeCompte.fullName}`);
      console.log(`   Role: ${client.chargeCompte.role}`);
      
      if (!isChef) {
        console.log(`   ⚠️  PROBLEM: Should be CHEF_EQUIPE but is ${client.chargeCompte.role}`);
      }
      console.log('');
    }
  });

  console.log('========================================');
  console.log('RECOMMENDATION:');
  console.log('========================================\n');
  console.log('Users who need CHEF_EQUIPE role:');
  
  const usersNeedingUpdate = [];
  for (const userId of teamLeaderIds) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (user && user.role !== 'CHEF_EQUIPE') {
      usersNeedingUpdate.push(user);
      console.log(`  - ${user.fullName} (${user.email}) - Currently: ${user.role}`);
    }
  }

  if (usersNeedingUpdate.length > 0) {
    console.log('\n💡 Run the fix script to update these users to CHEF_EQUIPE role');
  } else {
    console.log('\n✅ All team leaders have correct CHEF_EQUIPE role');
  }

  console.log('\n========================================\n');

  await prisma.$disconnect();
}

checkMissingChefs().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
