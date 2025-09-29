const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createNewResponsableUser() {
  console.log('🔍 Creating new RESPONSABLE_EQUIPE user...');

  try {
    // Create new RESPONSABLE_EQUIPE user with new credentials
    const hashedPassword = await bcrypt.hash('Azerty123@', 10);
    
    const newUser = await prisma.user.create({
      data: {
        email: 'responsable.equipe@mail.com',
        password: hashedPassword,
        fullName: 'Responsable Equipe',
        role: 'RESPONSABLE_EQUIPE',
        active: true,
        capacity: 50
      }
    });

    console.log('✅ Created new RESPONSABLE_EQUIPE user:', {
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.fullName,
      role: newUser.role
    });

    console.log('🔑 Login credentials:');
    console.log('   Email: responsable.equipe@mail.com');
    console.log('   Password: Azerty123@');

    return newUser;

  } catch (error) {
    console.error('❌ Error creating new RESPONSABLE_EQUIPE user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createNewResponsableUser();