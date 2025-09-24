const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createTestUsers() {
  console.log('🔧 CREATING TEST USERS WITH PROPER CREDENTIALS');
  console.log('==============================================\n');

  try {
    const hashedPassword = await bcrypt.hash('Azerty123@', 10);

    // Create Gestionnaire
    const gestionnaire = await prisma.user.upsert({
      where: { email: 'test.gestionnaire@ars.tn' },
      update: {
        password: hashedPassword,
        active: true,
        role: 'GESTIONNAIRE'
      },
      create: {
        email: 'test.gestionnaire@ars.tn',
        password: hashedPassword,
        fullName: 'Test Gestionnaire',
        role: 'GESTIONNAIRE',
        active: true,
        capacity: 20
      }
    });

    // Create Chef d'équipe
    const chef = await prisma.user.upsert({
      where: { email: 'test.chef@ars.tn' },
      update: {
        password: hashedPassword,
        active: true,
        role: 'CHEF_EQUIPE'
      },
      create: {
        email: 'test.chef@ars.tn',
        password: hashedPassword,
        fullName: 'Test Chef Équipe',
        role: 'CHEF_EQUIPE',
        active: true,
        capacity: 50
      }
    });

    console.log('✅ USERS CREATED:');
    console.log('=================');
    console.log(`👤 Gestionnaire: ${gestionnaire.fullName}`);
    console.log(`   📧 Email: ${gestionnaire.email}`);
    console.log(`   🔑 Password: Azerty123@`);
    console.log(`   🆔 ID: ${gestionnaire.id}\n`);

    console.log(`👨💼 Chef d'Équipe: ${chef.fullName}`);
    console.log(`   📧 Email: ${chef.email}`);
    console.log(`   🔑 Password: Azerty123@`);
    console.log(`   🆔 ID: ${chef.id}\n`);

    // Get some bordereaux to assign
    const bordereaux = await prisma.bordereau.findMany({
      where: {
        archived: false,
        statut: { in: ['SCANNE', 'A_AFFECTER', 'EN_COURS'] }
      },
      take: 5
    });

    if (bordereaux.length > 0) {
      // Assign 3 bordereaux to gestionnaire
      const assignedCount = Math.min(3, bordereaux.length);
      for (let i = 0; i < assignedCount; i++) {
        await prisma.bordereau.update({
          where: { id: bordereaux[i].id },
          data: { 
            assignedToUserId: gestionnaire.id,
            statut: 'ASSIGNE'
          }
        });
      }

      console.log('📋 BORDEREAUX ASSIGNED:');
      console.log('=======================');
      console.log(`✅ Assigned ${assignedCount} bordereaux to ${gestionnaire.fullName}`);
      for (let i = 0; i < assignedCount; i++) {
        console.log(`   - ${bordereaux[i].reference}`);
      }
      console.log('');
    }

    console.log('🧪 TESTING CREDENTIALS:');
    console.log('=======================');
    console.log('GESTIONNAIRE:');
    console.log('  Email: test.gestionnaire@ars.tn');
    console.log('  Password: Azerty123@');
    console.log('');
    console.log('CHEF D\'ÉQUIPE:');
    console.log('  Email: test.chef@ars.tn');
    console.log('  Password: Azerty123@');
    console.log('');
    console.log('🌐 Login URL: http://localhost:3000/login');
    console.log('📋 Bordereaux URL: http://localhost:3000/bordereaux');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers();