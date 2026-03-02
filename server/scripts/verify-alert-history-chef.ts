import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyAlertHistoryForChef() {
  console.log('🔍 Verifying Alert History for Chef d\'équipe Mohamed Frad...\n');

  // Find Mohamed Frad
  const chef = await prisma.user.findFirst({
    where: { 
      fullName: { contains: 'Mohamed Frad', mode: 'insensitive' },
      role: 'CHEF_EQUIPE'
    }
  });

  if (!chef) {
    console.log('❌ Chef Mohamed Frad not found');
    return;
  }

  console.log(`✅ Found Chef: ${chef.fullName} (ID: ${chef.id})\n`);

  // Get all alert history
  const allAlerts = await prisma.alertLog.findMany({
    where: { resolved: false },
    include: {
      bordereau: {
        include: {
          contract: {
            include: { teamLeader: true }
          },
          client: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 147
  });

  console.log(`📊 Total alerts in history: ${allAlerts.length}\n`);

  // Check which alerts belong to Mohamed Frad
  let belongsToChef = 0;
  let notBelongsToChef = 0;

  console.log('🔎 Checking each alert:\n');
  
  allAlerts.forEach((alert, index) => {
    const teamLeaderId = alert.bordereau?.contract?.teamLeaderId;
    const belongs = teamLeaderId === chef.id;
    
    if (belongs) {
      belongsToChef++;
    } else {
      notBelongsToChef++;
      console.log(`❌ Alert ${index + 1}: ${alert.bordereau?.reference || alert.id}`);
      console.log(`   Team Leader: ${alert.bordereau?.contract?.teamLeader?.fullName || 'None'} (${teamLeaderId || 'N/A'})`);
      console.log(`   Client: ${alert.bordereau?.client?.name || 'N/A'}`);
      console.log(`   Message: ${alert.message.substring(0, 60)}...`);
      console.log('');
    }
  });

  console.log('\n📈 SUMMARY:');
  console.log(`✅ Alerts belonging to ${chef.fullName}: ${belongsToChef}`);
  console.log(`❌ Alerts NOT belonging to ${chef.fullName}: ${notBelongsToChef}`);
  console.log(`📊 Total: ${allAlerts.length}`);
  console.log(`🎯 Filter working correctly: ${notBelongsToChef === 0 ? 'YES ✅' : 'NO ❌'}`);
}

verifyAlertHistoryForChef()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
