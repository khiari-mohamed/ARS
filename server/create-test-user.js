const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const user = await prisma.user.create({
      data: {
        email: 'fikoll@mail.com',
        password: hashedPassword,
        fullName: 'Test Super Admin',
        role: 'SUPER_ADMIN',
        active: true,
      },
    });
    
    console.log('Test user created:', user);
  } catch (error) {
    console.error('Error creating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();