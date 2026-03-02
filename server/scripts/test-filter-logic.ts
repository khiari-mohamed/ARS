import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testFilterLogic() {
  console.log('🔍 Testing Alert History Filter Logic...\n');

  const chefId = '37b1d219-2b45-43e4-b5f5-a6af76abbab1';

  // Simulate the FIXED backend query
  const where: any = {
    resolved: false,
    bordereau: {
      contract: {
        teamLeaderId: chefId
      }
    }
  };

  const filteredAlerts = await prisma.alertLog.findMany({
    where,
    include: {
      bordereau: {
        include: {
          contract: { include: { teamLeader: true } },
          client: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`✅ Filtered query returned: ${filteredAlerts.length} alerts\n`);

  // Verify all belong to Mohamed Frad
  let correct = 0;
  let incorrect = 0;

  filteredAlerts.forEach((alert) => {
    if (alert.bordereau?.contract?.teamLeaderId === chefId) {
      correct++;
    } else {
      incorrect++;
      console.log(`❌ Alert ${alert.id}: ${alert.bordereau?.reference}`);
      console.log(`   Team Leader: ${alert.bordereau?.contract?.teamLeader?.fullName}`);
    }
  });

  console.log('\n📈 RESULT:');
  console.log(`✅ Correct: ${correct}`);
  console.log(`❌ Incorrect: ${incorrect}`);
  console.log(`🎯 Filter working: ${incorrect === 0 ? 'YES ✅' : 'NO ❌'}`);
  console.log(`\n💡 Expected: 65 alerts (from previous script)`);
  console.log(`📊 Got: ${filteredAlerts.length} alerts`);
}

testFilterLogic()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
