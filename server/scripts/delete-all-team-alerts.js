const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteAllTeamAlerts() {
  console.log('🗑️  Deleting ALL TEAM_OVERLOAD alerts...');
  
  try {
    const result = await prisma.alertLog.deleteMany({
      where: {
        alertType: 'TEAM_OVERLOAD'
      }
    });
    
    console.log(`✅ Deleted ${result.count} TEAM_OVERLOAD alerts`);
    console.log('✅ Cleanup complete! Restart backend to create fresh alerts.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllTeamAlerts();
