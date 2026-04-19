const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSudgazContracts() {
  console.log('🔍 Checking SUDGAZ RETRAITES contracts...\n');

  try {
    // Find SUDGAZ client
    const client = await prisma.client.findFirst({
      where: { name: { contains: 'SUDGAZ', mode: 'insensitive' } },
      include: { 
        contracts: {
          include: {
            teamLeader: true,
            assignedManager: true
          }
        }
      }
    });

    if (!client) {
      console.log('❌ SUDGAZ RETRAITES client not found');
      return;
    }

    console.log(`✅ Client Found:`);
    console.log(`   Name: ${client.name}`);
    console.log(`   ID: ${client.id}`);
    console.log(`   Contracts in client.contracts: ${client.contracts.length}\n`);

    if (client.contracts.length > 0) {
      console.log(`📋 Contracts linked to client:`);
      client.contracts.forEach((c, idx) => {
        console.log(`   ${idx + 1}. Contract ID: ${c.id.substring(0, 12)}...`);
        console.log(`      Client Name: ${c.clientName}`);
        console.log(`      Code Assuré: ${c.codeAssure || 'N/A'}`);
        console.log(`      Délai Règlement: ${c.delaiReglement}j`);
        console.log(`      Délai Réclamation: ${c.delaiReclamation}h`);
        console.log(`      Period: ${c.startDate.toISOString().split('T')[0]} → ${c.endDate.toISOString().split('T')[0]}`);
        console.log(`      Team Leader: ${c.teamLeader?.fullName || 'N/A'}`);
        console.log(``);
      });
    }

    // Now search for contracts that might match SUDGAZ
    console.log(`\n🔍 Searching for contracts with SUDGAZ in name...`);
    const contractsByName = await prisma.contract.findMany({
      where: {
        clientName: { contains: 'SUDGAZ', mode: 'insensitive' }
      },
      include: {
        client: true,
        teamLeader: true
      }
    });

    console.log(`   Found ${contractsByName.length} contracts with SUDGAZ in clientName\n`);
    contractsByName.forEach((c, idx) => {
      console.log(`   ${idx + 1}. Contract ID: ${c.id.substring(0, 12)}...`);
      console.log(`      Client Name: ${c.clientName}`);
      console.log(`      Code Assuré: ${c.codeAssure || 'N/A'}`);
      console.log(`      Linked to Client ID: ${c.clientId ? c.clientId.substring(0, 12) + '...' : 'NULL'}`);
      console.log(`      Linked to Client Name: ${c.client?.name || 'NONE'}`);
      console.log(`      Match: ${c.clientId === client.id ? '✅ YES' : '❌ NO'}`);
      console.log(``);
    });

    // Check what the API would return
    console.log(`\n🌐 Simulating API call: /contracts?clientId=${client.id}`);
    const apiResult = await prisma.contract.findMany({
      where: { clientId: client.id },
      include: {
        client: true,
        assignedManager: true,
        teamLeader: true
      }
    });
    console.log(`   API would return: ${apiResult.length} contracts\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSudgazContracts();
