const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkGestionnaires() {
  try {
    console.log('🔍 Checking Gestionnaires in database...\n');

    // Count total gestionnaires
    const totalGestionnaires = await prisma.user.count({
      where: {
        role: 'GESTIONNAIRE'
      }
    });
    console.log(`📊 Total Gestionnaires: ${totalGestionnaires}\n`);

    if (totalGestionnaires === 0) {
      console.log('❌ No Gestionnaires found in database');
      return;
    }

    // Get all gestionnaires with details
    const gestionnaires = await prisma.user.findMany({
      where: {
        role: 'GESTIONNAIRE'
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        active: true,
        createdAt: true,
        _count: {
          select: {
            ownerBulletinSoins: true
          }
        }
      },
      orderBy: {
        fullName: 'asc'
      }
    });

    console.log('👥 Gestionnaires List:');
    console.log('=====================================');
    
    gestionnaires.forEach((gest, index) => {
      console.log(`${index + 1}. ID: ${gest.id}`);
      console.log(`   Nom: ${gest.fullName}`);
      console.log(`   Email: ${gest.email}`);
      console.log(`   Actif: ${gest.active ? 'Oui' : 'Non'}`);
      console.log(`   BS assignés: ${gest._count.ownerBulletinSoins}`);
      console.log(`   Créé le: ${gest.createdAt}`);
      console.log('   -----------------------------------');
    });

    // Summary
    const activeGestionnaires = gestionnaires.filter(g => g.active).length;
    const totalAssignedBS = gestionnaires.reduce((sum, g) => sum + g._count.ownerBulletinSoins, 0);

    console.log('\n📈 Résumé:');
    console.log(`   Gestionnaires actifs: ${activeGestionnaires}/${totalGestionnaires}`);
    console.log(`   Total BS assignés: ${totalAssignedBS}`);

  } catch (error) {
    console.error('❌ Error checking gestionnaires:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGestionnaires();