const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function getTestCredentials() {
  console.log('🔍 EXTRACTING TEST CREDENTIALS');
  console.log('================================\n');

  try {
    // Get Gestionnaires
    const gestionnaires = await prisma.user.findMany({
      where: { 
        role: 'GESTIONNAIRE',
        active: true 
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        bordereauxCurrentHandler: {
          select: {
            id: true,
            reference: true,
            statut: true
          },
          take: 3
        }
      },
      take: 3
    });

    // Get Chef d'équipe
    const chefs = await prisma.user.findMany({
      where: { 
        role: 'CHEF_EQUIPE',
        active: true 
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        bordereauxTeam: {
          select: {
            id: true,
            reference: true,
            statut: true
          },
          take: 3
        }
      },
      take: 3
    });

    console.log('👤 GESTIONNAIRES:');
    console.log('=================');
    if (gestionnaires.length === 0) {
      console.log('❌ No Gestionnaires found');
    } else {
      gestionnaires.forEach((gest, index) => {
        console.log(`${index + 1}. ${gest.fullName}`);
        console.log(`   📧 Email: ${gest.email}`);
        console.log(`   🔑 Password: password123 (default)`);
        console.log(`   📋 Assigned Bordereaux: ${gest.bordereauxCurrentHandler.length}`);
        if (gest.bordereauxCurrentHandler.length > 0) {
          gest.bordereauxCurrentHandler.forEach(b => {
            console.log(`      - ${b.reference} (${b.statut})`);
          });
        }
        console.log('');
      });
    }

    console.log('👨‍💼 CHEF D\'ÉQUIPE:');
    console.log('==================');
    if (chefs.length === 0) {
      console.log('❌ No Chef d\'équipe found');
    } else {
      chefs.forEach((chef, index) => {
        console.log(`${index + 1}. ${chef.fullName}`);
        console.log(`   📧 Email: ${chef.email}`);
        console.log(`   🔑 Password: password123 (default)`);
        console.log(`   📋 Team Bordereaux: ${chef.bordereauxTeam.length}`);
        if (chef.bordereauxTeam.length > 0) {
          chef.bordereauxTeam.forEach(b => {
            console.log(`      - ${b.reference} (${b.statut})`);
          });
        }
        console.log('');
      });
    }

    // Get total bordereaux count
    const totalBordereaux = await prisma.bordereau.count({
      where: { archived: false }
    });

    const assignedBordereaux = await prisma.bordereau.count({
      where: { 
        archived: false,
        assignedToUserId: { not: null }
      }
    });

    console.log('📊 SYSTEM OVERVIEW:');
    console.log('===================');
    console.log(`Total Bordereaux: ${totalBordereaux}`);
    console.log(`Assigned Bordereaux: ${assignedBordereaux}`);
    console.log(`Unassigned Bordereaux: ${totalBordereaux - assignedBordereaux}`);
    console.log('');

    console.log('🧪 TESTING INSTRUCTIONS:');
    console.log('========================');
    console.log('1. Login as GESTIONNAIRE first to see restricted view');
    console.log('2. Then login as CHEF_EQUIPE to see full functionality');
    console.log('3. Navigate to: http://localhost:3000/bordereaux');
    console.log('4. Default password for all users: password123');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getTestCredentials();