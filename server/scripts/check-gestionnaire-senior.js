const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGestionnaireSenior() {
  try {
    console.log('🔍 Checking for Gestionnaire Senior users...\n');

    // Find all Gestionnaire Senior users
    const seniorUsers = await prisma.user.findMany({
      where: {
        role: 'GESTIONNAIRE_SENIOR'
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        active: true,
        department: true
      }
    });

    console.log(`📊 Found ${seniorUsers.length} Gestionnaire Senior user(s)\n`);

    if (seniorUsers.length === 0) {
      console.log('❌ No Gestionnaire Senior users found in database');
      console.log('💡 You need to create or update users with role: GESTIONNAIRE_SENIOR\n');
      return;
    }

    // Check each senior's assignments
    for (const user of seniorUsers) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`👤 ${user.fullName} (${user.email})`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Active: ${user.active ? '✅' : '❌'}`);
      console.log(`   Department: ${user.department || 'N/A'}`);
      console.log('');

      // Check bordereaux assigned to this user
      const bordereaux = await prisma.bordereau.findMany({
        where: {
          OR: [
            { assignedToUserId: user.id },
            { currentHandlerId: user.id },
            { teamId: user.id },
            { chargeCompteId: user.id }
          ]
        },
        select: {
          id: true,
          reference: true,
          statut: true,
          type: true,
          client: {
            select: { name: true }
          }
        }
      });

      console.log(`📦 Bordereaux: ${bordereaux.length}`);
      if (bordereaux.length > 0) {
        bordereaux.forEach(b => {
          console.log(`   - ${b.reference} | ${b.client.name} | ${b.type} | ${b.statut}`);
        });
      }
      console.log('');

      // Check documents assigned to this user
      const documents = await prisma.document.findMany({
        where: {
          OR: [
            { assignedToUserId: user.id },
            { uploadedById: user.id }
          ]
        },
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          bordereau: {
            select: {
              reference: true,
              client: { select: { name: true } }
            }
          }
        }
      });

      console.log(`📄 Documents: ${documents.length}`);
      if (documents.length > 0) {
        const byStatus = {};
        const byType = {};
        documents.forEach(d => {
          byStatus[d.status || 'N/A'] = (byStatus[d.status || 'N/A'] || 0) + 1;
          byType[d.type] = (byType[d.type] || 0) + 1;
        });
        console.log(`   By Status:`, byStatus);
        console.log(`   By Type:`, byType);
        console.log(`   Sample documents:`);
        documents.slice(0, 5).forEach(d => {
          console.log(`   - ${d.name} | ${d.type} | ${d.status || 'N/A'} | Bordereau: ${d.bordereau?.reference || 'N/A'}`);
        });
      }
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Summary
    console.log('📊 SUMMARY:');
    console.log(`   Total Gestionnaire Senior: ${seniorUsers.length}`);
    console.log(`   Active: ${seniorUsers.filter(u => u.active).length}`);
    console.log(`   Inactive: ${seniorUsers.filter(u => !u.active).length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGestionnaireSenior();
