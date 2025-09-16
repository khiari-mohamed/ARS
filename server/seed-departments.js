const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedDepartments() {
  try {
    console.log('🏢 Seeding departments...');
    
    // Insert the exact departments from cahier des charges
    const departments = [
      {
        id: 'dept-bo',
        name: 'Bureau d\'Ordre',
        code: 'BO',
        serviceType: 'BUREAU_ORDRE',
        description: 'Service de réception et saisie initiale des dossiers'
      },
      {
        id: 'dept-scan',
        name: 'Service SCAN',
        code: 'SCAN',
        serviceType: 'SCAN',
        description: 'Service de numérisation et indexation des documents'
      },
      {
        id: 'dept-sante',
        name: 'Équipe Santé',
        code: 'SANTE',
        serviceType: 'SANTE',
        description: 'Service de traitement des dossiers santé (Chef d\'équipe, Gestionnaires, Production, Tiers Payant)'
      },
      {
        id: 'dept-finance',
        name: 'Service Finance',
        code: 'FINANCE',
        serviceType: 'FINANCE',
        description: 'Service de gestion financière et virements'
      },
      {
        id: 'dept-client',
        name: 'Service Client',
        code: 'CLIENT',
        serviceType: 'CLIENT_SERVICE',
        description: 'Service de gestion des réclamations et support client'
      }
    ];

    for (const dept of departments) {
      await prisma.department.upsert({
        where: { id: dept.id },
        update: dept,
        create: dept
      });
      console.log(`✅ ${dept.name} (${dept.code})`);
    }

    // Update existing users to link to departments
    await prisma.user.updateMany({
      where: { role: 'BO' },
      data: { departmentId: 'dept-bo', department: 'Bureau d\'Ordre' }
    });

    await prisma.user.updateMany({
      where: { role: 'SCAN' },
      data: { departmentId: 'dept-scan', department: 'Service SCAN' }
    });

    await prisma.user.updateMany({
      where: { role: { in: ['CHEF_EQUIPE', 'GESTIONNAIRE'] } },
      data: { departmentId: 'dept-sante', department: 'Équipe Santé' }
    });

    await prisma.user.updateMany({
      where: { role: 'FINANCE' },
      data: { departmentId: 'dept-finance', department: 'Service Finance' }
    });

    await prisma.user.updateMany({
      where: { role: 'CLIENT_SERVICE' },
      data: { departmentId: 'dept-client', department: 'Service Client' }
    });

    console.log('🎯 Departments seeded successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding departments:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedDepartments();