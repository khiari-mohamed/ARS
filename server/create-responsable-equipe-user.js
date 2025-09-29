const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createResponsableEquipeUser() {
  console.log('🔍 Creating RESPONSABLE_EQUIPE user...');

  try {
    // Check if RESPONSABLE_EQUIPE user already exists
    const existingUser = await prisma.user.findFirst({
      where: { role: 'RESPONSABLE_EQUIPE' }
    });

    if (existingUser) {
      console.log('✅ RESPONSABLE_EQUIPE user already exists:', existingUser.email);
      return existingUser;
    }

    // Create new RESPONSABLE_EQUIPE user
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

    console.log('✅ Created RESPONSABLE_EQUIPE user:', {
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.fullName,
      role: newUser.role
    });

    return newUser;

  } catch (error) {
    console.error('❌ Error creating RESPONSABLE_EQUIPE user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createResponsableEquipeUser();