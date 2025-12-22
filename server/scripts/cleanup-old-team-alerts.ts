import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupOldTeamAlerts() {
  console.log('🧹 Cleaning up old format TEAM_OVERLOAD alerts...');

  try {
    // Delete old format alerts (those with "40/20" pattern instead of "40 dossiers / 20 capacité")
    const result = await prisma.alertLog.deleteMany({
      where: {
        alertType: 'TEAM_OVERLOAD',
        resolved: false,
        message: {
          contains: '/20 (+100%)'
        }
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

cleanupOldTeamAlerts();
