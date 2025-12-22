import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDistribution() {
  console.log('\n📊 DOCUMENT DISTRIBUTION IN DATABASE\n');
  
  const types = [
    'BULLETIN_SOIN',
    'COMPLEMENT_INFORMATION',
    'ADHESION',
    'RECLAMATION',
    'CONTRAT_AVENANT',
    'DEMANDE_RESILIATION',
    'CONVENTION_TIERS_PAYANT'
  ];
  
  let total = 0;
  
  for (const type of types) {
    const count = await prisma.document.count({ where: { type: type as any } });
    
    if (count > 0) {
      console.log(`✅ ${type}: ${count} documents`);
    } else {
      console.log(`⚪ ${type}: 0 documents`);
    }
    
    total += count;
  }
  
  console.log(`\n📈 TOTAL: ${total} documents\n`);
  
  // Check status distribution by type
  console.log('📊 STATUS DISTRIBUTION BY TYPE:\n');
  
  const statusByType = await prisma.document.groupBy({
    by: ['type', 'status'],
    _count: true,
  });
  
  statusByType.forEach(s => {
    console.log(`   ${s.type} - ${s.status}: ${s._count}`);
  });
  
  await prisma.$disconnect();
}

checkDistribution().catch(console.error);
