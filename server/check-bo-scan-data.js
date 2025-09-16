const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkBOScanData() {
  console.log('=== BO & SCAN MODULE DATA CHECK ===\n');

  try {
    // 1. Check all bordereau statuses
    console.log('1. BORDEREAU STATUS DISTRIBUTION:');
    const statusCounts = await prisma.bordereau.groupBy({
      by: ['statut'],
      _count: { id: true }
    });
    
    statusCounts.forEach(status => {
      console.log(`   ${status.statut}: ${status._count.id} bordereaux`);
    });
    console.log('');

    // 2. BO Corbeille Data (EN_ATTENTE)
    console.log('2. BO CORBEILLE (should show EN_ATTENTE):');
    const boCorbeille = await prisma.bordereau.findMany({
      where: { 
        statut: 'EN_ATTENTE',
        archived: false
      },
      include: { 
        client: { select: { name: true } }
      },
      take: 10
    });
    
    if (boCorbeille.length === 0) {
      console.log('   ❌ NO DATA - BO Corbeille is empty');
    } else {
      console.log(`   ✅ ${boCorbeille.length} items in BO Corbeille:`);
      boCorbeille.forEach(item => {
        console.log(`   - ${item.reference} (${item.client?.name}) - ${item.nombreBS} BS`);
      });
    }
    console.log('');

    // 3. SCAN Corbeille Data (A_SCANNER)
    console.log('3. SCAN CORBEILLE (should show A_SCANNER):');
    const scanCorbeille = await prisma.bordereau.findMany({
      where: { 
        statut: 'A_SCANNER',
        archived: false
      },
      include: { 
        client: { select: { name: true } }
      },
      take: 10
    });
    
    if (scanCorbeille.length === 0) {
      console.log('   ❌ NO DATA - SCAN Corbeille is empty');
    } else {
      console.log(`   ✅ ${scanCorbeille.length} items in SCAN Corbeille:`);
      scanCorbeille.forEach(item => {
        console.log(`   - ${item.reference} (${item.client?.name}) - ${item.nombreBS} BS`);
      });
    }
    console.log('');

    // 4. Check users by role
    console.log('4. USERS BY ROLE:');
    const userRoles = await prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
      where: { active: true }
    });
    
    userRoles.forEach(role => {
      console.log(`   ${role.role}: ${role._count.id} users`);
    });
    console.log('');

    // 5. Recent workflow transitions
    console.log('5. RECENT WORKFLOW TRANSITIONS:');
    const recentTransitions = await prisma.traitementHistory.findMany({
      where: {
        action: { contains: 'SCAN' }
      },
      include: {
        bordereau: { select: { reference: true } },
        user: { select: { fullName: true, role: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    if (recentTransitions.length === 0) {
      console.log('   ❌ NO SCAN TRANSITIONS FOUND');
    } else {
      recentTransitions.forEach(t => {
        console.log(`   - ${t.action}: ${t.bordereau?.reference} by ${t.user?.fullName} (${t.fromStatus} → ${t.toStatus})`);
      });
    }
    console.log('');

    // 6. Expected data flow
    console.log('6. EXPECTED DATA FLOW:');
    console.log('   BO Module should show:');
    console.log('   - Bordereaux with status: EN_ATTENTE');
    console.log('   - Button "Envoyer au SCAN" changes status: EN_ATTENTE → A_SCANNER');
    console.log('');
    console.log('   SCAN Module should show:');
    console.log('   - Bordereaux with status: A_SCANNER (ready to scan)');
    console.log('   - Bordereaux with status: SCAN_EN_COURS (currently scanning)');
    console.log('   - Bordereaux with status: SCANNE (completed scanning)');
    console.log('');

    // 7. Test data creation suggestion
    if (boCorbeille.length === 0) {
      console.log('7. TO CREATE TEST DATA:');
      console.log('   Run: node create-test-bordereau.js');
      console.log('   This will create bordereaux with EN_ATTENTE status for BO testing');
    }

  } catch (error) {
    console.error('Error checking data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBOScanData();