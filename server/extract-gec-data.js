const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function extractGECData() {
  console.log('=== GEC MODULE DATA EXTRACTION ===\n');

  try {
    // 1. DASHBOARD TAB DATA
    console.log('📊 1. DASHBOARD TAB DATA:');
    
    const [totalCourriers, sentCourriers, pendingCourriers, draftCourriers, slaBreaches, typeDistribution, volumeData] = await Promise.all([
      prisma.courrier.count(),
      prisma.courrier.count({ where: { status: 'SENT' } }),
      prisma.courrier.count({ where: { status: 'PENDING_RESPONSE' } }),
      prisma.courrier.count({ where: { status: 'DRAFT' } }),
      // SLA breaches (courriers older than 3 days without response)
      prisma.courrier.findMany({
        where: {
          status: { in: ['SENT', 'PENDING_RESPONSE'] },
          sentAt: { lte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
        },
        include: {
          uploader: { select: { fullName: true } },
          bordereau: { include: { client: { select: { name: true } } } }
        }
      }),
      prisma.courrier.groupBy({
        by: ['type'],
        _count: { id: true }
      }),
      // Volume data for last 7 days
      prisma.courrier.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        },
        select: { createdAt: true, status: true }
      })
    ]);

    const slaCompliance = totalCourriers > 0 ? Math.round(((totalCourriers - slaBreaches.length) / totalCourriers) * 100) : 100;

    console.log(`   📈 KPIs:`);
    console.log(`   - Total Courriers: ${totalCourriers}`);
    console.log(`   - Courriers Envoyés: ${sentCourriers}`);
    console.log(`   - En Attente Réponse: ${pendingCourriers}`);
    console.log(`   - Brouillons: ${draftCourriers}`);
    console.log(`   - SLA Compliance: ${slaCompliance}%`);
    console.log(`   - Éléments Urgents: ${slaBreaches.length}`);

    console.log(`\n   📋 Distribution par Type:`);
    typeDistribution.forEach(type => {
      console.log(`   - ${type.type}: ${type._count.id}`);
    });

    console.log(`\n   🚨 SLA Breaches (${slaBreaches.length}):`);
    slaBreaches.slice(0, 5).forEach(breach => {
      const daysOverdue = Math.floor((Date.now() - new Date(breach.sentAt || breach.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      console.log(`   - ${breach.subject} (${breach.type}) - ${daysOverdue} jours de retard`);
    });

    // 2. CREATE CORRESPONDENCE TAB DATA
    console.log('\n📝 2. CREATE CORRESPONDENCE TAB DATA:');
    
    const [templates, clients, recentCourriers] = await Promise.all([
      prisma.template.findMany({ select: { id: true, name: true, subject: true } }),
      prisma.client.findMany({ 
        select: { id: true, name: true, email: true }
      }),
      prisma.courrier.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { uploader: { select: { fullName: true } } }
      })
    ]);

    console.log(`   📄 Available Templates: ${templates.length}`);
    templates.slice(0, 5).forEach(template => {
      console.log(`   - ${template.name} (${template.id})`);
    });

    console.log(`\n   👥 Available Clients: ${clients.length}`);
    clients.slice(0, 5).forEach(client => {
      console.log(`   - ${client.name} (${client.email || 'No email'})`);
    });

    console.log(`\n   📨 Recent Created Courriers: ${recentCourriers.length}`);
    recentCourriers.forEach(courrier => {
      console.log(`   - ${courrier.subject} (${courrier.type}) - ${courrier.uploader?.fullName}`);
    });

    // 3. INBOX TAB DATA
    console.log('\n📥 3. INBOX TAB DATA:');
    
    const [inboxCourriers, statusDistribution] = await Promise.all([
      prisma.courrier.findMany({
        where: {
          status: { in: ['SENT', 'PENDING_RESPONSE', 'RESPONDED'] }
        },
        include: {
          uploader: { select: { fullName: true, email: true } },
          bordereau: { include: { client: { select: { name: true } } } }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      }),
      prisma.courrier.groupBy({
        by: ['status'],
        _count: { id: true },
        where: {
          status: { in: ['SENT', 'PENDING_RESPONSE', 'RESPONDED'] }
        }
      })
    ]);

    console.log(`   📊 Inbox Status Distribution:`);
    statusDistribution.forEach(status => {
      console.log(`   - ${status.status}: ${status._count.id} courriers`);
    });

    console.log(`\n   📋 Sample Inbox Items (${inboxCourriers.length}):`);
    inboxCourriers.slice(0, 5).forEach(courrier => {
      const daysOld = Math.floor((Date.now() - new Date(courrier.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      const slaStatus = daysOld <= 2 ? '🟢' : daysOld <= 5 ? '🟠' : '🔴';
      console.log(`   - ${courrier.subject} | ${courrier.type} | ${courrier.status} | ${slaStatus}`);
    });

    // 4. OUTBOX TAB DATA
    console.log('\n📤 4. OUTBOX TAB DATA:');
    
    const [outboxCourriers, sendingStats] = await Promise.all([
      prisma.courrier.findMany({
        where: {
          status: { in: ['DRAFT', 'SENT', 'FAILED'] }
        },
        include: {
          uploader: { select: { fullName: true } },
          bordereau: { include: { client: { select: { name: true } } } }
        },
        orderBy: { updatedAt: 'desc' },
        take: 15
      }),
      prisma.courrier.groupBy({
        by: ['status'],
        _count: { id: true },
        where: {
          status: { in: ['DRAFT', 'SENT', 'FAILED'] }
        }
      })
    ]);

    console.log(`   📊 Outbox Status Distribution:`);
    sendingStats.forEach(status => {
      console.log(`   - ${status.status}: ${status._count.id} courriers`);
    });

    console.log(`\n   📋 Sample Outbox Items (${outboxCourriers.length}):`);
    outboxCourriers.slice(0, 5).forEach(courrier => {
      const statusIcon = courrier.status === 'SENT' ? '✅' : courrier.status === 'FAILED' ? '❌' : '📝';
      console.log(`   - ${courrier.subject} | ${courrier.type} | ${courrier.status} | ${statusIcon}`);
    });

    // 5. RELANCE MANAGER TAB DATA
    console.log('\n🔄 5. RELANCE MANAGER TAB DATA:');
    
    const [relanceCourriers, overdueItems, relanceStats] = await Promise.all([
      prisma.courrier.findMany({
        where: { type: 'RELANCE' },
        include: {
          uploader: { select: { fullName: true } },
          bordereau: { include: { client: { select: { name: true } } } }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      prisma.courrier.findMany({
        where: {
          status: { in: ['SENT', 'PENDING_RESPONSE'] },
          sentAt: { lte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
        },
        include: {
          bordereau: { include: { client: { select: { name: true } } } }
        }
      }),
      prisma.courrier.count({ where: { type: 'RELANCE' } })
    ]);

    console.log(`   📊 Relance Statistics:`);
    console.log(`   - Total Relances: ${relanceStats}`);
    console.log(`   - Items Requiring Relance: ${overdueItems.length}`);

    console.log(`\n   📋 Recent Relances (${relanceCourriers.length}):`);
    relanceCourriers.slice(0, 5).forEach(relance => {
      console.log(`   - ${relance.subject} | Client: ${relance.bordereau?.client?.name || 'N/A'} | ${relance.status}`);
    });

    console.log(`\n   ⚠️ Items Needing Relance (${overdueItems.length}):`);
    overdueItems.slice(0, 5).forEach(item => {
      const daysOverdue = Math.floor((Date.now() - new Date(item.sentAt || item.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      console.log(`   - ${item.subject} | ${daysOverdue} jours de retard | Client: ${item.bordereau?.client?.name || 'N/A'}`);
    });

    // 6. OUTLOOK INTEGRATION TAB DATA
    console.log('\n🔗 6. OUTLOOK INTEGRATION TAB DATA:');
    
    const [outlookLogs, integrationStats] = await Promise.all([
      prisma.auditLog.findMany({
        where: {
          action: { in: ['EMAIL_SENT_OUTLOOK', 'OUTLOOK_TOKEN_STORED', 'CONTACT_SYNCED'] }
        },
        take: 10,
        orderBy: { timestamp: 'desc' }
      }),
      prisma.auditLog.groupBy({
        by: ['action'],
        _count: { id: true },
        where: {
          action: { in: ['EMAIL_SENT_OUTLOOK', 'CONTACT_SYNCED', 'CALENDAR_EVENT_CREATED'] }
        }
      })
    ]);

    console.log(`   📊 Integration Statistics:`);
    integrationStats.forEach(stat => {
      console.log(`   - ${stat.action}: ${stat._count.id} events`);
    });

    console.log(`\n   📋 Recent Integration Activities (${outlookLogs.length}):`);
    outlookLogs.slice(0, 5).forEach(log => {
      console.log(`   - ${log.action} | ${new Date(log.timestamp).toLocaleDateString()} | User: ${log.userId}`);
    });

    // 7. MAIL TRACKING TAB DATA
    console.log('\n📈 7. MAIL TRACKING TAB DATA:');
    
    const [trackingLogs, emailStats, recentEmails] = await Promise.all([
      prisma.auditLog.findMany({
        where: {
          action: { in: ['MAIL_TRACKING_EVENT', 'DELIVERY_STATUS_UPDATED', 'READ_RECEIPT_STORED'] }
        },
        take: 10,
        orderBy: { timestamp: 'desc' }
      }),
      prisma.courrier.findMany({
        where: {
          status: 'SENT',
          sentAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        },
        select: { id: true, sentAt: true, status: true }
      }),
      prisma.courrier.findMany({
        where: { status: 'SENT' },
        take: 10,
        orderBy: { sentAt: 'desc' },
        include: { uploader: { select: { email: true } } }
      })
    ]);

    const deliveryRate = emailStats.length > 0 ? Math.round((emailStats.filter(e => e.status === 'SENT').length / emailStats.length) * 100) : 0;

    console.log(`   📊 Email Tracking Statistics:`);
    console.log(`   - Emails Sent (7d): ${emailStats.length}`);
    console.log(`   - Delivery Rate: ${deliveryRate}%`);
    console.log(`   - Tracking Events: ${trackingLogs.length}`);

    console.log(`\n   📋 Recent Tracked Emails (${recentEmails.length}):`);
    recentEmails.slice(0, 5).forEach(email => {
      console.log(`   - ${email.subject} | Sent: ${email.sentAt ? new Date(email.sentAt).toLocaleDateString() : 'N/A'}`);
    });

    // 8. TEMPLATE MANAGER TAB DATA
    console.log('\n📄 8. TEMPLATE MANAGER TAB DATA:');
    
    const [allTemplates, gecTemplates] = await Promise.all([
      prisma.template.findMany({
        orderBy: { createdAt: 'desc' }
      }),
      prisma.gecTemplate.findMany({
        where: { isActive: true },
        include: { createdBy: { select: { fullName: true } } },
        orderBy: { updatedAt: 'desc' }
      })
    ]);
    
    // Get template usage separately
    const templateUsage = await prisma.courrier.findMany({
      where: { 
        templateUsed: { 
          not: null 
        }
      },
      select: { templateUsed: true }
    });
    
    const templateUsageCount = templateUsage.reduce((acc, curr) => {
      acc[curr.templateUsed] = (acc[curr.templateUsed] || 0) + 1;
      return acc;
    }, {});

    console.log(`   📊 Template Statistics:`);
    console.log(`   - Standard Templates: ${allTemplates.length}`);
    console.log(`   - GEC Templates: ${gecTemplates.length}`);
    console.log(`   - Templates in Use: ${Object.keys(templateUsageCount).length}`);

    console.log(`\n   📋 Available Templates:`);
    allTemplates.slice(0, 5).forEach(template => {
      console.log(`   - ${template.name} | Variables: ${template.variables?.length || 0}`);
    });

    console.log(`\n   📋 GEC Templates:`);
    gecTemplates.slice(0, 5).forEach(template => {
      console.log(`   - ${template.name} | ${template.type} | Created by: ${template.createdBy?.fullName || 'System'}`);
    });

    // 9. AI INSIGHTS TAB DATA
    console.log('\n🤖 9. AI INSIGHTS TAB DATA:');
    
    const [recentCourriersForAI, aiLogs, sentimentData] = await Promise.all([
      prisma.courrier.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          body: { not: null }
        },
        include: {
          bordereau: { include: { client: { select: { name: true } } } }
        },
        take: 50
      }),
      prisma.auditLog.findMany({
        where: {
          action: { contains: 'AI' }
        },
        take: 5,
        orderBy: { timestamp: 'desc' }
      }),
      prisma.courrier.findMany({
        where: { status: 'RESPONDED' },
        take: 20
      })
    ]);

    console.log(`   📊 AI Analysis Data:`);
    console.log(`   - Courriers for Analysis: ${recentCourriersForAI.length}`);
    console.log(`   - AI Service Calls: ${aiLogs.length}`);
    console.log(`   - Response Data: ${sentimentData.length}`);

    console.log(`\n   📋 Recent AI Activities:`);
    aiLogs.forEach(log => {
      console.log(`   - ${log.action} | ${new Date(log.timestamp).toLocaleDateString()}`);
    });

    // 10. SEARCH & ARCHIVE TAB DATA
    console.log('\n🔍 10. SEARCH & ARCHIVE TAB DATA:');
    
    const [searchableCourriers, archiveStats, searchLogs] = await Promise.all([
      prisma.courrier.findMany({
        select: {
          id: true,
          subject: true,
          type: true,
          status: true,
          createdAt: true
        },
        take: 100
      }),
      prisma.courrier.groupBy({
        by: ['status'],
        _count: { id: true }
      }),
      prisma.auditLog.findMany({
        where: {
          action: { contains: 'SEARCH' }
        },
        take: 5,
        orderBy: { timestamp: 'desc' }
      })
    ]);

    const uniqueTypes = [...new Set(searchableCourriers.map(c => c.type))];
    const uniqueStatuses = [...new Set(searchableCourriers.map(c => c.status))];

    console.log(`   📊 Archive Statistics:`);
    console.log(`   - Total Archived: ${searchableCourriers.length}`);
    console.log(`   - Searchable Types: ${uniqueTypes.join(', ')}`);
    console.log(`   - Available Statuses: ${uniqueStatuses.join(', ')}`);

    console.log(`\n   📋 Archive Distribution:`);
    archiveStats.forEach(stat => {
      console.log(`   - ${stat.status}: ${stat._count.id} courriers`);
    });

    // 11. REPORTS TAB DATA
    console.log('\n📈 11. REPORTS TAB DATA:');
    
    const [reportData, clientAnalytics, performanceData] = await Promise.all([
      prisma.courrier.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        },
        include: {
          bordereau: { include: { client: { select: { name: true } } } }
        }
      }),
      prisma.courrier.groupBy({
        by: ['type'],
        _count: { id: true },
        where: {
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      }),
      prisma.courrier.findMany({
        where: {
          status: 'SENT',
          sentAt: { not: null }
        },
        select: {
          createdAt: true,
          sentAt: true,
          type: true
        }
      })
    ]);

    // Calculate analytics
    const clientDistribution = {};
    reportData.forEach(courrier => {
      const clientName = courrier.bordereau?.client?.name || 'Unknown';
      clientDistribution[clientName] = (clientDistribution[clientName] || 0) + 1;
    });

    console.log(`   📊 Report Period: Last 30 days (${reportData.length} courriers)`);
    console.log(`   👥 Top Clients:`);
    Object.entries(clientDistribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([client, count]) => {
        console.log(`   - ${client}: ${count} courriers`);
      });

    console.log(`\n   📋 Type Distribution:`);
    clientAnalytics.forEach(type => {
      console.log(`   - ${type.type}: ${type._count.id} courriers`);
    });

    console.log(`\n   ⏱️ Performance Metrics:`);
    const avgResponseTime = performanceData.length > 0 
      ? performanceData.reduce((acc, curr) => {
          const responseTime = (new Date(curr.sentAt).getTime() - new Date(curr.createdAt).getTime()) / (1000 * 60 * 60);
          return acc + responseTime;
        }, 0) / performanceData.length
      : 0;
    console.log(`   - Average Response Time: ${avgResponseTime.toFixed(1)} hours`);
    console.log(`   - Total Processed: ${performanceData.length}`);

    // SUMMARY
    console.log('\n🎯 GEC MODULE SUMMARY:');
    console.log(`   📊 Total Courriers: ${totalCourriers}`);
    console.log(`   📤 Sent: ${sentCourriers}`);
    console.log(`   📝 Drafts: ${draftCourriers}`);
    console.log(`   ⏳ Pending Response: ${pendingCourriers}`);
    console.log(`   🚨 SLA Breaches: ${slaBreaches.length}`);
    console.log(`   📄 Templates Available: ${allTemplates.length + gecTemplates.length}`);
    console.log(`   👥 Active Clients: ${clients.length}`);
    console.log(`   🔄 Relances: ${relanceStats}`);
    console.log(`   📈 SLA Compliance: ${slaCompliance}%`);

  } catch (error) {
    console.error('Error extracting GEC data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

extractGECData();