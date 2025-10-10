const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findGestionnaireUsers() {
  console.log('🔍 Finding GESTIONNAIRE users...\n');

  try {
    const users = await prisma.user.findMany({
      where: { role: 'GESTIONNAIRE' },
      select: { id: true, fullName: true, email: true }
    });

    if (users.length === 0) {
      console.log('❌ No GESTIONNAIRE users found');
      return;
    }

    console.log(`✅ Found ${users.length} GESTIONNAIRE user(s):\n`);
    users.forEach((u, i) => {
      console.log(`${i + 1}. ${u.fullName}`);
      console.log(`   ID: ${u.id}`);
      console.log(`   Email: ${u.email}`);
      console.log('');
    });

    console.log('Run: node scripts\\debug-gestionnaire-bordereaux.js <userId>');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findGestionnaireUsers();
