const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkFinanceData() {
  console.log('🔍 Checking Finance Module Data...\n');

  try {
    // 1. Virements (Wire Transfers)
    console.log('💰 VIREMENTS:');
    const virements = await prisma.virement.findMany({
      include: {
        bordereau: { include: { client: true } },
        confirmedBy: true
      }
    });
    console.log(`  Total Virements: ${virements.length}`);
    console.log(`  Confirmed: ${virements.filter(v => v.confirmed).length}`);
    console.log(`  Pending: ${virements.filter(v => !v.confirmed).length}`);
    console.log(`  Total Amount: ${virements.reduce((sum, v) => sum + v.montant, 0)}`);

    // 2. Wire Transfer Batches (OV)
    console.log('\n📊 WIRE TRANSFER BATCHES (OV):');
    const batches = await prisma.wireTransferBatch.findMany({
      include: {
        society: true,
        donneur: true,
        transfers: true
      }
    });
    console.log(`  Total Batches: ${batches.length}`);
    console.log(`  Status Distribution:`);
    const statusCounts = {};
    batches.forEach(b => {
      statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
    });
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`    - ${status}: ${count}`);
    });

    // 3. Individual Wire Transfers
    console.log('\n🔄 INDIVIDUAL WIRE TRANSFERS:');
    const transfers = await prisma.wireTransfer.findMany({
      include: {
        member: true,
        donneur: true,
        batch: true
      }
    });
    console.log(`  Total Transfers: ${transfers.length}`);
    console.log(`  Total Amount: ${transfers.reduce((sum, t) => sum + t.amount, 0)}`);

    // 4. Donneurs d'Ordre
    console.log('\n🏦 DONNEURS D\'ORDRE:');
    const donneurs = await prisma.donneurDOrdre.findMany({
      include: { society: true }
    });
    console.log(`  Total Donneurs: ${donneurs.length}`);
    donneurs.forEach(d => {
      console.log(`    - ${d.name} (${d.society.name})`);
    });

    // 5. Members (Adherents)
    console.log('\n👥 MEMBERS (ADHERENTS):');
    const members = await prisma.member.findMany({
      include: { society: true }
    });
    console.log(`  Total Members: ${members.length}`);
    console.log(`  By Society:`);
    const societyCounts = {};
    members.forEach(m => {
      const societyName = m.society.name;
      societyCounts[societyName] = (societyCounts[societyName] || 0) + 1;
    });
    Object.entries(societyCounts).forEach(([society, count]) => {
      console.log(`    - ${society}: ${count}`);
    });

    // 6. Societies
    console.log('\n🏢 SOCIETIES:');
    const societies = await prisma.society.findMany();
    console.log(`  Total Societies: ${societies.length}`);
    societies.forEach(s => {
      console.log(`    - ${s.name} (${s.code})`);
    });

    // 7. Finance Notifications
    console.log('\n🔔 FINANCE NOTIFICATIONS:');
    const notifications = await prisma.notification.findMany({
      where: {
        type: { in: ['FINANCE_NOTIFICATION', 'NOUVEAU_VIREMENT', 'VIREMENT_UPDATE'] }
      }
    });
    console.log(`  Total Finance Notifications: ${notifications.length}`);

    // 8. Bordereaux ready for virement
    console.log('\n📋 BORDEREAUX STATUS:');
    const bordereauxByStatus = await prisma.bordereau.groupBy({
      by: ['statut'],
      _count: { id: true }
    });
    console.log('  Status Distribution:');
    bordereauxByStatus.forEach(b => {
      console.log(`    - ${b.statut}: ${b._count.id}`);
    });

    // 9. Reconciliation Data
    console.log('\n🔄 RECONCILIATION DATA:');
    const bordereauxWithVirement = await prisma.bordereau.findMany({
      where: { virement: { isNot: null } },
      include: { virement: true, client: true }
    });
    console.log(`  Bordereaux with Virements: ${bordereauxWithVirement.length}`);
    console.log(`  Reconciled Amount: ${bordereauxWithVirement.reduce((sum, b) => sum + (b.virement?.montant || 0), 0)}`);

    // 10. Financial Performance Metrics
    console.log('\n📈 FINANCIAL PERFORMANCE:');
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentVirements = virements.filter(v => v.createdAt >= lastWeek);
    const avgProcessingTime = recentVirements.length > 0 
      ? recentVirements.reduce((sum, v) => {
          const processingTime = v.confirmedAt 
            ? (v.confirmedAt.getTime() - v.createdAt.getTime()) / (1000 * 60 * 60 * 24)
            : 0;
          return sum + processingTime;
        }, 0) / recentVirements.length
      : 0;

    console.log(`  Recent Virements (7 days): ${recentVirements.length}`);
    console.log(`  Average Processing Time: ${avgProcessingTime.toFixed(2)} days`);
    console.log(`  Confirmation Rate: ${recentVirements.length > 0 ? ((recentVirements.filter(v => v.confirmed).length / recentVirements.length) * 100).toFixed(1) : 0}%`);

    console.log('\n✅ Finance Module Data Check Complete!');

  } catch (error) {
    console.error('❌ Error checking finance data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFinanceData();