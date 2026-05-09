const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAlertMessages() {
  console.log('🔧 Fixing all TEAM_OVERLOAD alert messages...');
  
  try {
    // Delete all old TEAM_OVERLOAD alerts (they have wrong format)
    const deleted = await prisma.alertLog.deleteMany({
      where: {
        alertType: 'TEAM_OVERLOAD'
      }
    });
    
    console.log(`✅ Deleted ${deleted.count} old TEAM_OVERLOAD alerts`);
    console.log('✅ All fixed! New alerts will have correct capacity format.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAlertMessages();
