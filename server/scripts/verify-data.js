const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyData() {
  console.log('🔍 Verifying Database Data...\n');
  console.log('='.repeat(80));

  try {
    // Count all main tables
    const counts = {
      users: await prisma.user.count(),
      clients: await prisma.client.count(),
      contracts: await prisma.contract.count(),
      bordereaux: await prisma.bordereau.count(),
      bulletinSoins: await prisma.bulletinSoin.count(),
      adherents: await prisma.adherent.count(),
      ordresVirement: await prisma.ordreVirement.count(),
      donneurOrdre: await prisma.donneurOrdre.count(),
      reclamations: await prisma.reclamation.count(),
      documents: await prisma.document.count()
    };

    console.log('\n📊 DATABASE STATISTICS:');
    console.log('='.repeat(80));
    Object.entries(counts).forEach(([table, count]) => {
      const status = count > 0 ? '✅' : '❌';
      console.log(`${status} ${table.padEnd(20)} : ${count.toString().padStart(6)} records`);
    });

    // Get all users with their credentials
    console.log('\n\n👥 ALL USERS & CREDENTIALS:');
    console.log('='.repeat(80));
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        active: true,
        department: true,
        createdAt: true
      },
      orderBy: { role: 'asc' }
    });

    if (users.length === 0) {
      console.log('❌ NO USERS FOUND!');
    } else {
      console.log(`\nTotal Users: ${users.length}\n`);
      
      // Group by role
      const usersByRole = {};
      users.forEach(user => {
        if (!usersByRole[user.role]) {
          usersByRole[user.role] = [];
        }
        usersByRole[user.role].push(user);
      });

      Object.entries(usersByRole).forEach(([role, roleUsers]) => {
        console.log(`\n🔹 ${role} (${roleUsers.length} users):`);
        console.log('-'.repeat(80));
        
        roleUsers.forEach((user, index) => {
          const status = user.active ? '🟢 Active' : '🔴 Inactive';
          console.log(`\n  ${index + 1}. ${user.fullName}`);
          console.log(`     Email    : ${user.email}`);
          console.log(`     Password : [Check database - bcrypt hashed]`);
          console.log(`     Status   : ${status}`);
          console.log(`     Dept     : ${user.department || 'N/A'}`);
          console.log(`     ID       : ${user.id}`);
        });
      });
    }

    // Get clients
    console.log('\n\n🏢 CLIENTS:');
    console.log('='.repeat(80));
    
    const clients = await prisma.client.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        _count: {
          select: {
            contracts: true,
            bordereaux: true,
            adherents: true
          }
        }
      }
    });

    if (clients.length === 0) {
      console.log('❌ NO CLIENTS FOUND!');
    } else {
      clients.forEach((client, index) => {
        console.log(`\n${index + 1}. ${client.name}`);
        console.log(`   Email     : ${client.email || 'N/A'}`);
        console.log(`   Phone     : ${client.phone || 'N/A'}`);
        console.log(`   Status    : ${client.status}`);
        console.log(`   Contracts : ${client._count.contracts}`);
        console.log(`   Bordereaux: ${client._count.bordereaux}`);
        console.log(`   Adherents : ${client._count.adherents}`);
      });
    }

    // Get donneurs d'ordre
    console.log('\n\n💰 DONNEURS D\'ORDRE:');
    console.log('='.repeat(80));
    
    const donneurs = await prisma.donneurOrdre.findMany({
      select: {
        id: true,
        nom: true,
        rib: true,
        banque: true,
        statut: true,
        _count: {
          select: {
            ordresVirement: true
          }
        }
      }
    });

    if (donneurs.length === 0) {
      console.log('❌ NO DONNEURS D\'ORDRE FOUND!');
    } else {
      donneurs.forEach((donneur, index) => {
        console.log(`\n${index + 1}. ${donneur.nom}`);
        console.log(`   RIB       : ${donneur.rib}`);
        console.log(`   Banque    : ${donneur.banque}`);
        console.log(`   Statut    : ${donneur.statut}`);
        console.log(`   OVs       : ${donneur._count.ordresVirement}`);
      });
    }

    console.log('\n\n' + '='.repeat(80));
    console.log('✅ VERIFICATION COMPLETE!');
    console.log('='.repeat(80));

    // Summary
    const hasData = Object.values(counts).some(count => count > 0);
    if (hasData) {
      console.log('\n✅ Database contains data - restore was successful!');
    } else {
      console.log('\n❌ Database is empty - restore may have failed!');
    }

    console.log('\n📝 NOTE: User passwords are bcrypt hashed in the database.');
    console.log('   You may need to reset passwords or check the backup documentation.');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

verifyData()
  .then(() => {
    console.log('\n🎉 Done!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
