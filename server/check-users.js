const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('🔍 Checking users in database...\n');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        active: true
      },
      orderBy: { role: 'asc' }
    });

    if (users.length === 0) {
      console.log('❌ No users found in database!');
    } else {
      console.log(`✅ Found ${users.length} users:\n`);
      console.log('Email                          | Role                    | Active | Name');
      console.log('-'.repeat(80));
      users.forEach(user => {
        const email = (user.email || 'N/A').padEnd(30);
        const role = (user.role || 'N/A').padEnd(23);
        const active = user.active ? '✓' : '✗';
        console.log(`${email} | ${role} | ${active}      | ${user.fullName || 'N/A'}`);
      });
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkUsers();
