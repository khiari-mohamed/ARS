const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugAlertHistory() {
  const userId = '37b1d219-2b45-43e4-b5f5-a6af76abbab1';
  const userRole = 'CHEF_EQUIPE';
  
  console.log(`\n🔍 Debugging Alert History for user ${userId} (${userRole})\n`);
  
  // Fetch ALL alerts with resolved: false
  const allAlerts = await prisma.alertLog.findMany({
    where: { resolved: false },
    include: {
      bordereau: {
        include: {
          contract: true,
          client: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log(`📊 Total alerts with resolved: false: ${allAlerts.length}`);
  
  // Filter step by step
  let step1 = allAlerts.filter(a => a.bordereau !== null);
  console.log(`✅ Step 1 - Alerts WITH bordereau: ${step1.length}`);
  console.log(`❌ Filtered OUT (no bordereau): ${allAlerts.length - step1.length}`);
  
  let step2 = step1.filter(a => a.bordereau.contract?.teamLeaderId === userId);
  console.log(`✅ Step 2 - Alerts with correct team: ${step2.length}`);
  console.log(`❌ Filtered OUT (wrong team): ${step1.length - step2.length}`);
  
  console.log(`\n🎯 Final count: ${step2.length}`);
  console.log(`📊 Expected: 65`);
  console.log(`📊 Backend returns: 147`);
  console.log(`📊 Difference: ${147 - step2.length}`);
  
  // Show sample of what's being filtered
  console.log(`\n📋 Sample of filtered alerts (first 5):`);
  step2.slice(0, 5).forEach(a => {
    console.log(`  - ${a.bordereau.reference} | ${a.alertType} | ${a.alertLevel} | ${a.message.substring(0, 50)}...`);
  });
  
  await prisma.$disconnect();
}

debugAlertHistory().catch(console.error);
