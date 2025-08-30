const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkBSDatabase() {
  try {
    console.log('🔍 Checking BS (Bulletin de Soins) in database...\n');

    // Count total BS records
    const totalBS = await prisma.bulletinSoin.count();
    console.log(`📊 Total BS records: ${totalBS}\n`);

    if (totalBS === 0) {
      console.log('❌ No BS records found in database');
      return;
    }

    // Get all BS records with details
    const bsRecords = await prisma.bulletinSoin.findMany({
      include: {
        bordereau: {
          select: {
            reference: true,
            client: {
              select: {
                name: true
              }
            }
          }
        },
        owner: {
          select: {
            fullName: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('📋 BS Records:');
    console.log('=====================================');
    
    bsRecords.forEach((bs, index) => {
      console.log(`${index + 1}. BS ID: ${bs.id}`);
      console.log(`   Numéro: ${bs.numBs || 'N/A'}`);
      console.log(`   Assuré: ${bs.nomAssure || 'N/A'}`);
      console.log(`   État: ${bs.etat || 'N/A'}`);
      console.log(`   Bordereau: ${bs.bordereau?.reference || 'N/A'}`);
      console.log(`   Client: ${bs.bordereau?.client?.name || 'N/A'}`);
      console.log(`   Assigné à: ${bs.owner?.fullName || 'Non assigné'}`);
      console.log(`   Créé le: ${bs.createdAt}`);
      console.log('   -----------------------------------');
    });

    // Count by status
    const statusCounts = await prisma.bulletinSoin.groupBy({
      by: ['etat'],
      _count: {
        id: true
      }
    });

    console.log('\n📈 BS par statut:');
    statusCounts.forEach(status => {
      console.log(`   ${status.etat || 'NULL'}: ${status._count.id}`);
    });

    // Count assigned vs unassigned
    const assignedCount = await prisma.bulletinSoin.count({
      where: {
        ownerId: {
          not: null
        }
      }
    });

    const unassignedCount = totalBS - assignedCount;

    console.log('\n👥 Assignation:');
    console.log(`   Assignés: ${assignedCount}`);
    console.log(`   Non assignés: ${unassignedCount}`);

  } catch (error) {
    console.error('❌ Error checking BS database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBSDatabase();