const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupDuplicateAlerts() {
  console.log('🧹 Cleaning up duplicate TEAM_OVERLOAD alerts...');
  
  try {
    // Get all TEAM_OVERLOAD alerts grouped by userId
    const alerts = await prisma.alertLog.findMany({
      where: {
        alertType: 'TEAM_OVERLOAD',
        resolved: false
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`Found ${alerts.length} TEAM_OVERLOAD alerts`);
    
    // Group by userId
    const alertsByUser = {};
    alerts.forEach(alert => {
      const key = alert.userId || 'null';
      if (!alertsByUser[key]) {
        alertsByUser[key] = [];
      }
      alertsByUser[key].push(alert);
    });
    
    // Keep only the most recent alert for each user, delete the rest
    let deletedCount = 0;
    for (const userId in alertsByUser) {
      const userAlerts = alertsByUser[userId];
      if (userAlerts.length > 1) {
        // Keep the first (most recent), delete the rest
        const toDelete = userAlerts.slice(1);
        console.log(`User ${userId}: Keeping 1, deleting ${toDelete.length} duplicates`);
        
        for (const alert of toDelete) {
          await prisma.alertLog.delete({
            where: { id: alert.id }
          });
          deletedCount++;
        }
      }
    }
    
    console.log(`✅ Deleted ${deletedCount} duplicate alerts`);
    console.log(`✅ Cleanup complete!`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupDuplicateAlerts();
