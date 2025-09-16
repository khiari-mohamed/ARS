const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSearchAPI() {
  console.log('🧪 Testing search API logic...');
  
  try {
    const testGestionnaireId = 'f7d0493c-f2a4-4241-8abc-b80ce85913cc';
    const query = 'BDX';
    
    console.log('🎯 Testing search with:', { gestionnaireId: testGestionnaireId, query });
    
    const whereClause = {
      assignedToUserId: testGestionnaireId,
      OR: [
        { reference: { contains: query, mode: 'insensitive' } },
        { client: { name: { contains: query, mode: 'insensitive' } } },
        { documents: { some: { name: { contains: query, mode: 'insensitive' } } } }
      ]
    };
    
    console.log('🔍 Where clause:', JSON.stringify(whereClause, null, 2));
    
    const results = await prisma.bordereau.findMany({
      where: whereClause,
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
      orderBy: { dateReception: 'desc' },
      take: 50
    });
    
    console.log('📋 Raw results:', results.length, 'bordereaux found');
    
    // Process results like the API does
    const processedResults = [];
    for (const b of results) {
      const bulletinSoins = await prisma.bulletinSoin.findMany({
        where: { bordereauId: b.id },
        select: {
          nomAssure: true,
          nomBeneficiaire: true
        },
        take: 1
      });
      
      const bsData = bulletinSoins[0] || { nomAssure: null, nomBeneficiaire: null };
      
      processedResults.push({
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
    
    console.log('✅ Processed results:', processedResults);
    
    // Test different search terms
    const testQueries = ['BDX', 'DLT', 'EPS', 'Delta', 'Epsilon', 'Test Client'];
    
    for (const testQuery of testQueries) {
      const testResults = await prisma.bordereau.findMany({
        where: {
          assignedToUserId: testGestionnaireId,
          OR: [
            { reference: { contains: testQuery, mode: 'insensitive' } },
            { client: { name: { contains: testQuery, mode: 'insensitive' } } },
            { documents: { some: { name: { contains: testQuery, mode: 'insensitive' } } } }
          ]
        },
        include: {
          client: { select: { name: true } }
        }
      });
      
      console.log(`🔍 "${testQuery}" → ${testResults.length} results`);
    }
    
  } catch (error) {
    console.error('❌ Error testing search:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSearchAPI();