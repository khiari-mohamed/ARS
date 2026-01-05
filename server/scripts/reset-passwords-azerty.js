const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function resetAllPasswords() {
  const NEW_PASSWORD = 'Azerty123@';
  const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 10);

  try {
    const result = await prisma.user.updateMany({
      data: { password: hashedPassword }
    });

    console.log(`✅ ${result.count} passwords updated to: ${NEW_PASSWORD}`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAllPasswords();
