const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function extractGEDData() {
  console.log('=== GED MODULE DATA EXTRACTION ===\n');

  try {
    // 1. DASHBOARD TAB DATA
    console.log('📊 1. DASHBOARD TAB DATA:');
    
    const [totalDocs, docsByType, docsByStatus, recentDocs, slaData] = await Promise.all([
      prisma.document.count(),
      prisma.document.groupBy({
        by: ['type'],
        _count: { id: true }
      }),
      prisma.document.groupBy({
        by: ['status'],
        _count: { id: true }
      }),
      prisma.document.findMany({
        take: 10,
        orderBy: { uploadedAt: 'desc' },
        include: {
          uploader: { select: { fullName: true } },
          bordereau: { 
            include: { client: { select: { name: true } } }
          }
        }
      }),
      // SLA Analysis
      prisma.document.findMany({
        select: {
          id: true,
          uploadedAt: true,
          status: true
        }
      })
    ]);

    // Calculate SLA compliance
    const now = new Date();
    const slaThreshold = 48; // hours
    let onTime = 0, atRisk = 0, overdue = 0;
    
    slaData.forEach(doc => {
      const hours = (now - new Date(doc.uploadedAt)) / (1000 * 60 * 60);
      if (doc.status === 'TRAITE') onTime++;
      else if (hours > slaThreshold) overdue++;
      else if (hours > 36) atRisk++;
      else onTime++;
    });

    console.log(`   📈 KPIs:`);
    console.log(`   - Total Documents: ${totalDocs}`);
    console.log(`   - En cours: ${docsByStatus.find(s => s.status === 'EN_COURS')?._count?.id || 0}`);
    console.log(`   - Traités: ${docsByStatus.find(s => s.status === 'TRAITE')?._count?.id || 0}`);
    console.log(`   - SLA Compliance: ${totalDocs > 0 ? ((onTime / totalDocs) * 100).toFixed(1) : 0}%`);
    
    console.log(`\n   📋 Documents by Type:`);
    docsByType.forEach(type => {
      console.log(`   - ${type.type}: ${type._count.id}`);
    });

    console.log(`\n   🕒 Recent Documents (${recentDocs.length}):`);
    recentDocs.slice(0, 5).forEach(doc => {
      console.log(`   - ${doc.name} (${doc.type}) - ${doc.uploader?.fullName} - ${doc.uploadedAt.toLocaleDateString()}`);
    });

    // 2. INGESTION TAB DATA
    console.log('\n📤 2. INGESTION TAB DATA:');
    
    const [clients, gestionnaires, uploadStats] = await Promise.all([
      prisma.client.findMany({
        select: { id: true, name: true }
      }),
      prisma.user.findMany({
        where: { role: 'GESTIONNAIRE', active: true },
        select: { id: true, fullName: true }
      }),
      prisma.document.groupBy({
        by: ['uploadedAt'],
        _count: { id: true },
        where: {
          uploadedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    console.log(`   👥 Available Clients: ${clients.length}`);
    clients.slice(0, 5).forEach(client => {
      console.log(`   - ${client.name} (${client.id})`);
    });

    console.log(`\n   👨‍💼 Available Gestionnaires: ${gestionnaires.length}`);
    gestionnaires.slice(0, 3).forEach(gest => {
      console.log(`   - ${gest.fullName} (${gest.id})`);
    });

    console.log(`\n   📊 Upload Stats (Last 7 days): ${uploadStats.length} upload sessions`);

    // 3. CORBEILLE TAB DATA
    console.log('\n📥 3. CORBEILLE TAB DATA:');
    
    const [corbeilleData, assignmentData] = await Promise.all([
      prisma.document.findMany({
        where: {
          status: { in: ['UPLOADED', 'TRAITE', 'EN_COURS', 'REJETE'] }
        },
        include: {
          uploader: { select: { fullName: true } },
          bordereau: { 
            include: { client: { select: { name: true } } }
          }
        },
        orderBy: { uploadedAt: 'desc' },
        take: 20
      }),
      prisma.document.groupBy({
        by: ['status'],
        _count: { id: true },
        where: {
          status: { in: ['UPLOADED', 'TRAITE', 'EN_COURS', 'REJETE'] }
        }
      })
    ]);

    console.log(`   📊 Corbeille Status Distribution:`);
    assignmentData.forEach(status => {
      console.log(`   - ${status.status}: ${status._count.id} documents`);
    });

    console.log(`\n   📋 Sample Corbeille Documents (${corbeilleData.length}):`);
    corbeilleData.slice(0, 5).forEach(doc => {
      const slaHours = (now - new Date(doc.uploadedAt)) / (1000 * 60 * 60);
      const slaStatus = slaHours > 48 ? '🔴' : slaHours > 36 ? '🟠' : '🟢';
      console.log(`   - ${doc.name} | ${doc.bordereau?.client?.name || 'No Client'} | ${doc.status} | ${slaStatus}`);
    });

    // 4. SEARCH TAB DATA
    console.log('\n🔍 4. SEARCH TAB DATA:');
    
    const [searchableFields, ocrDocs, searchLogs] = await Promise.all([
      prisma.document.findMany({
        select: {
          type: true,
          status: true,
          uploadedAt: true,
          ocrText: true
        },
        take: 100
      }),
      prisma.document.count({
        where: {
          ocrText: { not: null }
        }
      }),
      prisma.auditLog.findMany({
        where: {
          action: { contains: 'SEARCH' }
        },
        take: 10,
        orderBy: { timestamp: 'desc' }
      })
    ]);

    const uniqueTypes = [...new Set(searchableFields.map(d => d.type))];
    const uniqueStatuses = [...new Set(searchableFields.map(d => d.status))];

    console.log(`   🏷️ Searchable Document Types: ${uniqueTypes.join(', ')}`);
    console.log(`   📊 Searchable Statuses: ${uniqueStatuses.join(', ')}`);
    console.log(`   🔤 OCR-enabled Documents: ${ocrDocs}/${totalDocs} (${((ocrDocs/totalDocs)*100).toFixed(1)}%)`);
    console.log(`   📈 Recent Searches: ${searchLogs.length} logged searches`);

    // 5. WORKFLOWS TAB DATA
    console.log('\n⚙️ 5. WORKFLOWS TAB DATA:');
    
    const [workflowLogs, workflowUsers, workflowDocs] = await Promise.all([
      prisma.auditLog.findMany({
        where: {
          action: { in: ['START_WORKFLOW', 'COMPLETE_WORKFLOW_STEP', 'WORKFLOW_COMPLETED'] }
        },
        take: 10,
        orderBy: { timestamp: 'desc' }
      }),
      prisma.user.findMany({
        where: {
          role: { in: ['CHEF_EQUIPE', 'GESTIONNAIRE', 'ADMINISTRATEUR'] },
          active: true
        },
        select: { id: true, fullName: true, role: true }
      }),
      prisma.document.count({
        where: {
          status: 'EN_COURS'
        }
      })
    ]);

    console.log(`   📋 Active Workflow Documents: ${workflowDocs}`);
    console.log(`   👥 Workflow Participants: ${workflowUsers.length}`);
    workflowUsers.slice(0, 5).forEach(user => {
      console.log(`   - ${user.fullName} (${user.role})`);
    });
    console.log(`   📊 Recent Workflow Activities: ${workflowLogs.length}`);

    // 6. INTEGRATIONS TAB DATA
    console.log('\n🔗 6. INTEGRATIONS TAB DATA:');
    
    const [integrationLogs, webhookLogs, apiLogs] = await Promise.all([
      prisma.auditLog.findMany({
        where: {
          action: { in: ['CREATE_CONNECTOR', 'SYNC_CONNECTOR', 'TEST_CONNECTOR'] }
        },
        take: 10,
        orderBy: { timestamp: 'desc' }
      }),
      prisma.auditLog.findMany({
        where: {
          action: { in: ['CREATE_WEBHOOK', 'WEBHOOK_DELIVERED'] }
        },
        take: 10,
        orderBy: { timestamp: 'desc' }
      }),
      prisma.auditLog.findMany({
        where: {
          action: { contains: 'API' }
        },
        take: 5,
        orderBy: { timestamp: 'desc' }
      })
    ]);

    console.log(`   🔌 Integration Activities: ${integrationLogs.length} connector actions`);
    console.log(`   🪝 Webhook Activities: ${webhookLogs.length} webhook events`);
    console.log(`   🔑 API Activities: ${apiLogs.length} API calls`);

    // 7. PAPERSTREAM TAB DATA
    console.log('\n📄 7. PAPERSTREAM TAB DATA:');
    
    const [paperStreamDocs, batchLogs, quarantineLogs] = await Promise.all([
      prisma.document.findMany({
        where: {
          batchId: { not: null }
        },
        include: {
          bordereau: { 
            include: { client: { select: { name: true } } }
          }
        },
        take: 10,
        orderBy: { ingestTimestamp: 'desc' }
      }),
      prisma.auditLog.findMany({
        where: {
          action: { in: ['PAPERSTREAM_BATCH_PROCESSED', 'PAPERSTREAM_BATCH_QUARANTINED'] }
        },
        take: 10,
        orderBy: { timestamp: 'desc' }
      }),
      prisma.auditLog.count({
        where: {
          action: 'PAPERSTREAM_BATCH_QUARANTINED'
        }
      })
    ]);

    console.log(`   📦 PaperStream Documents: ${paperStreamDocs.length} batch-processed docs`);
    paperStreamDocs.slice(0, 5).forEach(doc => {
      console.log(`   - Batch: ${doc.batchId} | ${doc.name} | Op: ${doc.operatorId} | Scanner: ${doc.scannerModel}`);
    });
    console.log(`   📊 Batch Activities: ${batchLogs.length} recent batch operations`);
    console.log(`   ⚠️ Quarantined Batches: ${quarantineLogs} total quarantined`);

    // 8. REPORTS TAB DATA
    console.log('\n📈 8. REPORTS TAB DATA:');
    
    const [reportLogs, analyticsData, exportLogs] = await Promise.all([
      prisma.auditLog.findMany({
        where: {
          action: { in: ['GENERATE_REPORT', 'EXPORT_REPORT'] }
        },
        take: 10,
        orderBy: { timestamp: 'desc' }
      }),
      // Performance metrics
      prisma.document.findMany({
        where: {
          uploadedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        select: {
          uploadedAt: true,
          status: true,
          type: true,
          bordereau: {
            include: { client: { select: { name: true } } }
          }
        }
      }),
      prisma.auditLog.count({
        where: {
          action: 'EXPORT_REPORT'
        }
      })
    ]);

    // Calculate analytics
    const clientAnalytics = {};
    const typeAnalytics = {};
    
    analyticsData.forEach(doc => {
      const clientName = doc.bordereau?.client?.name || 'Unknown';
      const docType = doc.type || 'Unknown';
      
      clientAnalytics[clientName] = (clientAnalytics[clientName] || 0) + 1;
      typeAnalytics[docType] = (typeAnalytics[docType] || 0) + 1;
    });

    console.log(`   📊 Analytics Period: Last 30 days (${analyticsData.length} documents)`);
    console.log(`   👥 Top Clients:`);
    Object.entries(clientAnalytics)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([client, count]) => {
        console.log(`   - ${client}: ${count} documents`);
      });

    console.log(`   📋 Document Types:`);
    Object.entries(typeAnalytics)
      .sort(([,a], [,b]) => b - a)
      .forEach(([type, count]) => {
        console.log(`   - ${type}: ${count} documents`);
      });

    console.log(`   📈 Report Generation: ${reportLogs.length} recent reports`);
    console.log(`   💾 Total Exports: ${exportLogs} exports generated`);

    // SUMMARY
    console.log('\n🎯 GED MODULE SUMMARY:');
    console.log(`   📊 Total Documents: ${totalDocs}`);
    console.log(`   🔄 Active Workflows: ${workflowDocs}`);
    console.log(`   📦 PaperStream Batches: ${paperStreamDocs.length}`);
    console.log(`   🔍 OCR Coverage: ${((ocrDocs/totalDocs)*100).toFixed(1)}%`);
    console.log(`   ⚠️ SLA Compliance: ${totalDocs > 0 ? ((onTime / totalDocs) * 100).toFixed(1) : 0}%`);
    console.log(`   🔗 Integration Events: ${integrationLogs.length + webhookLogs.length}`);

  } catch (error) {
    console.error('Error extracting GED data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

extractGEDData();