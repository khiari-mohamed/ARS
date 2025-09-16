const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkScanModuleData() {
  console.log('=== SCAN MODULE DATA ANALYSIS ===\n');

  try {
    // 1. Check SCAN Corbeille Data (what ScanCorbeille component should show)
    console.log('1. SCAN CORBEILLE DATA:');
    
    const [toScan, scanning, completed] = await Promise.all([
      // À Scanner (A_SCANNER status)
      prisma.bordereau.findMany({
        where: { statut: 'A_SCANNER' },
        include: { client: true },
        take: 10
      }),
      
      // En Cours (SCAN_EN_COURS status)  
      prisma.bordereau.findMany({
        where: { statut: 'SCAN_EN_COURS' },
        include: { client: true },
        take: 10
      }),
      
      // Terminés (SCANNE status)
      prisma.bordereau.findMany({
        where: { 
          statut: 'SCANNE',
          dateFinScan: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        include: { client: true },
        take: 10
      })
    ]);

    console.log(`   À Scanner: ${toScan.length} bordereaux`);
    toScan.forEach(b => {
      console.log(`   - ${b.reference} (${b.client?.name}) - ${b.nombreBS} BS`);
    });

    console.log(`\n   En Cours: ${scanning.length} bordereaux`);
    scanning.forEach(b => {
      console.log(`   - ${b.reference} (${b.client?.name}) - Started: ${b.dateDebutScan?.toLocaleString()}`);
    });

    console.log(`\n   Terminés: ${completed.length} bordereaux`);
    completed.forEach(b => {
      console.log(`   - ${b.reference} (${b.client?.name}) - Completed: ${b.dateFinScan?.toLocaleString()}`);
    });

    // 2. Check what the interface is showing vs what should be shown
    console.log('\n2. INTERFACE vs DATABASE MISMATCH:');
    console.log(`   Interface shows: 9 "À Scanner"`);
    console.log(`   Database has: ${toScan.length} with A_SCANNER status`);
    
    if (toScan.length !== 9) {
      console.log('   ❌ MISMATCH! Interface and database don\'t match');
      
      // Check what status the 9 bordereaux actually have
      const allBordereaux = await prisma.bordereau.findMany({
        where: {
          reference: {
            in: ['BS-20250915-840715-877', 'BS-20250915-682078-304', 'STMT-med-1757953567261', 
                 'TEST-BO-1757967406412', 'BO-TEST-1757967654082']
          }
        },
        include: { client: true }
      });
      
      console.log('\n   Actual status of bordereaux shown in interface:');
      allBordereaux.forEach(b => {
        console.log(`   - ${b.reference}: ${b.statut} (should be A_SCANNER for SCAN queue)`);
      });
    } else {
      console.log('   ✅ MATCH! Interface and database are synchronized');
    }

    // 3. Check workflow transitions
    console.log('\n3. WORKFLOW TRANSITIONS:');
    const recentTransitions = await prisma.traitementHistory.findMany({
      where: {
        action: { contains: 'SCAN' }
      },
      include: {
        bordereau: { select: { reference: true } },
        user: { select: { fullName: true, role: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    if (recentTransitions.length === 0) {
      console.log('   ❌ NO SCAN WORKFLOW TRANSITIONS FOUND');
      console.log('   This means the workflow endpoints might not be working');
    } else {
      console.log(`   ✅ Found ${recentTransitions.length} recent SCAN transitions:`);
      recentTransitions.forEach(t => {
        console.log(`   - ${t.action}: ${t.bordereau?.reference} by ${t.user?.fullName} (${t.fromStatus} → ${t.toStatus})`);
      });
    }

    // 4. Check SCAN team users
    console.log('\n4. SCAN TEAM USERS:');
    const scanUsers = await prisma.user.findMany({
      where: { role: 'SCAN', active: true }
    });
    
    if (scanUsers.length === 0) {
      console.log('   ❌ NO SCAN USERS FOUND');
      console.log('   The SCAN corbeille might not work without SCAN users');
    } else {
      console.log(`   ✅ Found ${scanUsers.length} SCAN users:`);
      scanUsers.forEach(u => {
        console.log(`   - ${u.fullName} (${u.email})`);
      });
    }

    // 5. Check notifications
    console.log('\n5. SCAN NOTIFICATIONS:');
    const scanNotifications = await prisma.notification.findMany({
      where: {
        type: 'NEW_BORDEREAU_SCAN',
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      include: {
        user: { select: { fullName: true, role: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    if (scanNotifications.length === 0) {
      console.log('   ❌ NO SCAN NOTIFICATIONS FOUND');
      console.log('   SCAN team might not be receiving notifications from BO');
    } else {
      console.log(`   ✅ Found ${scanNotifications.length} recent SCAN notifications:`);
      scanNotifications.forEach(n => {
        console.log(`   - To: ${n.user?.fullName} - "${n.title}" - ${n.createdAt.toLocaleString()}`);
      });
    }

    // 6. Expected vs Actual Flow
    console.log('\n6. EXPECTED SCAN WORKFLOW:');
    console.log('   BO sends bordereau → Status: EN_ATTENTE → A_SCANNER');
    console.log('   SCAN team sees in corbeille → Starts scan → Status: A_SCANNER → SCAN_EN_COURS');  
    console.log('   SCAN team completes → Status: SCAN_EN_COURS → SCANNE');
    console.log('   Auto-assign to Chef → Status: SCANNE → A_AFFECTER');

    console.log('\n7. TESTING RECOMMENDATIONS:');
    if (toScan.length > 0) {
      console.log('   ✅ Test "Commencer" button on a bordereau in SCAN corbeille');
      console.log('   ✅ Verify status changes to SCAN_EN_COURS');
      console.log('   ✅ Test "Terminer" button to complete scan');
      console.log('   ✅ Verify auto-assignment to Chef d\'équipe');
    } else {
      console.log('   ❌ No bordereaux available for testing');
      console.log('   💡 Create test data: node create-fresh-bo-test.js');
    }

  } catch (error) {
    console.error('Error checking SCAN module data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkScanModuleData();