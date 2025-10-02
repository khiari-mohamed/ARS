const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function assignContractsToChefs() {
  try {
    console.log('🔧 Assigning contracts to chef d\'équipes...\n');

    // Get all chef d'équipes
    const chefs = await prisma.user.findMany({
      where: { role: 'CHEF_EQUIPE', active: true },
      select: { id: true, fullName: true, email: true }
    });

    // Get all unassigned contracts
    const contracts = await prisma.contract.findMany({
      where: { teamLeaderId: null },
      include: {
        client: { select: { name: true } },
        assignedManager: { select: { fullName: true } }
      }
    });

    console.log(`👥 Found ${chefs.length} active chef d'équipes`);
    console.log(`📋 Found ${contracts.length} unassigned contracts\n`);

    if (chefs.length === 0) {
      console.log('❌ No active chef d\'équipes found');
      return;
    }

    if (contracts.length === 0) {
      console.log('✅ All contracts are already assigned');
      return;
    }

    // Assign contracts to chefs in round-robin fashion
    for (let i = 0; i < contracts.length; i++) {
      const contract = contracts[i];
      const chef = chefs[i % chefs.length]; // Round-robin assignment

      console.log(`📌 Assigning contract for client "${contract.client.name}" to chef "${chef.fullName}"`);

      await prisma.contract.update({
        where: { id: contract.id },
        data: { teamLeaderId: chef.id }
      });
    }

    console.log('\n✅ Assignment completed!\n');

    // Verify assignments
    console.log('🔍 Verification - Contracts per chef:');
    for (const chef of chefs) {
      const assignedContracts = await prisma.contract.count({
        where: { teamLeaderId: chef.id }
      });
      console.log(`  - ${chef.fullName}: ${assignedContracts} contracts`);
    }

    // Show remaining unassigned contracts
    const remainingUnassigned = await prisma.contract.count({
      where: { teamLeaderId: null }
    });
    console.log(`\n📊 Remaining unassigned contracts: ${remainingUnassigned}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assignContractsToChefs();