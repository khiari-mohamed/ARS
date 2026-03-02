import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function finalTest() {
  const chefId = '37b1d219-2b45-43e4-b5f5-a6af76abbab1';
  const user = { id: chefId, role: 'CHEF_EQUIPE' };

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
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Total alerts: ${alerts.length}\n`);

  const filteredAlerts = alerts.filter(alert => {
    if (user.role === 'SUPER_ADMIN') return true;
    if (!alert.bordereau) {
      console.log(`❌ Filtered OUT (no bordereau): ${alert.id}`);
      return false;
    }
    if (user.role === 'GESTIONNAIRE') {
      return alert.bordereau.currentHandlerId === user.id;
    }
    if (user.role === 'CHEF_EQUIPE' || user.role === 'GESTIONNAIRE_SENIOR') {
      const matches = alert.bordereau.contract?.teamLeaderId === user.id;
      if (!matches) {
        console.log(`❌ Filtered OUT (wrong team): ${alert.bordereau.reference} - teamLeaderId: ${alert.bordereau.contract?.teamLeaderId}`);
      }
      return matches;
    }
    return false;
  });

  console.log(`\n✅ Final result: ${filteredAlerts.length} alerts`);
  console.log(`🎯 Expected: 65`);
  console.log(`📊 Match: ${filteredAlerts.length === 65 ? 'YES ✅' : 'NO ❌'}`);
}

finalTest()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
