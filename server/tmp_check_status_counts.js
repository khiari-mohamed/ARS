require('dotenv').config({ path: './server/.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    console.log('Checking bordereau counts since', sevenDaysAgo.toISOString());

    const countsByDateReception = await prisma.bordereau.groupBy({
      by: ['statut'],
      _count: { id: true },
      where: { dateReception: { gte: sevenDaysAgo } }
    });

    console.log('\nCounts by dateReception (last 7 days):');
    console.log(JSON.stringify(countsByDateReception, null, 2));

    const countsByCreatedAt = await prisma.bordereau.groupBy({
      by: ['statut'],
      _Count: { id: true },
      where: { createdAt: { gte: sevenDaysAgo } }
    }).catch(async (e) => {
      // Some prisma versions use _count vs _Count; try fallback
      return prisma.bordereau.groupBy({
        by: ['statut'],
        _count: { id: true },
        where: { createdAt: { gte: sevenDaysAgo } }
      });
    });

    console.log('\nCounts by createdAt (last 7 days):');
    console.log(JSON.stringify(countsByCreatedAt, null, 2));

    const totalRecent = await prisma.bordereau.count({ where: { dateReception: { gte: sevenDaysAgo } } });
    const totalCreatedRecent = await prisma.bordereau.count({ where: { createdAt: { gte: sevenDaysAgo } } });

    console.log('\nTotals:');
    console.log('dateReception >= 7d ->', totalRecent);
    console.log('createdAt >= 7d    ->', totalCreatedRecent);

    await prisma.$disconnect();
  } catch (err) {
    console.error('DB check failed:', err);
    try { await prisma.$disconnect(); } catch (e) {}
    process.exit(1);
  }
})();
