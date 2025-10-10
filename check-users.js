const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  console.log('👥 Checking users...\n');
  
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      fullName: true,
      active: true
    }
  });
  
  console.log(`Found ${users.length} users:\n`);
  users.forEach(u => {
    console.log(`${u.active ? '✅' : '❌'} ${u.email} - ${u.role} - ${u.fullName}`);
  });
  
  const responsables = users.filter(u => u.role === 'RESPONSABLE_DEPARTEMENT');
  console.log(`\n📊 RESPONSABLE_DEPARTEMENT users: ${responsables.length}`);
  
  await prisma.$disconnect();
}

checkUsers();
