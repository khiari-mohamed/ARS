const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkGestionnaireData() {
  console.log('🔍 CHECKING GESTIONNAIRE DATA FOR RETOURNE/REJETE');
  console.log('=================================================\n');

  try {
    // Find gestionnaire user
    const gestionnaire = await prisma.user.findFirst({
      where: { 
        role: 'GESTIONNAIRE',
        email: 'gestion@mail.com'
      }
    });
    
    if (!gestionnaire) {
      console.log('❌ Gestionnaire not found');
      return;
    }
    
    console.log(`👤 Gestionnaire: ${gestionnaire.fullName} (${gestionnaire.id})\n`);
    
    // Check what fetchUserBordereaux would return
    console.log('📋 BORDEREAUX from fetchUserBordereaux endpoint:');
    const userBordereaux = await prisma.bordereau.findMany({
      where: {
        assignedToUserId: gestionnaire.id
      },
      include: {
        client: true
      }
    });
    
    console.log(`Found ${userBordereaux.length} bordereaux assigned to gestionnaire:`);
    userBordereaux.forEach(b => {
      console.log(`  ${b.reference}: ${b.statut} (client: ${b.client?.name || 'N/A'})`);
    });
    
    // Count by status
    const statusCounts = {
      EN_COURS: userBordereaux.filter(b => b.statut === 'EN_COURS').length,
      ASSIGNE: userBordereaux.filter(b => b.statut === 'ASSIGNE').length,
      TRAITE: userBordereaux.filter(b => b.statut === 'TRAITE').length,
      CLOTURE: userBordereaux.filter(b => b.statut === 'CLOTURE').length,
      REJETE: userBordereaux.filter(b => b.statut === 'REJETE').length,
      RETOURNE: userBordereaux.filter(b => b.statut === 'RETOURNE').length
    };
    
    console.log('\n📊 STATUS COUNTS:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      if (count > 0) {
        console.log(`  ${status}: ${count}`);
      }
    });
    
    // Check what the frontend calculations would show
    const enCours = userBordereaux.filter(b => ['EN_COURS', 'ASSIGNE'].includes(b.statut)).length;
    const traites = userBordereaux.filter(b => ['TRAITE', 'CLOTURE'].includes(b.statut)).length;
    const retournes = userBordereaux.filter(b => b.statut === 'REJETE' || b.statut === 'RETOURNE').length;
    
    console.log('\n🎯 FRONTEND CALCULATIONS:');
    console.log(`  Total assignés: ${userBordereaux.length}`);
    console.log(`  En cours (EN_COURS + ASSIGNE): ${enCours}`);
    console.log(`  Traités (TRAITE + CLOTURE): ${traites}`);
    console.log(`  Retournés (REJETE + RETOURNE): ${retournes}`);
    
    // Check if there are any bordereaux with RETOURNE status anywhere
    console.log('\n🔍 ALL BORDEREAUX WITH RETOURNE STATUS:');
    const allRetourne = await prisma.bordereau.findMany({
      where: { statut: 'RETOURNE' },
      include: { client: true }
    });
    
    console.log(`Found ${allRetourne.length} bordereaux with RETOURNE status globally:`);
    allRetourne.forEach(b => {
      console.log(`  ${b.reference}: assigned to ${b.assignedToUserId || 'none'}`);
    });
    
    // Test the API endpoint directly
    console.log('\n🌐 TESTING API ENDPOINT:');
    console.log(`Testing: /bordereaux/inbox/user/${gestionnaire.id}`);
    
    // Simulate the API call
    const apiResult = await prisma.bordereau.findMany({
      where: {
        OR: [
          { assignedToUserId: gestionnaire.id },
          { currentHandlerId: gestionnaire.id }
        ]
      },
      include: {
        client: true,
        documents: true
      }
    });
    
    console.log(`API would return ${apiResult.length} bordereaux:`);
    apiResult.forEach(b => {
      console.log(`  ${b.reference}: ${b.statut} (assigned: ${b.assignedToUserId === gestionnaire.id ? 'YES' : 'NO'}, handler: ${b.currentHandlerId === gestionnaire.id ? 'YES' : 'NO'})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGestionnaireData();