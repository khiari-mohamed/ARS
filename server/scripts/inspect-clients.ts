import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectClients() {
  console.log('🔍 Inspecting clients...\n');

  const clients = await prisma.client.findMany({
    include: {
      compagnieAssurance: true,
      adherents: {
        select: { id: true },
        take: 1
      }
    },
    orderBy: { name: 'asc' }
  });

  console.log(`📊 Total clients: ${clients.length}\n`);

  clients.forEach(client => {
    console.log(`📁 Client: ${client.name}`);
    console.log(`   Compagnie d'Assurance: ${client.compagnieAssurance?.nom || 'NONE'}`);
    console.log(`   Has adherents: ${client.adherents.length > 0 ? 'Yes' : 'No'}`);
    console.log('');
  });

  await prisma.$disconnect();
}

inspectClients()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  });
