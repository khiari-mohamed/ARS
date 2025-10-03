const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkClientAssignments() {
  console.log('🔍 Checking client assignments to chef d\'équipes...\n');

  try {
    // 1. Get all clients and their potential assignments
    const clients = await prisma.client.findMany({
      include: {
        gestionnaires: {
          select: {
            id: true,
            fullName: true,
            teamLeaderId: true
          }
        },
        contracts: {
          include: {
            teamLeader: {
              select: {
                id: true,
                fullName: true
              }
            }
          }
        }
      }
    });

    console.log(`📋 Found ${clients.length} clients:`);
    clients.forEach(client => {
      console.log(`\n📊 Client: ${client.name}`);
      console.log(`   ID: ${client.id}`);
      
      if (client.gestionnaires.length > 0) {
        console.log(`   👥 Assigned gestionnaires:`);
        client.gestionnaires.forEach(gest => {
          console.log(`     - ${gest.fullName} (teamLeaderId: ${gest.teamLeaderId})`);
        });
      } else {
        console.log(`   ❌ No gestionnaires assigned`);
      }
      
      if (client.contracts.length > 0) {
        console.log(`   📄 Contracts:`);
        client.contracts.forEach(contract => {
          const teamLeader = contract.teamLeader;
          console.log(`     - Contract ID: ${contract.id}`);
          console.log(`       Team Leader: ${teamLeader ? teamLeader.fullName : 'None'}`);
        });
      } else {
        console.log(`   ❌ No contracts`);
      }
    });

    // 2. Check which chef should handle "samir" client
    const samirClient = clients.find(c => c.name.toLowerCase().includes('samir'));
    if (samirClient) {
      console.log(`\n🎯 Analysis for "samir" client:`);
      console.log(`   Should be handled by: ${samirClient.gestionnaires.length > 0 ? 'Assigned gestionnaires' : 'No specific assignment'}`);
      
      if (samirClient.gestionnaires.length > 0) {
        for (const gest of samirClient.gestionnaires) {
          if (gest.teamLeaderId) {
            const chef = await prisma.user.findUnique({
              where: { id: gest.teamLeaderId },
              select: { fullName: true }
            });
            console.log(`   Chef responsible: ${chef?.fullName || 'Unknown'}`);
          }
        }
      }
    }

    // 3. Suggest proper client assignments
    console.log(`\n💡 Suggested client assignments:`);
    
    const chefs = await prisma.user.findMany({
      where: { role: 'CHEF_EQUIPE' },
      include: {
        teamMembers: {
          where: { role: 'GESTIONNAIRE' },
          select: { id: true, fullName: true }
        }
      }
    });

    chefs.forEach(chef => {
      console.log(`\n👨‍💼 ${chef.fullName}:`);
      console.log(`   Team: ${chef.teamMembers.map(m => m.fullName).join(', ')}`);
      
      // Find clients that should belong to this chef
      const chefClients = clients.filter(client => 
        client.gestionnaires.some(gest => gest.teamLeaderId === chef.id) ||
        client.contracts.some(contract => contract.teamLeader?.id === chef.id)
      );
      
      if (chefClients.length > 0) {
        console.log(`   Assigned clients: ${chefClients.map(c => c.name).join(', ')}`);
      } else {
        console.log(`   ❌ No clients assigned`);
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkClientAssignments();