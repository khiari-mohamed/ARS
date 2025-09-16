const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabaseData() {
  console.log('🔍 CHECKING DATABASE DATA FOR SUPER ADMIN MODULE\n');
  console.log('='.repeat(60));

  try {
    // 1. Check Users (for team workload)
    console.log('\n📊 USERS TABLE:');
    const users = await prisma.user.findMany();
    console.log(`Total users: ${users.length}`);
    if (users.length > 0) {
      const roleStats = users.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {});
      console.log('Role distribution:', roleStats);
      console.log('Sample users:', users.slice(0, 3).map(u => `${u.fullName} (${u.role})`));
    }

    // 2. Check Bordereaux (main data for queues)
    console.log('\n📋 BORDEREAU TABLE:');
    const bordereaux = await prisma.bordereau.findMany();
    console.log(`Total bordereaux: ${bordereaux.length}`);
    
    if (bordereaux.length > 0) {
      const statusStats = bordereaux.reduce((acc, b) => {
        acc[b.statut] = (acc[b.statut] || 0) + 1;
        return acc;
      }, {});
      console.log('Status distribution (Queue Data):', statusStats);
      console.log('Sample bordereaux:', bordereaux.slice(0, 3).map(b => `${b.reference} (${b.statut})`));
    }

    // 3. Check BulletinSoin (for workload calculation)
    console.log('\n🏥 BULLETIN_SOIN TABLE:');
    const bulletinSoins = await prisma.bulletinSoin.findMany();
    console.log(`Total bulletin soins: ${bulletinSoins.length}`);
    
    if (bulletinSoins.length > 0) {
      const stateStats = bulletinSoins.reduce((acc, bs) => {
        acc[bs.etat] = (acc[bs.etat] || 0) + 1;
        return acc;
      }, {});
      console.log('State distribution:', stateStats);
    }

    // 4. Check Documents
    console.log('\n📄 DOCUMENT TABLE:');
    const documents = await prisma.document.findMany();
    console.log(`Total documents: ${documents.length}`);

    // 5. Check AuditLog (for performance metrics)
    console.log('\n📝 AUDIT_LOG TABLE:');
    const auditLogs = await prisma.auditLog.findMany({ take: 10 });
    console.log(`Total audit logs: ${auditLogs.length}`);

    // 6. Check AlertLog (for alerts)
    console.log('\n🚨 ALERT_LOG TABLE:');
    const alertLogs = await prisma.alertLog.findMany();
    console.log(`Total alert logs: ${alertLogs.length}`);

    // 7. Check Clients
    console.log('\n🏢 CLIENT TABLE:');
    const clients = await prisma.client.findMany();
    console.log(`Total clients: ${clients.length}`);

    console.log('\n' + '='.repeat(60));
    console.log('🎯 QUEUE ANALYSIS:');
    console.log('='.repeat(60));
    
    // Calculate actual queue data
    const queueData = {
      BO_ENTRY_QUEUE: {
        pending: bordereaux.filter(b => ['EN_ATTENTE', 'A_SCANNER'].includes(b.statut)).length,
        processing: bordereaux.filter(b => b.statut === 'SCAN_EN_COURS').length,
        completed: bordereaux.filter(b => b.statut === 'SCANNE').length,
        failed: bordereaux.filter(b => b.statut === 'EN_DIFFICULTE').length
      },
      SCAN_QUEUE: {
        pending: bordereaux.filter(b => b.statut === 'A_SCANNER').length,
        processing: bordereaux.filter(b => b.statut === 'SCAN_EN_COURS').length,
        completed: bordereaux.filter(b => b.statut === 'SCANNE').length,
        failed: bordereaux.filter(b => b.statut === 'EN_DIFFICULTE').length
      },
      PROCESSING_QUEUE: {
        pending: bordereaux.filter(b => b.statut === 'ASSIGNE').length,
        processing: bordereaux.filter(b => b.statut === 'EN_COURS').length,
        completed: bordereaux.filter(b => b.statut === 'TRAITE').length,
        failed: bordereaux.filter(b => b.statut === 'REJETE').length
      },
      VALIDATION_QUEUE: {
        pending: bordereaux.filter(b => b.statut === 'TRAITE').length,
        processing: bordereaux.filter(b => b.statut === 'EN_COURS').length,
        completed: bordereaux.filter(b => b.statut === 'CLOTURE').length,
        failed: bordereaux.filter(b => b.statut === 'REJETE').length
      }
    };

    console.log('\n📊 ACTUAL QUEUE DATA:');
    Object.entries(queueData).forEach(([queueName, stats]) => {
      console.log(`${queueName}: Pending=${stats.pending}, Processing=${stats.processing}, Completed=${stats.completed}, Failed=${stats.failed}`);
    });

    console.log('\n🔍 DIAGNOSIS:');
    if (bordereaux.length === 0) {
      console.log('❌ NO BORDEREAUX DATA - This is why all queue numbers are 0');
      console.log('💡 SOLUTION: Database needs sample bordereaux with different statuses');
    }
    if (users.length === 0) {
      console.log('❌ NO USER DATA - Team workload will be empty');
    }
    if (bulletinSoins.length === 0) {
      console.log('❌ NO BULLETIN_SOIN DATA - Workload calculations will be 0');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseData();