const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBordereauStatusDetails() {
  console.log('🔍 Checking detailed status of bordereaux shown as "Non affectés"...\n');
  
  try {
    const chefmed = await prisma.user.findFirst({
      where: { email: 'chef@mail.com' }
    });
    
    // Get the exact bordereaux shown in "Non affectés" tab
    const nonAffectes = await prisma.bordereau.findMany({
      where: {
        archived: false,
        contract: { teamLeaderId: chefmed.id },
        statut: { in: ['SCANNE', 'A_AFFECTER'] },
        assignedToUserId: null
      },
      include: {
        client: true,
        contract: true,
        BulletinSoin: {
          select: {
            id: true,
            numBs: true,
            etat: true,
            nomAssure: true,
            processedAt: true
          }
        },
        currentHandler: { select: { fullName: true } }
      }
    });
    
    console.log('📋 DETAILED STATUS CHECK FOR "NON AFFECTÉS" BORDEREAUX:');
    console.log('========================================================\n');
    
    nonAffectes.forEach((bordereau, index) => {
      console.log(`${index + 1}. 📄 BORDEREAU: ${bordereau.reference}`);
      console.log(`   Client: ${bordereau.client.name}`);
      console.log(`   Status: ${bordereau.statut}`);
      console.log(`   Assigned to: ${bordereau.currentHandler?.fullName || 'UNASSIGNED'}`);
      console.log(`   Date réception: ${bordereau.dateReception.toLocaleDateString('fr-FR')}`);
      console.log(`   Date début scan: ${bordereau.dateDebutScan?.toLocaleDateString('fr-FR') || 'N/A'}`);
      console.log(`   Date fin scan: ${bordereau.dateFinScan?.toLocaleDateString('fr-FR') || 'N/A'}`);
      console.log(`   Nombre BS: ${bordereau.nombreBS}`);
      console.log(`   Scan Status: ${bordereau.scanStatus}`);
      console.log(`   Completion Rate: ${bordereau.completionRate}%`);
      
      if (bordereau.BulletinSoin && bordereau.BulletinSoin.length > 0) {
        console.log(`   📋 BULLETINS DE SOIN (${bordereau.BulletinSoin.length}):`);
        bordereau.BulletinSoin.forEach(bs => {
          console.log(`     - ${bs.numBs}: ${bs.etat} (${bs.nomAssure}) ${bs.processedAt ? '✅ Processed' : '⏳ Pending'}`);
        });
        
        const traites = bordereau.BulletinSoin.filter(bs => bs.etat === 'VALIDATED').length;
        const rejetes = bordereau.BulletinSoin.filter(bs => bs.etat === 'REJECTED').length;
        const enCours = bordereau.BulletinSoin.length - traites - rejetes;
        
        console.log(`   📊 BS Summary: ${traites} traités, ${rejetes} rejetés, ${enCours} en cours`);
        
        if (traites === bordereau.BulletinSoin.length) {
          console.log(`   ⚠️  WARNING: All BS are VALIDATED but bordereau status is still ${bordereau.statut}`);
          console.log(`   💡 SHOULD BE: TRAITE or CLOTURE`);
        }
      } else {
        console.log(`   📋 No Bulletins de Soin found`);
      }
      
      console.log(`   🎯 EXPECTED UI STATUS: Non affecté (because assignedToUserId is null)`);
      console.log(`   🎯 ACTUAL PROCESSING STATUS: ${bordereau.statut}`);
      console.log('   ' + '─'.repeat(60) + '\n');
    });
    
    // Check if there are any bordereaux that should be in "Traités" but are showing as "Non affectés"
    const shouldBeTraites = nonAffectes.filter(b => 
      b.BulletinSoin && 
      b.BulletinSoin.length > 0 && 
      b.BulletinSoin.every(bs => bs.etat === 'VALIDATED')
    );
    
    if (shouldBeTraites.length > 0) {
      console.log('🚨 POTENTIAL ISSUES FOUND:');
      console.log('==========================');
      shouldBeTraites.forEach(b => {
        console.log(`❌ ${b.reference}: All BS are VALIDATED but status is ${b.statut}`);
        console.log(`   Should probably be TRAITE or CLOTURE`);
      });
    } else {
      console.log('✅ STATUS CONSISTENCY CHECK: All bordereaux have appropriate status');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBordereauStatusDetails();