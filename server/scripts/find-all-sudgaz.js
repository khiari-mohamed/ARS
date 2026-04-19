const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findAllSudgazClients() {
  console.log('🔍 Finding all SUDGAZ-related clients...\n');

  try {
    const clients = await prisma.client.findMany({
      where: {
        name: { contains: 'SUDGAZ', mode: 'insensitive' }
      },
      include: {
        contracts: true,
        bordereaux: true,
        reclamations: true
      }
    });

    console.log(`Found ${clients.length} client(s) with SUDGAZ in name:\n`);

    clients.forEach((client, idx) => {
      console.log(`${idx + 1}. Client Name: "${client.name}"`);
      console.log(`   ID: ${client.id}`);
      console.log(`   Status: ${client.status}`);
      console.log(`   Contracts: ${client.contracts.length}`);
      console.log(`   Bordereaux: ${client.bordereaux.length}`);
      console.log(`   Réclamations: ${client.reclamations.length}`);
      console.log(`   Created: ${client.createdAt.toISOString()}`);
      console.log(``);
    });

    // Also check if there's a "SUDGAZ RETRAITES" client
    const exactMatch = await prisma.client.findFirst({
      where: { name: 'SUDGAZ RETRAITES' },
      include: { contracts: true }
    });

    if (exactMatch) {
      console.log(`\n✅ Found exact match for "SUDGAZ RETRAITES":`);
      console.log(`   ID: ${exactMatch.id}`);
      console.log(`   Contracts: ${exactMatch.contracts.length}`);
    } else {
      console.log(`\n❌ No exact match for "SUDGAZ RETRAITES" found`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findAllSudgazClients();
