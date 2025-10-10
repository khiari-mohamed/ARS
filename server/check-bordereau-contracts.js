const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n========================================');
  console.log('🔍 CHECK: Bordereau-Contract Links');
  console.log('========================================\n');

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

  console.log(`Total Bordereaux: ${bordereaux.length}\n`);

  bordereaux.forEach((b, index) => {
    console.log(`[${index + 1}] Bordereau: ${b.reference}`);
    console.log(`    Client: ${b.client.name}`);
    console.log(`    Contract ID: ${b.contractId || '❌ NOT LINKED'}`);
    console.log(`    Contract Team Leader: ${b.contract?.teamLeader?.fullName || '❌ NO TEAM LEADER'}`);
    console.log('');
  });

  const linked = bordereaux.filter(b => b.contractId).length;
  const notLinked = bordereaux.filter(b => !b.contractId).length;

  console.log('========================================');
  console.log(`✅ Linked to Contract: ${linked}`);
  console.log(`❌ NOT Linked to Contract: ${notLinked}`);
  console.log('========================================\n');

  // Show available contracts
  const contracts = await prisma.contract.findMany({
    include: {
      client: true,
      teamLeader: true
    }
  });

  console.log('\n📋 AVAILABLE CONTRACTS:\n');
  contracts.forEach((c, index) => {
    console.log(`[${index + 1}] Contract ID: ${c.id}`);
    console.log(`    Client: ${c.clientName}`);
    console.log(`    Team Leader: ${c.teamLeader?.fullName}`);
    console.log('');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
