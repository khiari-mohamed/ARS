const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSeniorCorbeille() {
  console.log('🔍 Checking GESTIONNAIRE_SENIOR Corbeille Values...\n');

  try {
    // Get senior1 user
    const senior = await prisma.user.findUnique({
      where: { email: 'senior1@ars.tn' }
    });

    if (!senior) {
      console.log('❌ Senior1 user not found');
      return;
    }

    console.log(`👤 User: ${senior.fullName} (${senior.email})`);
    console.log(`📋 Role: ${senior.role}\n`);

    // Get client assigned to this senior
    const clientsManaged = await prisma.client.findMany({
      where: {
        chargeCompteId: senior.id
      }
    });

    console.log(`🏢 Clients Managed: ${clientsManaged.length}`);
    clientsManaged.forEach(c => console.log(`   - ${c.name}`));
    console.log('');

    // Get all documents for this senior's clients
    const allDocuments = await prisma.document.findMany({
      where: {
        bordereau: {
          clientId: {
            in: clientsManaged.map(c => c.id)
          }
        }
      },
      include: {
        bordereau: {
          include: {
            client: true
          }
        }
      }
    });

    console.log(`📄 Total Documents for Senior's Clients: ${allDocuments.length}\n`);

    // Count by status
    const statusCounts = {
      TRAITE: 0,
      EN_COURS: 0,
      NON_AFFECTE: 0,
      OTHER: 0
    };

    allDocuments.forEach(doc => {
      if (doc.status === 'TRAITE') {
        statusCounts.TRAITE++;
      } else if (doc.status === 'EN_COURS') {
        statusCounts.EN_COURS++;
      } else if (!doc.assignedToUserId || doc.assignedToUserId === null) {
        statusCounts.NON_AFFECTE++;
      } else {
        statusCounts.OTHER++;
      }
    });

    console.log('📊 Document Status Breakdown:');
    console.log(`   ✅ Dossiers Traités: ${statusCounts.TRAITE}`);
    console.log(`   🔄 Dossiers En Cours: ${statusCounts.EN_COURS}`);
    console.log(`   📥 Dossiers Non Affectés: ${statusCounts.NON_AFFECTE}`);
    console.log(`   ❓ Other: ${statusCounts.OTHER}\n`);

    // Check what the dashboard shows
    console.log('🎯 Expected Dashboard Values:');
    console.log(`   Dossiers Traités: ${statusCounts.TRAITE}`);
    console.log(`   Dossiers En Cours: ${statusCounts.EN_COURS}`);
    console.log(`   Dossiers Non Affectés: ${statusCounts.NON_AFFECTE}\n`);

    // Get bordereaux for this senior's clients
    const bordereaux = await prisma.bordereau.findMany({
      where: {
        clientId: {
          in: clientsManaged.map(c => c.id)
        }
      },
      include: {
        client: true
      }
    });

    console.log(`📋 Total Bordereaux for Senior's Clients: ${bordereaux.length}`);
    
    const bordereauStatuses = {};
    bordereaux.forEach(b => {
      bordereauStatuses[b.statut] = (bordereauStatuses[b.statut] || 0) + 1;
    });

    console.log('\n📊 Bordereau Status Breakdown:');
    Object.entries(bordereauStatuses).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

    console.log('\n✅ Check Complete!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSeniorCorbeille();
