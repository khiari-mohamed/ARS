const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeAlertTypes() {
  const userId = '37b1d219-2b45-43e4-b5f5-a6af76abbab1';
  
  console.log(`\n🔍 Analyzing Alert Types for user ${userId}\n`);
  
  // Fetch filtered alerts (same as backend)
  const alerts = await prisma.alertLog.findMany({
    where: { resolved: false },
    include: {
      bordereau: {
        include: {
          contract: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  // Filter by team
  const filteredAlerts = alerts.filter(a => 
    a.bordereau && a.bordereau.contract?.teamLeaderId === userId
  );
  
  console.log(`📊 Total filtered alerts: ${filteredAlerts.length}`);
  
  // Group by alertType
  const byType = {};
  filteredAlerts.forEach(a => {
    byType[a.alertType] = (byType[a.alertType] || 0) + 1;
  });
  
  console.log(`\n📋 Alerts by Type:`);
  Object.entries(byType).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
  
  // Group by alertLevel
  const byLevel = {};
  filteredAlerts.forEach(a => {
    byLevel[a.alertLevel] = (byLevel[a.alertLevel] || 0) + 1;
  });
  
  console.log(`\n📋 Alerts by Level:`);
  Object.entries(byLevel).sort((a, b) => b[1] - a[1]).forEach(([level, count]) => {
    console.log(`  ${level}: ${count}`);
  });
  
  // Check for duplicates by bordereauId
  const byBordereau = {};
  filteredAlerts.forEach(a => {
    const ref = a.bordereau?.reference || 'NO_REF';
    byBordereau[ref] = (byBordereau[ref] || 0) + 1;
  });
  
  const duplicates = Object.entries(byBordereau).filter(([ref, count]) => count > 1);
  console.log(`\n📋 Duplicate alerts (same bordereau):`);
  console.log(`  Total bordereaux with duplicates: ${duplicates.length}`);
  console.log(`  Total duplicate alerts: ${duplicates.reduce((sum, [ref, count]) => sum + count, 0)}`);
  
  if (duplicates.length > 0) {
    console.log(`\n  Top 10 duplicates:`);
    duplicates.sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([ref, count]) => {
      console.log(`    ${ref}: ${count} alerts`);
    });
  }
  
  // Calculate expected count if we remove duplicates (keep only 1 per bordereau)
  const uniqueBordereaux = Object.keys(byBordereau).length;
  console.log(`\n🎯 Unique bordereaux: ${uniqueBordereaux}`);
  console.log(`📊 Expected if removing duplicates: ${uniqueBordereaux}`);
  console.log(`📊 Actual: ${filteredAlerts.length}`);
  console.log(`📊 Difference: ${filteredAlerts.length - uniqueBordereaux} duplicate alerts`);
  
  await prisma.$disconnect();
}

analyzeAlertTypes().catch(console.error);
