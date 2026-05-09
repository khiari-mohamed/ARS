const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function resetPassword() {
  console.log('\n🔐 Resetting admin password...\n');
  
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const updated = await prisma.user.update({
      where: { email: 'admin@ars.tn' },
      data: { password: hashedPassword }
    });
    
    console.log('✅ Password reset successfully!');
    console.log('\n📝 Login credentials:');
    console.log('   Email: admin@ars.tn');
    console.log('   Password: admin123\n');
    console.log('🚀 Now run: node test-without-email.js\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();
