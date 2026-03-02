const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkResolvedAlerts() {
  const userId = '37b1d219-2b45-43e4-b5f5-a6af76abbab1';
  const userRole = 'CHEF_EQUIPE';
  
  console.log(`\n🔍 Checking Resolved Alerts for ${userRole}\n`);
  
  // Check total resolved alerts
  const totalResolved = await prisma.alertLog.count({
    where: { resolved: true }
  });
  
  console.log(`📊 Total resolved alerts in database: ${totalResolved}`);
  
  // Check total unresolved alerts
  const totalUnresolved = await prisma.alertLog.count({
    where: { resolved: false }
  });
  
  console.log(`📊 Total unresolved alerts in database: ${totalUnresolved}`);
  
  // Get resolved alerts with bordereau
  const resolvedWithBordereau = await prisma.alertLog.findMany({
    where: { 
      resolved: true,
      bordereau: { isNot: null }
    },
    include: {
      bordereau: {
        include: {
          contract: true
        }
      }
    }
  });
  
  console.log(`\n📊 Resolved alerts with bordereau: ${resolvedWithBordereau.length}`);
  
  // Filter by team
  const teamResolved = resolvedWithBordereau.filter(a => 
    a.bordereau?.contract?.teamLeaderId === userId
  );
  
  console.log(`📊 Resolved alerts for Chef d'équipe's team: ${teamResolved.length}`);
  
  if (teamResolved.length > 0) {
    console.log(`\n📋 Sample resolved alerts (first 5):`);
    teamResolved.slice(0, 5).forEach(a => {
      console.log(`  - ${a.bordereau?.reference} | Resolved: ${a.resolved} | ResolvedAt: ${a.resolvedAt}`);
    });
  } else {
    console.log(`\n❌ No resolved alerts found for this team.`);
    console.log(`💡 To create resolved alerts:`);
    console.log(`   1. Go to "Alertes Actives" tab`);
    console.log(`   2. Click ✅ "Marquer résolu" button on an alert`);
    console.log(`   3. The alert will appear in "Alertes Résolues" tab`);
  }
  
  await prisma.$disconnect();
}

checkResolvedAlerts().catch(console.error);
