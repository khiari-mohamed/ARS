const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectCyrineSenior() {
  console.log('\n🔍 INSPECTING CYRINE CHOUK (GESTIONNAIRE SENIOR)\n');
  console.log('='.repeat(80));
  
  try {
    // Find CYRINE CHOUK
    const cyrine = await prisma.user.findFirst({
      where: { 
        fullName: { contains: 'CYRINE', mode: 'insensitive' },
        role: 'GESTIONNAIRE_SENIOR'
      }
    });
    
    if (!cyrine) {
      console.log('❌ CYRINE CHOUK not found');
      return;
    }
    
    console.log(`✅ Found: ${cyrine.fullName}`);
    console.log(`   ID: ${cyrine.id}`);
    console.log(`   Email: ${cyrine.email}`);
    console.log(`   Role: ${cyrine.role}\n`);
    
    // Find bordereaux via contract.teamLeaderId
    const bordereaux = await prisma.bordereau.findMany({
      where: {
        archived: false,
        contract: {
          teamLeaderId: cyrine.id
        }
      },
      include: {
        client: { select: { name: true } },
        contract: { select: { id: true, clientName: true } },
        documents: {
          select: { 
            id: true, 
            name: true, 
            status: true,
            type: true
          }
        }
      },
      orderBy: { dateReception: 'desc' }
    });
    
    console.log(`📦 BORDEREAUX: ${bordereaux.length} total\n`);
    
    let totalDocs = 0;
    let traitesDocs = 0;
    let enCoursDocs = 0;
    let nouveauDocs = 0;
    
    bordereaux.forEach((b, idx) => {
      const docs = b.documents || [];
      const traites = docs.filter(d => d.status === 'TRAITE').length;
      const enCours = docs.filter(d => d.status === 'EN_COURS').length;
      const nouveau = docs.filter(d => !d.status || d.status === 'UPLOADED').length;
      
      totalDocs += docs.length;
      traitesDocs += traites;
      enCoursDocs += enCours;
      nouveauDocs += nouveau;
      
      console.log(`${idx + 1}. ${b.reference} (${b.client?.name || 'N/A'})`);
      console.log(`   Status: ${b.statut}`);
      console.log(`   Documents: ${docs.length} total`);
      console.log(`   - TRAITE: ${traites}`);
      console.log(`   - EN_COURS: ${enCours}`);
      console.log(`   - NOUVEAU/UPLOADED: ${nouveau}`);
      console.log(`   Date: ${b.dateReception.toISOString().split('T')[0]}\n`);
    });
    
    console.log('='.repeat(80));
    console.log('📊 SUMMARY:');
    console.log(`   Total Bordereaux: ${bordereaux.length}`);
    console.log(`   Total Documents: ${totalDocs}`);
    console.log(`   - Traités: ${traitesDocs}`);
    console.log(`   - En cours: ${enCoursDocs}`);
    console.log(`   - Nouveau: ${nouveauDocs}`);
    console.log('='.repeat(80));
    
    // Check what the corbeille endpoint would return
    console.log('\n🔍 CORBEILLE QUERY SIMULATION:\n');
    
    const enCoursQuery = await prisma.bordereau.findMany({
      where: {
        archived: false,
        contract: { teamLeaderId: cyrine.id },
        statut: { notIn: ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'] }
      },
      select: { id: true, reference: true, statut: true }
    });
    
    const traitesQuery = await prisma.bordereau.findMany({
      where: {
        archived: false,
        contract: { teamLeaderId: cyrine.id },
        statut: { in: ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'] },
        updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      },
      select: { id: true, reference: true, statut: true }
    });
    
    console.log(`EN_COURS (not TRAITE/CLOTURE): ${enCoursQuery.length}`);
    enCoursQuery.forEach(b => console.log(`   - ${b.reference}: ${b.statut}`));
    
    console.log(`\nTRAITES (last 7 days): ${traitesQuery.length}`);
    traitesQuery.forEach(b => console.log(`   - ${b.reference}: ${b.statut}`));
    
    console.log('\n✅ INSPECTION COMPLETE\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

inspectCyrineSenior();
