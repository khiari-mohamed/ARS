const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createBasicUsers() {
  try {
    // Create Super Admin
    const superAdmin = await prisma.user.create({
      data: {
        email: 'admin@ars.com',
        password: await bcrypt.hash('admin123', 10),
        fullName: 'Super Admin',
        role: 'SUPER_ADMIN',
        active: true
      }
    });

    // Create Chef d'équipe
    const chefEquipe = await prisma.user.create({
      data: {
        email: 'chef@ars.com',
        password: await bcrypt.hash('chef123', 10),
        fullName: 'Chef Équipe',
        role: 'CHEF_EQUIPE',
        active: true
      }
    });

    // Create Gestionnaire assigned to Chef
    const gestionnaire = await prisma.user.create({
      data: {
        email: 'gest@ars.com',
        password: await bcrypt.hash('gest123', 10),
        fullName: 'Gestionnaire',
        role: 'GESTIONNAIRE',
        active: true,
        teamLeaderId: chefEquipe.id
      }
    });

    console.log('✅ Users created:');
    console.log('Super Admin:', superAdmin.email);
    console.log('Chef Équipe:', chefEquipe.email);
    console.log('Gestionnaire:', gestionnaire.email, '(assigned to chef)');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createBasicUsers();