const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function getUserCredentials() {
  try {
    // Find Fatma Elbehi
    const user = await prisma.user.findFirst({
      where: {
        fullName: {
          contains: 'Fatma',
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        password: true
      }
    });

    if (user) {
      console.log('\n✅ User Found:');
      console.log('=====================================');
      console.log('ID:', user.id);
      console.log('Name:', user.fullName);
      console.log('Email:', user.email);
      console.log('Role:', user.role);
      console.log('Password (hashed):', user.password);
      console.log('=====================================\n');
      console.log('⚠️ Note: The password is hashed. You need to use the original password used during user creation.');
      console.log('💡 Common test passwords: "password123", "test123", "fatma123", or check your seed file.\n');
    } else {
      console.log('\n❌ User "Fatma Elbehi" not found.');
      console.log('💡 Searching for all users with "Fatma" in name...\n');
      
      const allFatma = await prisma.user.findMany({
        where: {
          fullName: {
            contains: 'Fatma',
            mode: 'insensitive'
          }
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true
        }
      });

      if (allFatma.length > 0) {
        console.log('Found users:');
        allFatma.forEach((u, index) => {
          console.log(`\n${index + 1}. ${u.fullName}`);
          console.log(`   Email: ${u.email}`);
          console.log(`   Role: ${u.role}`);
          console.log(`   ID: ${u.id}`);
        });
      } else {
        console.log('No users found with "Fatma" in name.');
      }
    }

    // Also search for the user by ID from the logs
    console.log('\n🔍 Searching by ID from logs (de7d98eb-16fe-4584-8ed6-1c19517ad927)...\n');
    const userById = await prisma.user.findUnique({
      where: {
        id: 'de7d98eb-16fe-4584-8ed6-1c19517ad927'
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true
      }
    });

    if (userById) {
      console.log('✅ User Found by ID:');
      console.log('=====================================');
      console.log('ID:', userById.id);
      console.log('Name:', userById.fullName);
      console.log('Email:', userById.email);
      console.log('Role:', userById.role);
      console.log('=====================================\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getUserCredentials();
