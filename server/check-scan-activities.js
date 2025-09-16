const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkScanActivities() {
  try {
    console.log('=== SCAN ACTIVITIES CHECK ===\n');

    // Check all audit logs from last 24 hours
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const allAuditLogs = await prisma.auditLog.findMany({
      where: {
        timestamp: { gte: last24Hours }
      },
      orderBy: { timestamp: 'desc' },
      take: 20
    });

    console.log(`1. ALL AUDIT LOGS (last 24h): ${allAuditLogs.length} entries`);
    allAuditLogs.forEach(log => {
      console.log(`   - ${log.action} at ${log.timestamp.toLocaleString()}`);
    });

    // Check specifically for SCAN actions
    const scanActions = await prisma.auditLog.findMany({
      where: {
        action: { contains: 'SCAN' },
        timestamp: { gte: last24Hours }
      },
      orderBy: { timestamp: 'desc' }
    });

    console.log(`\n2. SCAN-RELATED ACTIONS: ${scanActions.length} entries`);
    scanActions.forEach(log => {
      console.log(`   - ${log.action} at ${log.timestamp.toLocaleString()} by ${log.userId}`);
    });

    // Check what the chart query is looking for
    const chartActions = await prisma.auditLog.findMany({
      where: {
        action: { in: ['SCAN_STARTED', 'SCAN_COMPLETED', 'OCR_COMPLETED'] },
        timestamp: { gte: last24Hours }
      },
      orderBy: { timestamp: 'desc' }
    });

    console.log(`\n3. CHART QUERY RESULTS: ${chartActions.length} entries`);
    chartActions.forEach(log => {
      console.log(`   - ${log.action} at ${log.timestamp.toLocaleString()}`);
    });

    // Test the chart data generation
    const hourlyData = new Map();
    
    // Initialize all 24 hours with 0
    for (let i = 0; i < 24; i++) {
      const hour = new Date(Date.now() - (23 - i) * 60 * 60 * 1000);
      const hourKey = hour.toISOString().substring(0, 13) + ':00:00.000Z';
      hourlyData.set(hourKey, 0);
    }
    
    // Count activities per hour
    chartActions.forEach(activity => {
      const hourKey = activity.timestamp.toISOString().substring(0, 13) + ':00:00.000Z';
      const currentCount = hourlyData.get(hourKey) || 0;
      hourlyData.set(hourKey, currentCount + 1);
    });
    
    console.log(`\n4. CHART DATA GENERATION:`);
    const chartData = Array.from(hourlyData.entries()).map(([timestamp, count]) => ({
      timestamp,
      count,
      hour: new Date(timestamp).getHours()
    }));
    
    const totalActivities = chartData.reduce((sum, item) => sum + item.count, 0);
    console.log(`   Total activities in chart: ${totalActivities}`);
    
    if (totalActivities > 0) {
      console.log(`   Activities by hour:`);
      chartData.filter(d => d.count > 0).forEach(d => {
        console.log(`   - Hour ${d.hour}: ${d.count} activities`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkScanActivities();