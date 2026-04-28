const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixBordereauStatus() {
  console.log('🔧 Fixing bordereau status for fully treated bordereaux...\n');
  
  const bordereaux = await prisma.bordereau.findMany({
    where: {
      statut: { notIn: ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'] }
    },
    include: {
      documents: {
        select: {
          id: true,
          status: true
        }
      },
      BulletinSoin: {
        select: {
          id: true,
          etat: true
        }
      }
    }
  });
  
  console.log(`📊 Found ${bordereaux.length} bordereaux to check\n`);
  
  let updatedCount = 0;
  
  for (const b of bordereaux) {
    // Check documents
    const documents = b.documents || [];
    const totalDocs = documents.length;
    const traitedDocs = documents.filter(doc => doc.status === 'TRAITE').length;
    const allDocsTreated = totalDocs === 0 || traitedDocs === totalDocs;
    
    // Check bulletin soins
    const bulletinSoins = b.BulletinSoin || [];
    const totalBS = bulletinSoins.length;
    const traitedBS = bulletinSoins.filter(bs => bs.etat === 'TRAITE').length;
    const allBSTreated = totalBS === 0 || traitedBS === totalBS;
    
    // Both must be treated (or empty) and at least one type must exist
    const allTreated = allDocsTreated && allBSTreated && (totalDocs > 0 || totalBS > 0);
    
    if (allTreated) {
      console.log(`✅ Updating ${b.reference}:`);
      console.log(`   Documents: ${traitedDocs}/${totalDocs} treated`);
      console.log(`   BS: ${traitedBS}/${totalBS} treated`);
      console.log(`   Status: ${b.statut} → TRAITE`);
      
      await prisma.bordereau.update({
        where: { id: b.id },
        data: {
          statut: 'TRAITE',
          dateCloture: new Date()
        }
      });
      
      updatedCount++;
      console.log('');
    }
  }
  
  console.log(`\n🎉 Updated ${updatedCount} bordereau(x) to TRAITE status`);
  
  await prisma.$disconnect();
}

fixBordereauStatus().catch(console.error);
