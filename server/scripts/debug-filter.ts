import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugFilter() {
  const chefId = '37b1d219-2b45-43e4-b5f5-a6af76abbab1';

  const alerts = await prisma.alertLog.findMany({
    where: { resolved: false },
    include: { 
      bordereau: { 
        include: { 
          client: true,
          contract: true
        } 
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 147
  });

  let withBordereau = 0;
  let withoutBordereau = 0;
  let withContract = 0;
  let withoutContract = 0;
  let matchingTeamLeader = 0;
  let notMatchingTeamLeader = 0;

  alerts.forEach(alert => {
    if (alert.bordereau) {
      withBordereau++;
      if (alert.bordereau.contract) {
        withContract++;
        if (alert.bordereau.contract.teamLeaderId === chefId) {
          matchingTeamLeader++;
        } else {
          notMatchingTeamLeader++;
        }
      } else {
        withoutContract++;
      }
    } else {
      withoutBordereau++;
    }
  });

  console.log('📊 BREAKDOWN:');
  console.log(`Total alerts: ${alerts.length}`);
  console.log(`\n✅ With bordereau: ${withBordereau}`);
  console.log(`❌ Without bordereau: ${withoutBordereau}`);
  console.log(`\n✅ With contract: ${withContract}`);
  console.log(`❌ Without contract: ${withoutContract}`);
  console.log(`\n✅ Matching teamLeaderId: ${matchingTeamLeader}`);
  console.log(`❌ Not matching teamLeaderId: ${notMatchingTeamLeader}`);
  
  console.log(`\n🔍 ISSUE: ${withoutContract} alerts have bordereau but NO contract!`);
}

debugFilter()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
