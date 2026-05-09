const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBordereauCounts() {
  console.log('=== Checking Bordereau Counts ===\n');

  // Total count
  const total = await prisma.bordereau.count();
  console.log(`Total bordereaux in database: ${total}`);

  // Count by archived status
  const active = await prisma.bordereau.count({ where: { archived: false } });
  const archived = await prisma.bordereau.count({ where: { archived: true } });
  console.log(`Active (not archived): ${active}`);
  console.log(`Archived: ${archived}`);

  // Count by status
  const byStatus = await prisma.bordereau.groupBy({
    by: ['statut'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } }
  });

  console.log('\nCount by status:');
  byStatus.forEach(s => {
    console.log(`  ${s.statut}: ${s._count.id}`);
  });

  // Traités count (TRAITE + CLOTURE)
  const traites = await prisma.bordereau.count({
    where: {
      statut: { in: ['TRAITE', 'CLOTURE'] }
    }
  });
  console.log(`\nTraités (TRAITE + CLOTURE): ${traites}`);

  await prisma.$disconnect();
}

checkBordereauCounts().catch(console.error);
