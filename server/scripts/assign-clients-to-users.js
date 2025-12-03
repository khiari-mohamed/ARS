const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function assignClientsToUsers() {
  console.log('🔄 Assigning clients to gestionnaires...\n');

  try {
    // Get all clients
    const clients = await prisma.client.findMany();
    
    // Get CHEF_EQUIPE and GESTIONNAIRE users
    const users = await prisma.user.findMany({
      where: {
        role: {
          in: ['CHEF_EQUIPE', 'GESTIONNAIRE']
        }
      }
    });

    if (clients.length === 0) {
      console.log('❌ No clients found');
      return;
    }

    if (users.length === 0) {
      console.log('❌ No CHEF_EQUIPE or GESTIONNAIRE users found');
      return;
    }

    console.log(`📊 Found ${clients.length} clients and ${users.length} users\n`);

    // Assign clients round-robin to users
    for (let i = 0; i < clients.length; i++) {
      const client = clients[i];
      const assignedUsers = users.slice(0, Math.min(2, users.length)); // Assign 2 users per client
      
      await prisma.client.update({
        where: { id: client.id },
        data: {
          gestionnaires: {
            connect: assignedUsers.map(u => ({ id: u.id }))
          }
        }
      });

      console.log(`✅ ${client.name} → assigned to:`);
      assignedUsers.forEach(u => console.log(`   - ${u.fullName} (${u.role})`));
      console.log();
    }

    console.log('✅ Assignment complete!\n');
    console.log('Run verify-client-visibility.js to check results');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assignClientsToUsers();
