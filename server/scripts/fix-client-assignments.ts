import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixClientAssignments() {
  console.log('🔧 FIXING CLIENT ASSIGNMENTS\n');
  console.log('=' .repeat(80));
  
  // Get all clients
  const clients = await prisma.client.findMany();
  console.log(`\n📊 Found ${clients.length} clients`);
  
  // Get all Chef d'Équipe users
  const chefEquipeUsers = await prisma.user.findMany({
    where: { role: 'CHEF_EQUIPE' }
  });
  console.log(`👥 Found ${chefEquipeUsers.length} Chef d'Équipe users\n`);
  
  let assignmentCount = 0;
  
  // Assign ALL clients to ALL Chef d'Équipe users
  for (const user of chefEquipeUsers) {
    console.log(`\n🔗 Assigning clients to ${user.fullName}...`);
    
    for (const client of clients) {
      try {
        // Use the relation to connect
        await prisma.client.update({
          where: { id: client.id },
          data: {
            gestionnaires: {
              connect: { id: user.id }
            }
          }
        });
        console.log(`   ✅ ${client.name}`);
        assignmentCount++;
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(`   ⏭️  ${client.name} (already assigned)`);
        } else {
          console.log(`   ❌ ${client.name} - Error: ${error.message}`);
        }
      }
    }
  }
  
  console.log(`\n\n✅ COMPLETE: ${assignmentCount} assignments created`);
  console.log('=' .repeat(80));
  
  // Verify
  console.log('\n🔍 VERIFICATION:\n');
  for (const user of chefEquipeUsers) {
    const userWithClients = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        clientsManaged: true
      }
    });
    console.log(`${user.fullName}: ${userWithClients?.clientsManaged.length || 0} clients`);
  }
}

fixClientAssignments()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
