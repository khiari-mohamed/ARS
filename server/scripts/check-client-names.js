const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkClientNames() {
  try {
    console.log('🔍 Checking client names in database...\n');

    // Get all clients
    const clients = await prisma.client.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true
      }
    });

    console.log(`📊 Found ${clients.length} clients:`);
    clients.forEach((client, index) => {
      console.log(`${index + 1}. Name: "${client.name}" | Email: ${client.email} | Phone: ${client.phone}`);
    });

    // Get contracts and their client relationships
    console.log('\n📋 Checking contracts and their client relationships:');
    const contracts = await prisma.contract.findMany({
      include: {
        client: { select: { id: true, name: true } }
      }
    });

    contracts.forEach((contract, index) => {
      console.log(`${index + 1}. Contract clientName: "${contract.clientName}" | Actual client name: "${contract.client.name}"`);
    });

    // Get bordereaux and their client relationships
    console.log('\n📄 Checking bordereaux and their client relationships:');
    const bordereaux = await prisma.bordereau.findMany({
      include: {
        client: { select: { id: true, name: true } },
        contract: { 
          select: { 
            clientName: true,
            client: { select: { id: true, name: true } }
          }
        }
      },
      take: 5
    });

    bordereaux.forEach((bordereau, index) => {
      console.log(`${index + 1}. Bordereau ${bordereau.reference}:`);
      console.log(`   Direct client: "${bordereau.client?.name}"`);
      console.log(`   Contract clientName: "${bordereau.contract?.clientName}"`);
      console.log(`   Contract client name: "${bordereau.contract?.client?.name}"`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkClientNames();