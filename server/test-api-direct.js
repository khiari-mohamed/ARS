const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAPIDirectly() {
  console.log('🧪 Testing API logic directly...');
  
  try {
    // Test gestionnaire ID
    const testGestionnaireId = 'f7d0493c-f2a4-4241-8abc-b80ce85913cc';
    
    console.log('🎯 Testing with gestionnaire ID:', testGestionnaireId);
    
    // Test getGestionnaireGlobalBasket logic
    const allBordereaux = await prisma.bordereau.findMany({
      where: {
        assignedToUserId: testGestionnaireId
      },
      include: {
        client: { select: { name: true } },
        documents: {
          select: { 
            id: true,
            name: true, 
            type: true 
          }
        }
      },
      orderBy: { dateReception: 'desc' }
    });
    
    console.log('📋 Found bordereaux:', allBordereaux.length);
    
    // Calculate type breakdown
    const typeBreakdown = {
      prestation: allBordereaux.filter(b => 
        b.documents.some(d => d.type === 'BULLETIN_SOIN' || d.type === 'PRESTATION')
      ).length,
      reclamation: allBordereaux.filter(b => 
        b.documents.some(d => d.type === 'RECLAMATION')
      ).length,
      complement: allBordereaux.filter(b => 
        b.documents.some(d => d.type === 'COMPLEMENT_DOSSIER')
      ).length
    };
    
    console.log('📊 Type breakdown:', typeBreakdown);
    
    // Test extractBSData for recent dossiers
    const recentDossiersWithBSData = [];
    for (const b of allBordereaux.slice(0, 10)) {
      const bulletinSoins = await prisma.bulletinSoin.findMany({
        where: { bordereauId: b.id },
        select: {
          nomAssure: true,
          nomBeneficiaire: true
        },
        take: 1
      });
      
      const bsData = bulletinSoins[0] || { nomAssure: null, nomBeneficiaire: null };
      
      recentDossiersWithBSData.push({
        id: b.id,
        reference: b.reference,
        gedRef: b.documents[0]?.name || null,
        societe: b.client?.name || null,
        compagnie: b.client?.name || null,
        type: b.documents.some(d => d.type === 'RECLAMATION') ? 'Réclamation' : 
              b.documents.some(d => d.type === 'COMPLEMENT_DOSSIER') ? 'Complément Dossier' : 'Prestation',
        statut: b.statut,
        dateDepot: b.dateReception,
        nom: bsData.nomAssure,
        prenom: bsData.nomBeneficiaire
      });
    }
    
    console.log('📄 Recent dossiers:', recentDossiersWithBSData);
    
    const result = {
      totalDossiers: allBordereaux.length,
      typeBreakdown,
      recentDossiers: recentDossiersWithBSData
    };
    
    console.log('✅ Final API result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Error testing API:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAPIDirectly();