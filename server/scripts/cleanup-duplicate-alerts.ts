import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupDuplicateAlerts() {
  console.log('🧹 Cleaning up duplicate alerts...');
  
  try {
    // Find all duplicate TEAM_OVERLOAD alerts
    const duplicates = await prisma.alertLog.findMany({
      where: {
        alertType: 'TEAM_OVERLOAD',
        resolved: false,
        createdAt: {
          gte: new Date('2025-12-17')
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Found ${duplicates.length} TEAM_OVERLOAD alerts`);

    // Group by userId to find duplicates
    const groupedByUser = duplicates.reduce((acc, alert) => {
      const key = alert.userId || 'null';
      if (!acc[key]) acc[key] = [];
      acc[key].push(alert);
      return acc;
    }, {} as Record<string, any[]>);

    let deletedCount = 0;
    
    for (const [userId, alerts] of Object.entries(groupedByUser)) {
      if (alerts.length > 1) {
        console.log(`User ${userId} has ${alerts.length} duplicate alerts`);
        
        // Keep the most recent one, delete the rest
        const [keep, ...toDelete] = alerts;
        
        for (const alert of toDelete) {
          await prisma.alertLog.delete({
            where: { id: alert.id }
          });
          deletedCount++;
          console.log(`  ❌ Deleted duplicate alert ${alert.id}`);
        }
        
        console.log(`  ✅ Kept alert ${keep.id}`);
      }
    }

    console.log(`\n✅ Cleanup complete! Deleted ${deletedCount} duplicate alerts`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupDuplicateAlerts();
