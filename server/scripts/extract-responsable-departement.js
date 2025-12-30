const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function extractResponsableDepartement() {
  try {
    console.log('🔍 Extracting users with RESPONSABLE_DEPARTEMENT role...\n');

    const users = await prisma.user.findMany({
      where: {
        role: 'RESPONSABLE_DEPARTEMENT'
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        department: true,
        active: true,
        createdAt: true
      },
      orderBy: {
        fullName: 'asc'
      }
    });

    if (users.length === 0) {
      console.log('❌ No users found with RESPONSABLE_DEPARTEMENT role');
      return;
    }

    console.log(`✅ Found ${users.length} user(s) with RESPONSABLE_DEPARTEMENT role:\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.fullName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Department: ${user.department || 'N/A'}`);
      console.log(`   Active: ${user.active ? 'Yes' : 'No'}`);
      console.log(`   Created: ${user.createdAt.toLocaleDateString()}`);
      console.log('');
    });

    console.log('\n📊 Summary:');
    console.log(`Total: ${users.length}`);
    console.log(`Active: ${users.filter(u => u.active).length}`);
    console.log(`Inactive: ${users.filter(u => !u.active).length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

extractResponsableDepartement();
