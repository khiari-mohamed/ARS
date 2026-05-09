const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testUsers() {
  try {
    console.log('🔍 Testing Users for Gestionnaire Assignment...');
    
    await prisma.$connect();
    
    // Get all users
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        active: true
      }
    });
    
    console.log(`📊 Total users: ${allUsers.length}`);
    
    // Show all users
    console.log('\n👥 All Users:');
    allUsers.forEach(user => {
      console.log(`  - ${user.fullName || 'No name'} (${user.email}) - Role: ${user.role} - Active: ${user.active}`);
    });
    
    // Filter for gestionnaires
    const gestionnaires = allUsers.filter(u => 
      (u.role === 'GESTIONNAIRE' || u.role === 'CUSTOMER_SERVICE') && 
      u.active !== false
    );
    
    console.log(`\n🎯 Available Gestionnaires: ${gestionnaires.length}`);
    gestionnaires.forEach(user => {
      console.log(`  - ${user.fullName || 'No name'} (${user.email}) - Role: ${user.role}`);
    });
    
    if (gestionnaires.length === 0) {
      console.log('\n⚠️  No gestionnaires found! Creating sample users...');
      
      // Create sample gestionnaires
      const sampleUsers = [
        {
          email: 'gestionnaire1@ars.com',
          fullName: 'Gestionnaire 1',
          role: 'GESTIONNAIRE',
          active: true,
          password: 'password123' // In real app, this should be hashed
        },
        {
          email: 'gestionnaire2@ars.com', 
          fullName: 'Gestionnaire 2',
          role: 'GESTIONNAIRE',
          active: true,
          password: 'password123'
        },
        {
          email: 'service.client@ars.com',
          fullName: 'Service Client',
          role: 'CUSTOMER_SERVICE', 
          active: true,
          password: 'password123'
        }
      ];
      
      for (const userData of sampleUsers) {
        try {
          const user = await prisma.user.create({
            data: userData
          });
          console.log(`✅ Created user: ${user.fullName} (${user.email})`);
        } catch (error) {
          console.log(`⚠️  User ${userData.email} might already exist`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testUsers();