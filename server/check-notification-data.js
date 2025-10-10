const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNotificationData() {
  console.log('🔍 Checking notification data structure...\n');
  
  const notif = await prisma.notification.findFirst({
    where: { type: 'OV_PENDING_VALIDATION' },
    orderBy: { createdAt: 'desc' }
  });
  
  if (!notif) {
    console.log('❌ No OV_PENDING_VALIDATION notifications found');
    return;
  }
  
  console.log('✅ Found notification:');
  console.log('   ID:', notif.id);
  console.log('   Type:', notif.type);
  console.log('   Title:', notif.title);
  console.log('   Message:', notif.message);
  console.log('   Data:', JSON.stringify(notif.data, null, 2));
  console.log('   Has ordreVirementId:', !!notif.data?.ordreVirementId);
  console.log('   Has reference:', !!notif.data?.reference);
  
  await prisma.$disconnect();
}

checkNotificationData();
