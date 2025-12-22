import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateAlertMessage() {
  console.log('🔧 Updating alert message with correct capacity...\n');
  
  try {
    // Find alerts with incorrect capacity in message
    const alerts = await prisma.alertLog.findMany({
      where: {
        alertType: 'TEAM_OVERLOAD',
        message: {
          contains: '50/20'
        }
      }
    });

    console.log(`Found ${alerts.length} alert(s) to update`);

    for (const alert of alerts) {
      // Update message to show correct capacity
      const newMessage = alert.message.replace('50/20 (+150%)', '50/140 (+36%)');
      
      await prisma.alertLog.update({
        where: { id: alert.id },
        data: {
          message: newMessage
        }
      });
      
      console.log(`✅ Updated: ${alert.message}`);
      console.log(`   New:     ${newMessage}`);
    }

    console.log('\n✅ All alert messages updated!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateAlertMessage();
