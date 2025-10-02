const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateClientName() {
  try {
    console.log('🔧 Updating client name...\n');

    // Get the current client
    const client = await prisma.client.findFirst({
      where: { name: 'client' }
    });

    if (!client) {
      console.log('❌ Client with name "client" not found');
      return;
    }

    console.log(`📊 Found client: "${client.name}" (${client.email})`);

    // Update the client name to something more meaningful
    const newClientName = 'ARS Client Tunisie'; // You can change this to whatever you want

    const updatedClient = await prisma.client.update({
      where: { id: client.id },
      data: { name: newClientName }
    });

    console.log(`✅ Client name updated from "${client.name}" to "${updatedClient.name}"`);

    // Verify the update
    const verification = await prisma.client.findUnique({
      where: { id: client.id }
    });

    console.log(`🔍 Verification: Client name is now "${verification.name}"`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateClientName();