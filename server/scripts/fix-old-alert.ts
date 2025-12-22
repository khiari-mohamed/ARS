import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixOldAlert() {
  console.log('🔧 Fixing old alert with incorrect capacity...\n');
  
  try {
    // Find the old alert with wrong capacity
    const oldAlert = await prisma.alertLog.findFirst({
      where: {
        alertType: 'TEAM_OVERLOAD',
        resolved: false,
        message: {
          contains: '50/20'
        }
      }
    });

    if (oldAlert) {
      console.log(`Found old alert: ${oldAlert.message}`);
      
      // Resolve it since the team is no longer overloaded (36% utilization)
      await prisma.alertLog.update({
        where: { id: oldAlert.id },
        data: {
          resolved: true,
          resolvedAt: new Date()
        }
      });
      
      console.log('✅ Resolved old alert with incorrect capacity');
      console.log('   Reason: Team utilization is now 36% (50/140) - well below threshold');
    } else {
      console.log('No old alerts found');
    }

    console.log('\n✅ Fix complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixOldAlert();
