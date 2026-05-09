const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createTestUser() {
  const email = 'test@ars.com';
  const password = 'Test123@';
  const fullName = 'Test User';
  const role = 'SUPER_ADMIN';

  try {
    console.log('👤 Creating test user...\n');
    
    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log('⚠️  User already exists. Updating password...');
      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { email },
        data: { password: hashedPassword, active: true }
      });
      console.log('✅ Password updated!');
    } else {
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user
      await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          fullName,
          role,
          active: true,
          capacity: 50
        }
      });
      console.log('✅ User created successfully!');
    }

    console.log('\n📋 Test User Credentials:');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Role:', role);
    console.log('\n✅ You can now use these credentials for testing!');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

createTestUser();
