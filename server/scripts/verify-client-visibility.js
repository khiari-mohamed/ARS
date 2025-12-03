const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyClientVisibility() {
  console.log('='.repeat(80));
  console.log('CLIENT VISIBILITY VERIFICATION REPORT');
  console.log('='.repeat(80));
  console.log();

  try {
    // Get all users
    const users = await prisma.user.findMany({
      where: {
        role: {
          in: ['SUPER_ADMIN', 'ADMINISTRATEUR', 'CHEF_EQUIPE', 'GESTIONNAIRE']
        }
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true
      },
      orderBy: [
        { role: 'asc' },
        { fullName: 'asc' }
      ]
    });

    // Get all clients with their gestionnaires
    const allClients = await prisma.client.findMany({
      include: {
        gestionnaires: {
          select: {
            id: true,
            fullName: true,
            role: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    console.log(`📊 TOTAL CLIENTS IN DATABASE: ${allClients.length}`);
    console.log(`👥 TOTAL USERS: ${users.length}`);
    console.log();
    console.log('='.repeat(80));
    console.log();

    // Process each user
    for (const user of users) {
      console.log(`👤 USER: ${user.fullName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   ID: ${user.id}`);
      console.log();

      let visibleClients = [];

      // Determine visible clients based on role
      if (user.role === 'SUPER_ADMIN' || user.role === 'ADMINISTRATEUR') {
        visibleClients = allClients;
        console.log(`   ✅ VISIBILITY: ALL CLIENTS (${visibleClients.length})`);
      } else if (user.role === 'CHEF_EQUIPE' || user.role === 'GESTIONNAIRE') {
        visibleClients = allClients.filter(client => 
          client.gestionnaires.some(g => g.id === user.id)
        );
        console.log(`   ✅ VISIBILITY: ASSIGNED CLIENTS ONLY (${visibleClients.length})`);
      }

      console.log();

      if (visibleClients.length > 0) {
        console.log(`   📋 CLIENTS THIS USER SHOULD SEE:`);
        visibleClients.forEach((client, index) => {
          const assignedGestionnaires = client.gestionnaires.map(g => g.fullName).join(', ') || 'None';
          console.log(`      ${index + 1}. ${client.name}`);
          console.log(`         - ID: ${client.id}`);
          console.log(`         - Status: ${client.status}`);
          console.log(`         - Assigned to: ${assignedGestionnaires}`);
        });
      } else {
        console.log(`   ⚠️  NO CLIENTS ASSIGNED TO THIS USER`);
      }

      console.log();
      console.log('-'.repeat(80));
      console.log();
    }

    // Summary by role
    console.log('='.repeat(80));
    console.log('SUMMARY BY ROLE');
    console.log('='.repeat(80));
    console.log();

    const roleGroups = {
      'SUPER_ADMIN': [],
      'ADMINISTRATEUR': [],
      'CHEF_EQUIPE': [],
      'GESTIONNAIRE': []
    };

    users.forEach(user => {
      if (roleGroups[user.role]) {
        roleGroups[user.role].push(user);
      }
    });

    for (const [role, roleUsers] of Object.entries(roleGroups)) {
      if (roleUsers.length === 0) continue;

      console.log(`📌 ${role} (${roleUsers.length} users):`);
      
      if (role === 'SUPER_ADMIN' || role === 'ADMINISTRATEUR') {
        console.log(`   Should see: ALL ${allClients.length} clients`);
        roleUsers.forEach(u => {
          console.log(`   - ${u.fullName} → ${allClients.length} clients`);
        });
      } else {
        roleUsers.forEach(u => {
          const assignedCount = allClients.filter(c => 
            c.gestionnaires.some(g => g.id === u.id)
          ).length;
          console.log(`   - ${u.fullName} → ${assignedCount} clients (assigned only)`);
        });
      }
      console.log();
    }

    // Clients without gestionnaires
    const clientsWithoutGestionnaires = allClients.filter(c => c.gestionnaires.length === 0);
    if (clientsWithoutGestionnaires.length > 0) {
      console.log('='.repeat(80));
      console.log(`⚠️  CLIENTS WITHOUT GESTIONNAIRES (${clientsWithoutGestionnaires.length}):`);
      console.log('='.repeat(80));
      clientsWithoutGestionnaires.forEach(client => {
        console.log(`   - ${client.name} (ID: ${client.id})`);
      });
      console.log();
      console.log('   ⚠️  These clients will ONLY be visible to SUPER_ADMIN and ADMINISTRATEUR');
      console.log();
    }

    console.log('='.repeat(80));
    console.log('✅ VERIFICATION COMPLETE');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyClientVisibility();
