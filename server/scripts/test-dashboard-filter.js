const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDashboardFilter() {
  const userId = '37b1d219-2b45-43e4-b5f5-a6af76abbab1';
  const userRole = 'CHEF_EQUIPE';
  
  console.log(`\n🔍 Testing Dashboard Alerts Filter for ${userRole}\n`);
  
  // Simulate backend query
  const where = {
    contract: {
      teamLeaderId: userId
    }
  };
  
  const bordereaux = await prisma.bordereau.findMany({
    where,
    include: { 
      contract: { 
        include: { 
          teamLeader: { 
            select: { id: true, fullName: true, role: true } 
          },
          client: {
            select: { id: true, name: true }
          }
        } 
      }, 
      client: {
        select: { id: true, name: true }
      }
    },
    orderBy: { createdAt: 'desc' },
  });
  
  console.log(`📊 Total bordereaux for team: ${bordereaux.length}`);
  
  // Filter for alerts (red/orange only)
  const now = new Date();
  let redCount = 0;
  let orangeCount = 0;
  let greenCount = 0;
  
  bordereaux.forEach(b => {
    const daysSinceReception = b.dateReception 
      ? (now.getTime() - new Date(b.dateReception).getTime()) / (1000 * 60 * 60 * 24) 
      : 0;
    const slaThreshold = b.contract?.delaiReglement || b.delaiReglement || 30;
    const percentageElapsed = (daysSinceReception / slaThreshold) * 100;
    
    if (b.statut !== 'CLOTURE' && percentageElapsed > 100) {
      redCount++;
    } else if (b.statut !== 'CLOTURE' && percentageElapsed > 80) {
      orangeCount++;
    } else {
      greenCount++;
    }
  });
  
  console.log(`\n📊 Alert Levels:`);
  console.log(`  🔴 Red (Critical): ${redCount}`);
  console.log(`  🟠 Orange (Warning): ${orangeCount}`);
  console.log(`  🟢 Green (Normal): ${greenCount}`);
  console.log(`\n🎯 Expected alerts (red + orange): ${redCount + orangeCount}`);
  console.log(`📊 UI shows: 78`);
  console.log(`📊 Match: ${redCount + orangeCount === 78 ? 'YES ✅' : 'NO ❌'}`);
  
  // Show sample
  console.log(`\n📋 Sample bordereaux (first 5):`);
  bordereaux.slice(0, 5).forEach(b => {
    const daysSince = b.dateReception 
      ? Math.round((now.getTime() - new Date(b.dateReception).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    console.log(`  - ${b.reference} | ${b.statut} | ${daysSince} days | Team: ${b.contract?.teamLeader?.fullName || 'N/A'}`);
  });
  
  await prisma.$disconnect();
}

testDashboardFilter().catch(console.error);
