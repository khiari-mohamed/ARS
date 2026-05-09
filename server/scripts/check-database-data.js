const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabaseData() {
  try {
    console.log('\n🔍 CHECKING DATABASE DATA...\n');
    console.log('='.repeat(80));

    // Check Clients
    const clients = await prisma.client.findMany({
      select: {
        id: true,
        name: true,
        chargeCompteId: true,
        _count: {
          select: {
            bordereaux: true,
            contracts: true
          }
        }
      }
    });
    console.log(`\n📊 CLIENTS: ${clients.length} found`);
    clients.forEach(c => {
      console.log(`  - ${c.name} | Bordereaux: ${c._count.bordereaux} | Contracts: ${c._count.contracts} | Charge: ${c.chargeCompteId || 'None'}`);
    });

    // Check Bordereaux
    const bordereaux = await prisma.bordereau.findMany({
      select: {
        id: true,
        reference: true,
        statut: true,
        archived: true,
        clientId: true,
        assignedToUserId: true,
        teamId: true,
        contractId: true,
        dateReception: true,
        client: { select: { name: true } }
      },
      orderBy: { dateReception: 'desc' },
      take: 20
    });
    console.log(`\n📋 BORDEREAUX: ${bordereaux.length} found (showing last 20)`);
    bordereaux.forEach(b => {
      console.log(`  - ${b.reference} | ${b.client?.name || 'No Client'} | Status: ${b.statut} | Archived: ${b.archived} | Assigned: ${b.assignedToUserId ? 'Yes' : 'No'} | Contract: ${b.contractId ? 'Yes' : 'No'}`);
    });

    // Check total counts
    const [totalBordereaux, archivedBordereaux, activeBordereaux] = await Promise.all([
      prisma.bordereau.count(),
      prisma.bordereau.count({ where: { archived: true } }),
      prisma.bordereau.count({ where: { archived: false } })
    ]);
    console.log(`\n📊 BORDEREAU STATS:`);
    console.log(`  Total: ${totalBordereaux}`);
    console.log(`  Archived: ${archivedBordereaux}`);
    console.log(`  Active: ${activeBordereaux}`);

    // Check by status
    const statusCounts = await prisma.bordereau.groupBy({
      by: ['statut'],
      _count: { id: true },
      where: { archived: false }
    });
    console.log(`\n📊 BORDEREAUX BY STATUS (Active only):`);
    statusCounts.forEach(s => {
      console.log(`  - ${s.statut}: ${s._count.id}`);
    });

    // Check Contracts
    const contracts = await prisma.contract.findMany({
      select: {
        id: true,
        clientName: true,
        teamLeaderId: true,
        assignedManagerId: true,
        _count: { select: { bordereaux: true } }
      }
    });
    console.log(`\n📄 CONTRACTS: ${contracts.length} found`);
    contracts.forEach(c => {
      console.log(`  - ${c.clientName} | Bordereaux: ${c._count.bordereaux} | Team Leader: ${c.teamLeaderId || 'None'} | Manager: ${c.assignedManagerId || 'None'}`);
    });

    // Check Documents
    const totalDocs = await prisma.document.count();
    const docsWithBordereau = await prisma.document.count({ where: { bordereauId: { not: null } } });
    console.log(`\n📄 DOCUMENTS: ${totalDocs} total | ${docsWithBordereau} linked to bordereaux`);

    // Check Users by role
    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
      where: { active: true }
    });
    console.log(`\n👥 ACTIVE USERS BY ROLE:`);
    usersByRole.forEach(u => {
      console.log(`  - ${u.role}: ${u._count.id}`);
    });

    // Check Chef d'équipe specifically
    const chefs = await prisma.user.findMany({
      where: { role: 'CHEF_EQUIPE', active: true },
      select: {
        id: true,
        fullName: true,
        email: true,
        _count: {
          select: {
            teamMembers: true,
            contractsAsTeamLeader: true
          }
        }
      }
    });
    console.log(`\n👨‍💼 CHEF D'ÉQUIPE DETAILS:`);
    chefs.forEach(c => {
      console.log(`  - ${c.fullName} (${c.email})`);
      console.log(`    Team Members: ${c._count.teamMembers}`);
      console.log(`    Contracts: ${c._count.contractsAsTeamLeader}`);
    });

    // Check if Mohamed Frad has access to bordereaux
    const mohamed = await prisma.user.findUnique({
      where: { email: 'mohamed.frad@arstunisie.com' },
      select: {
        id: true,
        fullName: true,
        role: true,
        contractsAsTeamLeader: {
          select: {
            id: true,
            clientName: true,
            _count: { select: { bordereaux: true } }
          }
        }
      }
    });

    if (mohamed) {
      console.log(`\n🔍 MOHAMED FRAD ACCESS CHECK:`);
      console.log(`  Role: ${mohamed.role}`);
      console.log(`  Contracts as Team Leader: ${mohamed.contractsAsTeamLeader.length}`);
      mohamed.contractsAsTeamLeader.forEach(c => {
        console.log(`    - ${c.clientName}: ${c._count.bordereaux} bordereaux`);
      });

      // Check bordereaux accessible to Mohamed
      const mohamedBordereaux = await prisma.bordereau.count({
        where: {
          archived: false,
          contract: { teamLeaderId: mohamed.id }
        }
      });
      console.log(`  Total accessible bordereaux: ${mohamedBordereaux}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ DATABASE CHECK COMPLETE\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseData();
