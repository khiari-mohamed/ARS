/**
 * ONE-TIME FIX: Update bordereaux to TRAITE when all documents are treated
 * Run: node scripts/fix-prod-bordereaux-status.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Starting one-time fix for PROD bordereaux status...\n');

  const bordereaux = await prisma.bordereau.findMany({
    where: {
      statut: { notIn: ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'] },
      archived: false
    },
    include: {
      documents: { select: { id: true, status: true, uploadedAt: true } },
      BulletinSoin: { select: { id: true, etat: true, updatedAt: true } }
    }
  });

  console.log(`📊 Found ${bordereaux.length} bordereaux to check\n`);

  let fixedCount = 0;

  for (const b of bordereaux) {
    const totalDocs = b.documents.length;
    const traitedDocs = b.documents.filter(d => d.status === 'TRAITE').length;
    const allDocsTreated = totalDocs === 0 || traitedDocs === totalDocs;

    const totalBS = b.BulletinSoin.length;
    const traitedBS = b.BulletinSoin.filter(bs => bs.etat === 'TRAITE').length;
    const allBSTreated = totalBS === 0 || traitedBS === totalBS;

    const allTreated = allDocsTreated && allBSTreated && (totalDocs > 0 || totalBS > 0);

    console.log(`📋 ${b.reference}:`);
    console.log(`   Status: ${b.statut}`);
    console.log(`   Documents: ${traitedDocs}/${totalDocs} TRAITE`);
    console.log(`   BulletinSoin: ${traitedBS}/${totalBS} TRAITE`);
    console.log(`   allTreated: ${allTreated}`);

    if (allTreated && !b.dateCloture) {
      // Calculate dateCloture as the LATEST date
      const allDates = [];
      
      b.documents.forEach(doc => {
        if (doc.uploadedAt) allDates.push(new Date(doc.uploadedAt));
      });
      
      b.BulletinSoin.forEach(bs => {
        if (bs.updatedAt) allDates.push(new Date(bs.updatedAt));
      });
      
      const dateCloture = allDates.length > 0 
        ? new Date(Math.max(...allDates.map(d => d.getTime())))
        : new Date();

      console.log(`   ✅ FIXING: Setting status to TRAITE with dateCloture=${dateCloture.toISOString()}`);

      await prisma.bordereau.update({
        where: { id: b.id },
        data: {
          statut: 'TRAITE',
          dateCloture
        }
      });

      fixedCount++;
    } else {
      console.log(`   ⏭️  SKIPPING: Not ready for TRAITE status`);
    }
    console.log('');
  }

  console.log('═'.repeat(80));
  console.log(`\n✅ Fix complete! Updated ${fixedCount} bordereau(x) to TRAITE status\n`);

  await prisma.$disconnect();
}

main().catch(console.error);
