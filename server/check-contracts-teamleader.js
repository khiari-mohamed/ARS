const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n========================================');
  console.log('🔍 CHECK: Contract Team Leader Assignment');
  console.log('========================================\n');

  const contracts = await prisma.contract.findMany({
    include: {
      client: true,
      teamLeader: true,
      assignedManager: true
    }
  });

  console.log(`Total Contracts: ${contracts.length}\n`);

  contracts.forEach((contract, index) => {
    console.log(`[${index + 1}] Contract ID: ${contract.id}`);
    console.log(`    Client: ${contract.clientName}`);
    console.log(`    Team Leader ID: ${contract.teamLeaderId || '❌ NOT SET'}`);
    console.log(`    Team Leader Name: ${contract.teamLeader?.fullName || '❌ NOT SET'}`);
    console.log(`    Assigned Manager: ${contract.assignedManager?.fullName}`);
    console.log('');
  });

  const withTeamLeader = contracts.filter(c => c.teamLeaderId).length;
  const withoutTeamLeader = contracts.filter(c => !c.teamLeaderId).length;

  console.log('========================================');
  console.log(`✅ With Team Leader: ${withTeamLeader}`);
  console.log(`❌ Without Team Leader: ${withoutTeamLeader}`);
  console.log('========================================\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
