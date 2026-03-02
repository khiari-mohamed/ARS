const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function extractAndResetPasswords() {
  try {
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

    console.log('\n=== USERS LIST ===\n');
    console.log('Email\t\t\t\tRole\t\t\tName\t\t\tActive');
    console.log('='.repeat(100));
    
    users.forEach(user => {
      console.log(`${user.email.padEnd(30)}\t${user.role.padEnd(20)}\t${user.fullName.padEnd(25)}\t${user.active}`);
    });

    const newPassword = 'Azerty123@';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const result = await prisma.user.updateMany({
      data: {
        password: hashedPassword
      }
    });

    console.log(`\n✅ Successfully reset passwords for ${result.count} users to: ${newPassword}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

extractAndResetPasswords();
