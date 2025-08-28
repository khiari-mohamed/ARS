const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAlerts() {
  try {
    console.log('🔍 Checking Alert Database Status...\n');

    // Count total alerts
    const totalAlerts = await prisma.alertLog.count();
    console.log(`📊 Total Alerts in Database: ${totalAlerts}`);

    // Count by alert level
    const alertsByLevel = await prisma.alertLog.groupBy({
      by: ['alertLevel'],
      _count: { id: true }
    });

    console.log('\n📈 Alerts by Level:');
    alertsByLevel.forEach(level => {
      console.log(`  ${level.alertLevel}: ${level._count.id}`);
    });

    // Count resolved vs unresolved
    const resolvedCount = await prisma.alertLog.count({ where: { resolved: true } });
    const unresolvedCount = await prisma.alertLog.count({ where: { resolved: false } });
    
    console.log('\n✅ Resolution Status:');
    console.log(`  Resolved: ${resolvedCount}`);
    console.log(`  Unresolved: ${unresolvedCount}`);

    // Recent alerts (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentAlerts = await prisma.alertLog.count({
      where: { createdAt: { gte: yesterday } }
    });
    console.log(`\n🕐 Recent Alerts (24h): ${recentAlerts}`);

    // Alert types
    const alertsByType = await prisma.alertLog.groupBy({
      by: ['alertType'],
      _count: { id: true }
    });

    console.log('\n🏷️ Alerts by Type:');
    alertsByType.forEach(type => {
      console.log(`  ${type.alertType}: ${type._count.id}`);
    });

    // Check if data is static or dynamic
    console.log('\n🔄 Dynamic Data Check:');
    
    // Get latest alert
    const latestAlert = await prisma.alertLog.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    
    if (latestAlert) {
      const timeDiff = Date.now() - new Date(latestAlert.createdAt).getTime();
      const hoursDiff = Math.floor(timeDiff / (1000 * 60 * 60));
      console.log(`  Latest Alert: ${hoursDiff} hours ago`);
      console.log(`  Alert Level: ${latestAlert.alertLevel}`);
      console.log(`  Alert Type: ${latestAlert.alertType}`);
    }

    // Check bordereaux that could generate alerts
    const bordereauxCount = await prisma.bordereau.count();
    const openBordereaux = await prisma.bordereau.count({
      where: { statut: { notIn: ['CLOTURE'] } }
    });
    
    console.log('\n📋 Bordereau Status:');
    console.log(`  Total Bordereaux: ${bordereauxCount}`);
    console.log(`  Open Bordereaux: ${openBordereaux}`);

    // Check if alerts are being generated dynamically
    const alertsLast7Days = await prisma.alertLog.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      _count: { id: true }
    });

    console.log('\n📅 Alert Generation Pattern (Last 7 Days):');
    const dailyCounts = {};
    alertsLast7Days.forEach(alert => {
      const date = new Date(alert.createdAt).toDateString();
      dailyCounts[date] = (dailyCounts[date] || 0) + alert._count.id;
    });

    Object.entries(dailyCounts).forEach(([date, count]) => {
      console.log(`  ${date}: ${count} alerts`);
    });

    // Verify data freshness
    const veryRecentAlerts = await prisma.alertLog.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
        }
      }
    });

    console.log('\n🆕 Data Freshness:');
    console.log(`  Alerts in last hour: ${veryRecentAlerts}`);
    
    if (veryRecentAlerts > 0) {
      console.log('  ✅ Data appears to be DYNAMIC');
    } else if (recentAlerts > 0) {
      console.log('  ⚠️ Data is somewhat fresh but may be STATIC');
    } else {
      console.log('  ❌ Data appears to be STATIC or OLD');
    }

    console.log('\n🎯 Summary:');
    console.log(`  - Total alerts: ${totalAlerts}`);
    console.log(`  - Critical alerts: ${alertsByLevel.find(a => a.alertLevel === 'red')?._count.id || 0}`);
    console.log(`  - Data freshness: ${veryRecentAlerts > 0 ? 'DYNAMIC' : 'STATIC'}`);

  } catch (error) {
    console.error('❌ Error checking alerts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAlerts();