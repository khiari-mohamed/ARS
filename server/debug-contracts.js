const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n========================================');
  console.log('🔍 DEBUG: Contracts & Team Leader Assignment');
  console.log('========================================\n');

  // Get chef user
  const chef = await prisma.user.findFirst({
    where: { email: 'chef@mail.com' }
  });

  console.log('✅ Chef d\'équipe:', chef.fullName, `(${chef.email})`);
  console.log('   User ID:', chef.id);
  console.log('\n');

  // Get all contracts
  const contracts = await prisma.contract.findMany({
    include: {
      client: true,
      teamLeader: true,
      assignedManager: true
    }
  });

  console.log('📋 ALL CONTRACTS:\n');
  contracts.forEach((contract, index) => {
    console.log(`[${index + 1}] Contract ID: ${contract.id}`);
    console.log(`    Client: ${contract.client.name}`);
    console.log(`    Team Leader ID: ${contract.teamLeaderId || 'NOT SET'}`);
    console.log(`    Team Leader Name: ${contract.teamLeader?.fullName || 'NOT SET'}`);
    console.log(`    Assigned Manager: ${contract.assignedManager?.fullName}`);
    console.log('');
  });

  // Get all bordereaux with their contracts
  const bordereaux = await prisma.bordereau.findMany({
    include: {
      client: true,
      contract: {
        include: {
          teamLeader: true
        }
      }
    }
  });

  console.log('\n📦 BORDEREAUX & CONTRACT LINKS:\n');
  bordereaux.forEach((b, index) => {
    console.log(`[${index + 1}] Bordereau: ${b.reference}`);
    console.log(`    Client: ${b.client.name}`);
    console.log(`    Contract ID: ${b.contractId || 'NOT LINKED'}`);
    console.log(`    Contract Team Leader: ${b.contract?.teamLeader?.fullName || 'NOT SET'}`);
    console.log(`    Bordereau Status: ${b.statut}`);
    console.log('');
  });

  console.log('\n========================================');
  console.log('✅ DONE');
  console.log('========================================\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
