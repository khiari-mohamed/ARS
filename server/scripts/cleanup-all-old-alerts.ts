import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupAllOldAlerts() {
  console.log('🧹 Cleaning up all old format alerts...');

  try {
    // Delete all old format alerts (those with "51/20" or "40/20" pattern)
    const result = await prisma.alertLog.deleteMany({
      where: {
        alertType: 'TEAM_OVERLOAD',
        OR: [
          { message: { contains: '/20 (+' } },
          { message: { contains: '51/20' } },
          { message: { contains: '40/20' } }
        ]
      }
    });

    console.log(`✅ Deleted ${result.count} old format alerts`);
    console.log('🎉 Cleanup completed!');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanupAllOldAlerts();
