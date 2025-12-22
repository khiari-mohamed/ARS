const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBordereaux() {
  console.log('🔍 Checking all bordereaux in database...\n');
  
  const total = await prisma.bordereau.count();
  console.log(`📊 Total bordereaux: ${total}`);
  
  const last90Days = await prisma.bordereau.count({
    where: { createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } }
  });
  console.log(`📅 Last 90 days: ${last90Days}`);
  
  const last30Days = await prisma.bordereau.count({
    where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
  });
  console.log(`📅 Last 30 days: ${last30Days}`);
  
  const byDate = await prisma.bordereau.groupBy({
    by: ['createdAt'],
    _count: { id: true },
    orderBy: { createdAt: 'desc' },
    take: 30
  });
  
  console.log('\n📈 Bordereaux by date (last 30):');
  byDate.forEach(b => {
    const date = new Date(b.createdAt).toISOString().split('T')[0];
    console.log(`  ${date}: ${b._count.id} bordereaux`);
  });
  
  await prisma.$disconnect();
}

checkBordereaux().catch(console.error);
