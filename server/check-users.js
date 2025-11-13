const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  console.log('\n👥 Checking database users...\n');
  
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        active: true
      }
    });
    
    if (users.length === 0) {
      console.log('❌ No users found in database!');
      console.log('\nRun seed script:');
      console.log('  npx prisma db seed\n');
    } else {
      console.log(`✅ Found ${users.length} users:\n`);
      users.forEach(u => {
        console.log(`  ${u.active ? '✅' : '❌'} ${u.email}`);
        console.log(`     Role: ${u.role}`);
        console.log(`     Name: ${u.fullName}`);
        console.log(`     ID: ${u.id}\n`);
      });
      
      console.log('💡 Use these credentials to login:');
      console.log('   Email: admin@ars.tn');
      console.log('   Password: admin123\n');
    }
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
