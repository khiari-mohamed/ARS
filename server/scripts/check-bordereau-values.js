const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBordereauValues() {
  console.log('🔍 Checking Bordereau values from UI...\n');

  const uiReferences = [
    'OA-BULLETIN-2026-98259',
    'ALT-BULLETIN-2026-75925',
    'K&S-BULLETIN-2026-71476',
    'DTT-BULLETIN-2026-74641',
    'ALT-BULLETIN-2026-82182',
    'A-BULLETIN-2026-50256',
    'ALT-BULLETIN-2026-03132',
    'ALT-BULLETIN-2026-76652',
    'DS-BULLETIN-2026-20637',
    'FT-BULLETIN-2026-23793'
  ];

  for (const ref of uiReferences) {
    const bordereau = await prisma.bordereau.findUnique({
      where: { reference: ref },
      include: {
        client: true,
        chargeCompte: true,
        documents: true,
        BulletinSoin: true
      }
    });

    if (!bordereau) {
      console.log(`❌ NOT FOUND: ${ref}`);
      continue;
    }

    console.log(`\n📋 ${ref}`);
    console.log(`   Client: ${bordereau.client.name}`);
    console.log(`   Date Réception: ${bordereau.dateReception.toLocaleDateString('fr-FR')}`);
    console.log(`   Documents: ${bordereau.documents.length}`);
    console.log(`   Délai: ${bordereau.delaiReglement}j`);
    
    // Calculate Durée Traitement
    const now = new Date();
    const dureeTraitement = Math.floor((now - bordereau.dateReception) / (1000 * 60 * 60 * 24));
    console.log(`   Durée Trait.: ${dureeTraitement}j`);
    
    // Calculate Durée Règlement (should be negative if before deadline)
    const dateLimite = new Date(bordereau.dateReception);
    dateLimite.setDate(dateLimite.getDate() + bordereau.delaiReglement);
    const dureeReglement = Math.floor((now - dateLimite) / (1000 * 60 * 60 * 24));
    console.log(`   Durée Règlement: ${dureeReglement}j`);
    
    console.log(`   Statut: ${bordereau.statut}`);
    console.log(`   Affecté à: ${bordereau.chargeCompte ? bordereau.chargeCompte.fullName : 'NON ASSIGNÉ'}`);
    console.log(`   Scan Status: ${bordereau.scanStatus}`);
    console.log(`   Completion Rate: ${bordereau.completionRate}%`);
  }

  // Check total count
  const total = await prisma.bordereau.count();
  console.log(`\n\n📊 Total Bordereaux in DB: ${total}`);
  console.log(`📊 Expected from UI: 213`);
  console.log(total === 213 ? '✅ Count matches!' : '❌ Count mismatch!');

  // Check status distribution
  const statusCounts = await prisma.bordereau.groupBy({
    by: ['statut'],
    _count: true
  });
  
  console.log('\n📈 Status Distribution:');
  statusCounts.forEach(s => {
    console.log(`   ${s.statut}: ${s._count}`);
  });

  await prisma.$disconnect();
}

checkBordereauValues().catch(console.error);
