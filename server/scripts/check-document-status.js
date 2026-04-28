const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDocumentStatus() {
  console.log('🔍 Checking document status for Siwar\'s bordereaux...\n');
  
  const bordereaux = await prisma.bordereau.findMany({
    where: {
      reference: {
        in: [
          'BR-N°10-2026',
          'ZNC-BULLETIN-2026-97940-BR-N°10-2026',
          'ZNC-BULLETIN-2026-20031-BR-N°09-2026',
          'ZC-BULLETIN-2026-67164-BR-N°09-2026'
        ]
      }
    },
    include: {
      documents: {
        select: {
          id: true,
          name: true,
          status: true
        }
      },
      BulletinSoin: {
        select: {
          id: true,
          numBs: true,
          etat: true
        }
      }
    }
  });
  
  for (const b of bordereaux) {
    console.log(`📋 Bordereau: ${b.reference}`);
    console.log(`   Statut: ${b.statut}`);
    console.log(`   dateCloture: ${b.dateCloture}`);
    console.log(`   Documents (${b.documents.length}):`);
    
    const traitedDocs = b.documents.filter(d => d.status === 'TRAITE').length;
    console.log(`     - TRAITE: ${traitedDocs}`);
    console.log(`     - Other: ${b.documents.length - traitedDocs}`);
    
    b.documents.forEach(d => {
      console.log(`       • ${d.name}: ${d.status || 'NULL'}`);
    });
    
    console.log(`   Bulletin Soins (${b.BulletinSoin.length}):`);
    const traitedBS = b.BulletinSoin.filter(bs => bs.etat === 'TRAITE').length;
    console.log(`     - TRAITE: ${traitedBS}`);
    console.log(`     - Other: ${b.BulletinSoin.length - traitedBS}`);
    
    console.log('');
  }
  
  await prisma.$disconnect();
}

checkDocumentStatus().catch(console.error);
