import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDB() {
  console.log('🔍 DATABASE CHECK\n');

  const [users, bordereaux, bulletinSoins, documents, auditLogs, alertLogs, clients] = await Promise.all([
    prisma.user.count(),
    prisma.bordereau.findMany({ select: { statut: true } }),
    prisma.bulletinSoin.count(),
    prisma.document.count(),
    prisma.auditLog.count(),
    prisma.alertLog.count(),
    prisma.client.count()
  ]);

  console.log(`Users: ${users}`);
  console.log(`Bordereaux: ${bordereaux.length}`);
  console.log(`BulletinSoins: ${bulletinSoins}`);
  console.log(`Documents: ${documents}`);
  console.log(`AuditLogs: ${auditLogs}`);
  console.log(`AlertLogs: ${alertLogs}`);
  console.log(`Clients: ${clients}`);

  if (bordereaux.length > 0) {
    const statusCount = bordereaux.reduce((acc, b) => {
      acc[b.statut] = (acc[b.statut] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log('\nBordereau Status Distribution:', statusCount);
  }

  console.log('\n🎯 QUEUE ANALYSIS:');
  const queueStats = {
    BO_ENTRY: bordereaux.filter(b => ['EN_ATTENTE', 'A_SCANNER'].includes(b.statut)).length,
    SCAN: bordereaux.filter(b => ['A_SCANNER', 'SCAN_EN_COURS', 'SCANNE'].includes(b.statut)).length,
    PROCESSING: bordereaux.filter(b => ['ASSIGNE', 'EN_COURS', 'TRAITE'].includes(b.statut)).length,
    VALIDATION: bordereaux.filter(b => ['TRAITE', 'CLOTURE', 'REJETE'].includes(b.statut)).length
  };
  
  console.log('Queue counts:', queueStats);
  
  if (bordereaux.length === 0) {
    console.log('\n❌ NO BORDEREAUX DATA - This is why queues show 0');
    console.log('💡 Need to create sample bordereaux with different statuses');
  }

  await prisma.$disconnect();
}

checkDB().catch(console.error);