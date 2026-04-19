const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixContractClientLink() {
  console.log('🔍 Checking contract-client relationships...\n');

  try {
    // Find SUDGAZ RETRAITES client
    const client = await prisma.client.findFirst({
      where: { name: { contains: 'SUDGAZ', mode: 'insensitive' } },
      include: { contracts: true }
    });

    if (!client) {
      console.log('❌ SUDGAZ RETRAITES client not found');
      return;
    }

    console.log(`✅ Found client: ${client.name} (ID: ${client.id})`);
    console.log(`   Contracts linked: ${client.contracts.length}\n`);

    // Find contract with number 5011952074
    const contract = await prisma.contract.findFirst({
      where: { 
        OR: [
          { id: { contains: '5011952074' } },
          { clientName: { contains: 'SUDGAZ', mode: 'insensitive' } },
          { codeAssure: '5011952074' }
        ]
      },
      include: { client: true }
    });

    if (!contract) {
      console.log('❌ Contract 5011952074 not found');
      console.log('\n📋 All contracts in database:');
      const allContracts = await prisma.contract.findMany({
        select: {
          id: true,
          clientName: true,
          clientId: true,
          codeAssure: true,
          startDate: true,
          endDate: true
        }
      });
      allContracts.forEach(c => {
        console.log(`   - ${c.clientName} | Code: ${c.codeAssure || 'N/A'} | ID: ${c.id.substring(0, 8)}... | ClientID: ${c.clientId ? c.clientId.substring(0, 8) + '...' : 'NULL'}`);
      });
      return;
    }

    console.log(`✅ Found contract:`);
    console.log(`   Client Name: ${contract.clientName}`);
    console.log(`   Code Assuré: ${contract.codeAssure || 'N/A'}`);
    console.log(`   Contract ID: ${contract.id}`);
    console.log(`   Linked to Client ID: ${contract.clientId || 'NULL'}`);
    console.log(`   Current Client: ${contract.client?.name || 'NONE'}\n`);

    // Check if contract is linked to the correct client
    if (contract.clientId !== client.id) {
      console.log(`⚠️  Contract is NOT linked to ${client.name}`);
      console.log(`   Updating contract to link to client...\n`);

      const updated = await prisma.contract.update({
        where: { id: contract.id },
        data: { clientId: client.id }
      });

      console.log(`✅ Contract updated successfully!`);
      console.log(`   Contract ${contract.id} is now linked to ${client.name}\n`);
    } else {
      console.log(`✅ Contract is already correctly linked to ${client.name}\n`);
    }

    // Verify the fix
    const verifyClient = await prisma.client.findUnique({
      where: { id: client.id },
      include: { contracts: true }
    });

    console.log(`\n✅ VERIFICATION:`);
    console.log(`   Client: ${verifyClient.name}`);
    console.log(`   Contracts count: ${verifyClient.contracts.length}`);
    verifyClient.contracts.forEach((c, idx) => {
      console.log(`   ${idx + 1}. ${c.clientName} | Délai R: ${c.delaiReglement}j | Délai C: ${c.delaiReclamation}h`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixContractClientLink();
