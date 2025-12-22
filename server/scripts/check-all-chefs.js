const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllChefs() {
  console.log('\n========================================');
  console.log('ALL CHEF D\'ÉQUIPE IN SYSTEM');
  console.log('========================================\n');

  const chefs = await prisma.user.findMany({
    where: { role: 'CHEF_EQUIPE', active: true },
    select: {
      id: true,
      fullName: true,
      email: true,
      department: true
    }
  });

  console.log(`Found ${chefs.length} Chef(s) d'Équipe:\n`);
  chefs.forEach(chef => {
    console.log(`✅ ${chef.fullName}`);
    console.log(`   Email: ${chef.email}`);
    console.log(`   Department: ${chef.department || 'N/A'}`);
    console.log(`   ID: ${chef.id}\n`);
  });

  console.log('========================================');
  console.log('GESTIONNAIRE_SENIOR AND THEIR TEAM LEADERS');
  console.log('========================================\n');

  const seniors = await prisma.user.findMany({
    where: { role: 'GESTIONNAIRE_SENIOR', active: true },
    include: {
      teamLeader: {
        select: {
          id: true,
          fullName: true,
          role: true
        }
      }
    }
  });

  seniors.forEach(senior => {
    const hasChef = senior.teamLeader && senior.teamLeader.role === 'CHEF_EQUIPE';
    console.log(`${hasChef ? '✅' : '❌'} ${senior.fullName}`);
    console.log(`   Team Leader: ${senior.teamLeader?.fullName || 'NONE'}`);
    console.log(`   Team Leader Role: ${senior.teamLeader?.role || 'N/A'}`);
    console.log(`   Team Leader ID: ${senior.teamLeaderId || 'NULL'}\n`);
  });

  console.log('========================================');
  console.log('GESTIONNAIRES AND THEIR TEAM LEADERS');
  console.log('========================================\n');

  const gestionnaires = await prisma.user.findMany({
    where: { role: 'GESTIONNAIRE', active: true },
    include: {
      teamLeader: {
        select: {
          id: true,
          fullName: true,
          role: true
        }
      }
    }
  });

  gestionnaires.forEach(gest => {
    const hasChef = gest.teamLeader && gest.teamLeader.role === 'CHEF_EQUIPE';
    console.log(`${hasChef ? '✅' : '❌'} ${gest.fullName}`);
    console.log(`   Team Leader: ${gest.teamLeader?.fullName || 'NONE'}`);
    console.log(`   Team Leader Role: ${gest.teamLeader?.role || 'N/A'}`);
    console.log(`   Team Leader ID: ${gest.teamLeaderId || 'NULL'}\n`);
  });

  await prisma.$disconnect();
}

checkAllChefs().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
