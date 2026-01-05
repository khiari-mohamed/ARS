const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSeniorDocumentStatus() {
  console.log('🔧 Fixing document status for Gestionnaire Senior bordereaux...\n');
  
  try {
    // Find all Gestionnaire Senior users
    const seniors = await prisma.user.findMany({
      where: { role: 'GESTIONNAIRE_SENIOR' },
      select: { id: true, fullName: true }
    });
    
    console.log(`✅ Found ${seniors.length} Gestionnaire Senior(s)\n`);
    
    for (const senior of seniors) {
      console.log(`👤 Processing: ${senior.fullName}`);
      
      // Find bordereaux assigned to this senior via contract.teamLeaderId
      const bordereaux = await prisma.bordereau.findMany({
        where: {
          archived: false,
          contract: {
            teamLeaderId: senior.id
          }
        },
        include: {
          documents: true,
          client: { select: { name: true } }
        }
      });
      
      console.log(`   📦 Found ${bordereaux.length} bordereau(x)`);
      
      for (const bordereau of bordereaux) {
        const docsToUpdate = bordereau.documents.filter(d => 
          d.status !== 'TRAITE' && d.status !== 'EN_COURS'
        );
        
        if (docsToUpdate.length > 0) {
          console.log(`   🔄 Updating ${docsToUpdate.length} documents in bordereau "${bordereau.reference}" (${bordereau.client?.name})`);
          
          await prisma.document.updateMany({
            where: {
              id: { in: docsToUpdate.map(d => d.id) }
            },
            data: {
              status: 'EN_COURS'
            }
          });
          
          console.log(`   ✅ Updated to EN_COURS`);
        }
      }
      
      console.log('');
    }
    
    console.log('✅ COMPLETE - All Gestionnaire Senior documents updated to EN_COURS\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSeniorDocumentStatus();
