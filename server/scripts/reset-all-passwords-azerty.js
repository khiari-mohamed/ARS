const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function resetAllPasswords() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
      },
    });

    console.log(`\nFound ${users.length} users:\n`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.fullName} (${user.email}) - ${user.role}`);
    });

    const hashedPassword = await bcrypt.hash('Azerty123@', 10);

    await prisma.user.updateMany({
      data: {
        password: hashedPassword,
      },
    });

    console.log(`\n✅ All ${users.length} users passwords reset to: Azerty123@\n`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetAllPasswords();
