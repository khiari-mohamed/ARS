import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function simulateBackendFilter() {
  const chefId = '37b1d219-2b45-43e4-b5f5-a6af76abbab1';
  const user = { id: chefId, role: 'CHEF_EQUIPE' };

  // Simulate exact backend logic
  const where: any = {};
  
  const alerts = await prisma.alertLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { 
      bordereau: { 
        include: { 
          client: true,
          contract: true
        } 
      }, 
      document: true, 
      user: true 
    },
  });

  console.log(`📊 Fetched ${alerts.length} alerts from database\n`);

  // Apply role-based filtering
  const filteredAlerts = alerts.filter(alert => {
    if (user.role === 'SUPER_ADMIN') return true;
    if (!alert.bordereau) return false;
    if (user.role === 'GESTIONNAIRE') {
      return alert.bordereau.currentHandlerId === user.id;
    }
    if (user.role === 'CHEF_EQUIPE' || user.role === 'GESTIONNAIRE_SENIOR') {
      return alert.bordereau.contract?.teamLeaderId === user.id;
    }
    return false;
  });

  console.log(`✅ After filtering: ${filteredAlerts.length} alerts\n`);
  console.log(`🎯 Expected: 65 alerts`);
  console.log(`📊 Got: ${filteredAlerts.length} alerts`);
  console.log(`✅ Filter working: ${filteredAlerts.length === 65 ? 'YES' : 'NO'}`);
}

simulateBackendFilter()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
