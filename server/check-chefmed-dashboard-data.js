const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkChefMedDashboardData() {
  console.log('🔍 Checking Chef Med dashboard data...\n');
  
  try {
    // Get chefmed user
    const chefmed = await prisma.user.findFirst({
      where: { email: 'chef@mail.com' },
      select: { id: true, fullName: true, email: true, role: true }
    });
    
    if (!chefmed) {
      console.log('❌ Chef Med not found');
      return;
    }
    
    console.log('👨💼 Chef Med:', chefmed.fullName, `(${chefmed.email})`);
    console.log('🆔 ID:', chefmed.id);
    console.log('🎭 Role:', chefmed.role);
    
    // Get contracts assigned to chefmed
    const contracts = await prisma.contract.findMany({
      where: { teamLeaderId: chefmed.id },
      include: { client: true }
    });
    
    console.log('\n📄 Contracts assigned to Chef Med:');
    contracts.forEach(contract => {
      console.log(`  - ${contract.client.name} (Contract ID: ${contract.id})`);
    });
    
    // Get gestionnaires in chefmed's team
    const gestionnaires = await prisma.user.findMany({
      where: { 
        role: 'GESTIONNAIRE',
        teamLeaderId: chefmed.id
      },
      select: { id: true, fullName: true, email: true }
    });
    
    console.log('\n👥 Gestionnaires in Chef Med team:');
    gestionnaires.forEach(gest => {
      console.log(`  - ${gest.fullName} (${gest.email})`);
    });
    
    // Get all bordereaux from chefmed's contracts
    const allBordereaux = await prisma.bordereau.findMany({
      where: {
        archived: false,
        contract: {
          teamLeaderId: chefmed.id
        }
      },
      include: {
        client: true,
        contract: true,
        currentHandler: { select: { fullName: true } }
      },
      orderBy: { dateReception: 'desc' }
    });
    
    console.log('\n📋 All bordereaux for Chef Med contracts:');
    console.log(`Total: ${allBordereaux.length}`);
    
    // Group by status
    const statusGroups = {};
    allBordereaux.forEach(b => {
      if (!statusGroups[b.statut]) statusGroups[b.statut] = [];
      statusGroups[b.statut].push(b);
    });
    
    console.log('\n📊 Bordereaux by status:');
    Object.keys(statusGroups).forEach(status => {
      console.log(`  ${status}: ${statusGroups[status].length}`);
      statusGroups[status].forEach(b => {
        console.log(`    - ${b.reference} (${b.client.name}) - Assigned to: ${b.currentHandler?.fullName || 'Unassigned'}`);
      });
    });
    
    // Calculate dashboard stats
    const nonAffectes = allBordereaux.filter(b => 
      ['SCANNE', 'A_AFFECTER'].includes(b.statut) && !b.assignedToUserId
    );
    
    const enCours = allBordereaux.filter(b => 
      ['ASSIGNE', 'EN_COURS'].includes(b.statut) && b.assignedToUserId
    );
    
    const traites = allBordereaux.filter(b => 
      ['TRAITE', 'CLOTURE'].includes(b.statut)
    );
    
    console.log('\n🎯 Expected Dashboard Stats for Chef Med:');
    console.log(`📋 Non affectés: ${nonAffectes.length}`);
    console.log(`⏳ En cours: ${enCours.length}`);
    console.log(`✅ Traités: ${traites.length}`);
    console.log(`👥 Gestionnaires: ${gestionnaires.length}`);
    
    console.log('\n📋 Non affectés details:');
    nonAffectes.forEach(b => {
      console.log(`  - ${b.reference} (${b.client.name}) - Status: ${b.statut}`);
    });
    
    console.log('\n⏳ En cours details:');
    enCours.forEach(b => {
      console.log(`  - ${b.reference} (${b.client.name}) - Status: ${b.statut} - Assigned to: ${b.currentHandler?.fullName || 'Unknown'}`);
    });
    
    console.log('\n✅ Traités details:');
    traites.forEach(b => {
      console.log(`  - ${b.reference} (${b.client.name}) - Status: ${b.statut}`);
    });
    
    // Check for any bordereaux from other clients (should be 0)
    const otherClientBordereaux = await prisma.bordereau.findMany({
      where: {
        archived: false,
        OR: [
          { contract: null },
          { contract: { teamLeaderId: { not: chefmed.id } } }
        ]
      },
      include: { client: true }
    });
    
    console.log('\n🚫 Bordereaux NOT belonging to Chef Med (should be empty):');
    if (otherClientBordereaux.length === 0) {
      console.log('  ✅ None found - filtering is working correctly!');
    } else {
      console.log(`  ❌ Found ${otherClientBordereaux.length} bordereaux that should NOT be visible:`);
      otherClientBordereaux.forEach(b => {
        console.log(`    - ${b.reference} (${b.client.name})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkChefMedDashboardData();