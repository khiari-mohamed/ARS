const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkIntegrationData() {
  try {
    console.log('🔍 Checking Integration Tab Data in Database...\n');

    // 1. Check what the Integration Stats endpoint returns
    console.log('📊 INTEGRATION STATS ENDPOINT DATA:');
    console.log('=' .repeat(60));
    
    // This is what getIntegrationStats() returns (hardcoded values)
    const integrationStats = {
      totalSyncs: 15,
      successfulSyncs: 12,
      totalWebhooks: 45,
      successfulWebhooks: 42,
      documentsProcessed: 234,  // ← This is the suspicious number!
      avgSyncTime: 2.5,
      errorRate: 8.2
    };
    
    console.log('Current Integration Stats (HARDCODED in backend):');
    console.log(`  - Total Syncs: ${integrationStats.totalSyncs}`);
    console.log(`  - Successful Syncs: ${integrationStats.successfulSyncs}`);
    console.log(`  - Documents Processed: ${integrationStats.documentsProcessed} ← SUSPICIOUS!`);
    console.log(`  - Total Webhooks: ${integrationStats.totalWebhooks}`);
    console.log(`  - Successful Webhooks: ${integrationStats.successfulWebhooks}`);
    console.log(`  - Avg Sync Time: ${integrationStats.avgSyncTime}s`);
    console.log(`  - Error Rate: ${integrationStats.errorRate}%`);

    // 2. Check actual document count
    console.log('\n📄 ACTUAL DOCUMENT DATA:');
    console.log('=' .repeat(60));
    
    const totalDocs = await prisma.document.count();
    const traiteCount = await prisma.document.count({ where: { status: 'TRAITE' } });
    const enCoursCount = await prisma.document.count({ where: { status: 'EN_COURS' } });
    const uploadedCount = await prisma.document.count({ where: { status: 'UPLOADED' } });
    const nullStatusCount = await prisma.document.count({ where: { status: null } });
    
    console.log(`Real Document Counts:`);
    console.log(`  - Total Documents: ${totalDocs}`);
    console.log(`  - TRAITE: ${traiteCount}`);
    console.log(`  - EN_COURS: ${enCoursCount}`);
    console.log(`  - UPLOADED: ${uploadedCount}`);
    console.log(`  - NULL Status: ${nullStatusCount}`);

    // 3. Check Integration-related audit logs
    console.log('\n🔗 INTEGRATION AUDIT LOGS:');
    console.log('=' .repeat(60));
    
    const integrationActions = [
      'CREATE_CONNECTOR', 'DELETE_CONNECTOR', 'UPDATE_CONNECTOR', 
      'TEST_CONNECTOR', 'SYNC_CONNECTOR',
      'CREATE_WEBHOOK', 'DELETE_WEBHOOK'
    ];
    
    for (const action of integrationActions) {
      const count = await prisma.auditLog.count({
        where: { action }
      });
      console.log(`  - ${action}: ${count} logs`);
    }

    // 4. Check for any sync-related data
    console.log('\n🔄 SYNC ACTIVITY ANALYSIS:');
    console.log('=' .repeat(60));
    
    const syncLogs = await prisma.auditLog.findMany({
      where: {
        action: { in: ['SYNC_CONNECTOR', 'TEST_CONNECTOR'] }
      },
      orderBy: { timestamp: 'desc' },
      take: 10
    });
    
    console.log(`Recent Sync Activities: ${syncLogs.length}`);
    syncLogs.forEach((log, index) => {
      console.log(`  ${index + 1}. ${log.action} - ${log.timestamp.toISOString()}`);
      if (log.details) {
        console.log(`     Details: ${JSON.stringify(log.details)}`);
      }
    });

    // 5. Check connectors data
    console.log('\n🔌 CONNECTORS DATA:');
    console.log('=' .repeat(60));
    
    const connectorLogs = await prisma.auditLog.findMany({
      where: { action: 'CREATE_CONNECTOR' },
      orderBy: { timestamp: 'desc' }
    });
    
    const deletedConnectors = await prisma.auditLog.findMany({
      where: { action: 'DELETE_CONNECTOR' },
      orderBy: { timestamp: 'desc' }
    });
    
    const deletedIds = deletedConnectors.map(log => log.details?.['connectorId']).filter(Boolean);
    const activeConnectors = connectorLogs.filter(log => !deletedIds.includes(log.id));
    
    console.log(`Total Connector Creation Logs: ${connectorLogs.length}`);
    console.log(`Deleted Connectors: ${deletedConnectors.length}`);
    console.log(`Active Connectors: ${activeConnectors.length}`);
    
    if (activeConnectors.length > 0) {
      console.log('\nActive Connectors:');
      activeConnectors.forEach((log, index) => {
        console.log(`  ${index + 1}. ${log.details?.['name'] || 'Unknown'} (${log.details?.['type'] || 'unknown'})`);
        console.log(`     Created: ${log.timestamp.toISOString()}`);
      });
    }

    // 6. Check webhooks data
    console.log('\n🪝 WEBHOOKS DATA:');
    console.log('=' .repeat(60));
    
    const webhookLogs = await prisma.auditLog.findMany({
      where: { action: 'CREATE_WEBHOOK' },
      orderBy: { timestamp: 'desc' }
    });
    
    const deletedWebhooks = await prisma.auditLog.findMany({
      where: { action: 'DELETE_WEBHOOK' },
      orderBy: { timestamp: 'desc' }
    });
    
    const deletedWebhookIds = deletedWebhooks.map(log => log.details?.['webhookId']).filter(Boolean);
    const activeWebhooks = webhookLogs.filter(log => !deletedWebhookIds.includes(log.id));
    
    console.log(`Total Webhook Creation Logs: ${webhookLogs.length}`);
    console.log(`Deleted Webhooks: ${deletedWebhooks.length}`);
    console.log(`Active Webhooks: ${activeWebhooks.length}`);

    // 7. Analysis and Recommendations
    console.log('\n💡 ANALYSIS & RECOMMENDATIONS:');
    console.log('=' .repeat(60));
    
    console.log('🚨 DISCREPANCIES FOUND:');
    console.log(`  - Dashboard shows: ${totalDocs} total documents`);
    console.log(`  - Integration tab shows: ${integrationStats.documentsProcessed} documents processed`);
    console.log(`  - Difference: ${Math.abs(totalDocs - integrationStats.documentsProcessed)} documents`);
    
    if (integrationStats.documentsProcessed > totalDocs) {
      console.log('  ❌ Integration tab shows MORE documents than actually exist!');
      console.log('  🔧 ISSUE: Integration stats are HARDCODED in backend');
    }
    
    console.log('\n📋 BACKEND METHODS TO CHECK:');
    console.log('  - getIntegrationStats() in ged.service.ts (HARDCODED VALUES)');
    console.log('  - getIntegrationConnectors() in ged.service.ts');
    console.log('  - getWebhookSubscriptions() in ged.service.ts');
    
    console.log('\n🔧 RECOMMENDED FIXES:');
    console.log('  1. Replace hardcoded values in getIntegrationStats()');
    console.log('  2. Use real document counts from database');
    console.log('  3. Calculate real sync statistics from audit logs');
    console.log('  4. Use real connector/webhook counts');
    
    console.log('\n✅ WHAT SHOULD BE REAL DATA:');
    console.log(`  - Documents Processed: ${traiteCount} (TRAITE documents)`);
    console.log(`  - Total Syncs: ${syncLogs.length} (from audit logs)`);
    console.log(`  - Active Connectors: ${activeConnectors.length}`);
    console.log(`  - Active Webhooks: ${activeWebhooks.length}`);

  } catch (error) {
    console.error('❌ Error checking integration data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkIntegrationData();