const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTeamAssignments() {
  try {
    console.log('🔍 Checking Chef d\'équipe and Gestionnaire assignments...\n');

    // Get all Chef d'équipes
    const chefEquipes = await prisma.user.findMany({
      where: { role: 'CHEF_EQUIPE', active: true },
      select: {
        id: true,
        fullName: true,
        email: true,
        teamMembers: {
          where: { role: 'GESTIONNAIRE', active: true },
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    console.log(`Found ${chefEquipes.length} Chef d'équipes:\n`);

    chefEquipes.forEach((chef, index) => {
      console.log(`${index + 1}. Chef d'équipe: ${chef.fullName} (${chef.email})`);
      console.log(`   ID: ${chef.id}`);
      
      if (chef.teamMembers.length > 0) {
        console.log(`   Gestionnaires assignés (${chef.teamMembers.length}):`);
        chef.teamMembers.forEach((gestionnaire, gIndex) => {
          console.log(`     ${gIndex + 1}. ${gestionnaire.fullName} (${gestionnaire.email}) - ID: ${gestionnaire.id}`);
        });
      } else {
        console.log(`   ❌ Aucun gestionnaire assigné`);
      }
      console.log('');
    });

    // Get all Gestionnaires and their team leaders
    console.log('\n📋 All Gestionnaires and their team assignments:\n');
    
    const gestionnaires = await prisma.user.findMany({
      where: { role: 'GESTIONNAIRE', active: true },
      select: {
        id: true,
        fullName: true,
        email: true,
        teamLeaderId: true,
        teamLeader: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    gestionnaires.forEach((gest, index) => {
      console.log(`${index + 1}. Gestionnaire: ${gest.fullName} (${gest.email})`);
      console.log(`   ID: ${gest.id}`);
      console.log(`   teamLeaderId: ${gest.teamLeaderId || 'NULL'}`);
      
      if (gest.teamLeader) {
        console.log(`   ✅ Assigné à: ${gest.teamLeader.fullName} (${gest.teamLeader.email})`);
      } else {
        console.log(`   ❌ Pas de chef d'équipe assigné`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTeamAssignments();