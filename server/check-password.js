const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function checkPassword() {
  const user = await prisma.user.findUnique({
    where: { email: 'respo@mail.com' }
  });
  
  if (!user) {
    console.log('❌ User not found');
    return;
  }
  
  console.log('User:', user.email);
  console.log('Has password:', !!user.password);
  
  // Test common passwords
  const testPasswords = ['password123', 'password', '123456', 'respo123', 'respo'];
  
  for (const pwd of testPasswords) {
    const match = await bcrypt.compare(pwd, user.password);
    if (match) {
      console.log(`✅ Password is: ${pwd}`);
      await prisma.$disconnect();
      return;
    }
  }
  
  console.log('❌ Password not found in common list');
  console.log('💡 Update password with:');
  console.log(`   UPDATE "User" SET password = '${await bcrypt.hash('password123', 10)}' WHERE email = 'respo@mail.com';`);
  
  await prisma.$disconnect();
}

checkPassword();
