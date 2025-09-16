const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUserRoles() {
  try {
    console.log('🔍 Checking user roles...');

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        active: true
      }
    });

    console.log('\n📊 Current users:');
    users.forEach(user => {
      console.log(`   • ${user.fullName} (${user.email}) - Role: ${user.role} - Active: ${user.active}`);
    });

    // Check if we have any chef d'équipe
    const chefs = users.filter(u => u.role === 'CHEF_EQUIPE');
    const superAdmins = users.filter(u => u.role === 'SUPER_ADMIN');

    console.log(`\n🎯 Found ${chefs.length} Chef d'Équipe users`);
    console.log(`🎯 Found ${superAdmins.length} Super Admin users`);

    if (chefs.length === 0 && superAdmins.length === 0) {
      console.log('\n⚠️  No Chef d\'Équipe or Super Admin found!');
      console.log('Creating a test Chef d\'Équipe user...');

      // Create a test chef d'équipe user
      const testChef = await prisma.user.create({
        data: {
          email: 'chef@test.com',
          password: '$2b$10$hashedpassword', // This should be properly hashed in real app
          fullName: 'Chef d\'Équipe Test',
          role: 'CHEF_EQUIPE',
          active: true,
          capacity: 50
        }
      });

      console.log(`✅ Created test Chef d'Équipe: ${testChef.fullName} (${testChef.email})`);
    } else if (chefs.length === 0) {
      console.log('\n⚠️  No Chef d\'Équipe found, but Super Admins exist.');
      console.log('Super Admins can also use Chef d\'Équipe functionality.');
    }

    // Update the first user to be CHEF_EQUIPE if needed
    if (users.length > 0 && chefs.length === 0 && superAdmins.length === 0) {
      const firstUser = users[0];
      await prisma.user.update({
        where: { id: firstUser.id },
        data: { role: 'CHEF_EQUIPE' }
      });
      console.log(`✅ Updated ${firstUser.fullName} to CHEF_EQUIPE role`);
    }

  } catch (error) {
    console.error('❌ Error checking user roles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserRoles();