const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testCorbeilleLogic() {
  try {
    console.log('🔍 Testing Fixed Corbeille Logic...');
    
    await prisma.$connect();
    
    // Test the new logic
    console.log('\n📊 New Logic Results:');
    
    // Non affectés: OPEN without assignment
    const nonAffectes = await prisma.reclamation.count({
      where: { 
        status: { in: ['OPEN', 'open', 'OUVERTE', 'OUVERT'] },
        assignedToId: null
      }
    });
    console.log(`Non affectés: ${nonAffectes}`);
    
    // En cours: IN_PROGRESS, EN_COURS, ESCALATED, or assigned OPEN
    const enCours = await prisma.reclamation.count({
      where: {
        OR: [
          { status: { in: ['IN_PROGRESS', 'EN_COURS', 'en_cours', 'ESCALATED', 'ESCALADE'] } },
          { 
            status: { in: ['OPEN', 'open', 'OUVERTE', 'OUVERT'] },
            assignedToId: { not: null }
          }
        ]
      }
    });
    console.log(`En cours: ${enCours}`);
    
    // Traités: RESOLVED, CLOSED
    const traites = await prisma.reclamation.count({
      where: { 
        status: { in: ['RESOLVED', 'RESOLU', 'FERMEE', 'CLOSED'] }
      }
    });
    console.log(`Traités: ${traites}`);
    
    // Get detailed en cours items
    const enCoursItems = await prisma.reclamation.findMany({
      where: {
        OR: [
          { status: { in: ['IN_PROGRESS', 'EN_COURS', 'en_cours', 'ESCALATED', 'ESCALADE'] } },
          { 
            status: { in: ['OPEN', 'open', 'OUVERTE', 'OUVERT'] },
            assignedToId: { not: null }
          }
        ]
      },
      include: {
        client: { select: { name: true } },
        assignedTo: { select: { fullName: true } }
      }
    });
    
    console.log('\n📋 En Cours Details:');
    enCoursItems.forEach(rec => {
      console.log(`  - ${rec.id.substring(0, 8)}: ${rec.client?.name} - Status: "${rec.status}" - Assigné: ${rec.assignedTo?.fullName || 'Non assigné'}`);
    });
    
    console.log(`\n✅ Total should be: Non affectés(${nonAffectes}) + En cours(${enCours}) + Traités(${traites}) = ${nonAffectes + enCours + traites}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCorbeilleLogic();