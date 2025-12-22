const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixOldAlerts() {
  const admin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' }
  });
  
  if (!admin) {
    console.log('No admin found');
    return;
  }
  
  const result = await prisma.alertLog.updateMany({
    where: {
      resolved: true,
      userId: null
    },
    data: {
      userId: admin.id
    }
  });
  
  console.log(`Fixed ${result.count} old alerts`);
}

fixOldAlerts()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
  });
