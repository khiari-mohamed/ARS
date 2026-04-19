const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function showSudgazContractsDetail() {
  console.log('🔍 Detailed SUDGAZ contracts breakdown...\n');

  try {
    const clients = await prisma.client.findMany({
      where: {
        name: { contains: 'SUDGAZ', mode: 'insensitive' }
      },
      include: {
        contracts: {
          include: {
            teamLeader: true
          }
        }
      }
    });

    clients.forEach((client, idx) => {
      console.log(`${'='.repeat(80)}`);
      console.log(`CLIENT ${idx + 1}: "${client.name}"`);
      console.log(`ID: ${client.id}`);
      console.log(`Contracts Count: ${client.contracts.length}`);
      console.log(`${'='.repeat(80)}`);
      
      if (client.contracts.length > 0) {
        client.contracts.forEach((contract, cIdx) => {
          console.log(`\n  Contract ${cIdx + 1}:`);
          console.log(`    Contract ID: ${contract.id}`);
          console.log(`    Client Name (in contract): ${contract.clientName}`);
          console.log(`    Code Assuré: ${contract.codeAssure || 'N/A'}`);
          console.log(`    Délai Règlement: ${contract.delaiReglement}j`);
          console.log(`    Délai Réclamation: ${contract.delaiReclamation}h`);
          console.log(`    Period: ${contract.startDate.toISOString().split('T')[0]} → ${contract.endDate.toISOString().split('T')[0]}`);
          console.log(`    Team Leader: ${contract.teamLeader?.fullName || 'N/A'}`);
          console.log(`    Document Path: ${contract.documentPath || 'N/A'}`);
        });
      } else {
        console.log(`\n  ❌ No contracts linked to this client`);
      }
      console.log(`\n`);
    });

    // Show what the frontend would see for "SUDGAZ RETRAITES"
    console.log(`\n${'='.repeat(80)}`);
    console.log(`FRONTEND VIEW: What "SUDGAZ RETRAITES" page would show`);
    console.log(`${'='.repeat(80)}`);
    
    const sudgazRetraites = clients.find(c => c.name === 'SUDGAZ RETRAITES');
    if (sudgazRetraites) {
      console.log(`Client ID being used: ${sudgazRetraites.id}`);
      console.log(`API call: /contracts?clientId=${sudgazRetraites.id}`);
      
      const apiContracts = await prisma.contract.findMany({
        where: { clientId: sudgazRetraites.id }
      });
      
      console.log(`API returns: ${apiContracts.length} contract(s)`);
      
      if (apiContracts.length > 0) {
        apiContracts.forEach((c, idx) => {
          console.log(`\n  ${idx + 1}. Contract: ${c.clientName}`);
          console.log(`     Code: ${c.codeAssure || 'N/A'}`);
          console.log(`     SLA: R:${c.delaiReglement}j / C:${c.delaiReclamation}h`);
        });
      } else {
        console.log(`\n  ❌ This is why the Contrats tab shows 0!`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

showSudgazContractsDetail();
