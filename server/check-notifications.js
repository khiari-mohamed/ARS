const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNotifications() {
  console.log('🔔 Checking notifications...\n');
  
  const respo = await prisma.user.findUnique({
    where: { email: 'respo@mail.com' }
  });
  
  if (!respo) {
    console.log('❌ Respo user not found');
    return;
  }
  
  console.log('✅ Respo user ID:', respo.id);
  
  const notifications = await prisma.notification.findMany({
    where: { userId: respo.id },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  
  console.log(`\n📊 Total notifications: ${notifications.length}\n`);
  
  notifications.forEach(n => {
    console.log(`${n.read ? '📖' : '🔔'} ${n.type} - ${n.title}`);
    console.log(`   ${n.message}`);
    console.log(`   Created: ${n.createdAt}`);
    console.log('');
  });
  
  const ovNotifs = notifications.filter(n => n.type === 'OV_PENDING_VALIDATION');
  console.log(`\n💰 OV_PENDING_VALIDATION notifications: ${ovNotifs.length}`);
  
  await prisma.$disconnect();
}

checkNotifications();
