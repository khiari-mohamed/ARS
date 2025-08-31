const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkGEDData() {
  try {
    console.log('🔍 Checking GED Data in Database...\n');

    // Check Documents table
    const totalDocuments = await prisma.document.count();
    console.log(`📄 Total Documents: ${totalDocuments}`);

    if (totalDocuments > 0) {
      // Documents by status
      const documentsByStatus = await prisma.document.groupBy({
        by: ['status'],
        _count: {
          id: true
        }
      });

      console.log('\n📊 Documents by Status:');
      documentsByStatus.forEach(group => {
        console.log(`  - ${group.status || 'NULL'}: ${group._count.id}`);
      });

      // Documents by type
      const documentsByType = await prisma.document.groupBy({
        by: ['type'],
        _count: {
          id: true
        }
      });

      console.log('\n📋 Documents by Type:');
      documentsByType.forEach(group => {
        console.log(`  - ${group.type}: ${group._count.id}`);
      });

      // Recent documents (last 10)
      const recentDocuments = await prisma.document.findMany({
        take: 10,
        orderBy: {
          uploadedAt: 'desc'
        },
        include: {
          uploader: {
            select: {
              fullName: true,
              role: true
            }
          },
          bordereau: {
            select: {
              reference: true,
              client: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      });

      console.log('\n📋 Recent Documents (Last 10):');
      recentDocuments.forEach((doc, index) => {
        console.log(`  ${index + 1}. ${doc.name}`);
        console.log(`     - ID: ${doc.id}`);
        console.log(`     - Type: ${doc.type}`);
        console.log(`     - Status: ${doc.status || 'NULL'}`);
        console.log(`     - Uploaded by: ${doc.uploader.fullName} (${doc.uploader.role})`);
        console.log(`     - Client: ${doc.bordereau?.client?.name || 'No client'}`);
        console.log(`     - Uploaded at: ${doc.uploadedAt.toISOString()}`);
        console.log('');
      });

      // Check for documents that should appear in corbeille
      const corbeilleDocuments = await prisma.document.findMany({
        where: {
          OR: [
            { status: 'EN_COURS' },
            { status: 'TRAITE' },
            { status: 'UPLOADED' },
            { status: null }
          ]
        },
        include: {
          uploader: {
            select: {
              id: true,
              fullName: true,
              role: true
            }
          },
          bordereau: {
            select: {
              reference: true,
              client: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      });

      console.log(`\n🗂️ Documents for Corbeille: ${corbeilleDocuments.length}`);
      
      if (corbeilleDocuments.length > 0) {
        console.log('\nCorbeille Documents:');
        corbeilleDocuments.slice(0, 5).forEach((doc, index) => {
          console.log(`  ${index + 1}. ${doc.name} (${doc.status || 'NULL'}) - ${doc.uploader.fullName}`);
        });
      }

      // Check users who can access corbeille
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { role: 'GESTIONNAIRE' },
            { role: 'CHEF_EQUIPE' },
            { role: 'ADMIN' }
          ]
        },
        select: {
          id: true,
          fullName: true,
          role: true,
          active: true
        }
      });

      console.log(`\n👥 Users who can access Corbeille: ${users.length}`);
      users.forEach(user => {
        console.log(`  - ${user.fullName} (${user.role}) - ${user.active ? 'Active' : 'Inactive'}`);
      });

    } else {
      console.log('\n⚠️ No documents found in database!');
      console.log('\n💡 To test the Corbeille tab, you need to:');
      console.log('1. Upload some documents via the Ingestion tab');
      console.log('2. Or insert test data into the Document table');
    }

    // Check related tables
    console.log('\n🔗 Related Tables:');
    const bordereauCount = await prisma.bordereau.count();
    const clientCount = await prisma.client.count();
    const userCount = await prisma.user.count();
    
    console.log(`  - Bordereaux: ${bordereauCount}`);
    console.log(`  - Clients: ${clientCount}`);
    console.log(`  - Users: ${userCount}`);

  } catch (error) {
    console.error('❌ Error checking GED data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkGEDData();