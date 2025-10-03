const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixContractAssignments() {
  console.log('🔧 Fixing contract assignments...');
  
  try {
    // Get all chef d'équipes
    const chefs = await prisma.user.findMany({
      where: { role: 'CHEF_EQUIPE' },
      select: { id: true, fullName: true, email: true }
    });
    
    console.log('👨‍💼 Found chef d\'équipes:', chefs.map(c => `${c.fullName} (${c.email})`));
    
    // Get all contracts without team leaders
    const unassignedContracts = await prisma.contract.findMany({
      where: { teamLeaderId: null },
      include: { client: true }
    });
    
    console.log('📄 Unassigned contracts:', unassignedContracts.map(c => `${c.client.name} - Contract ${c.id}`));
    
    if (unassignedContracts.length > 0 && chefs.length > 1) {
      // Assign the "samir" client contract to the second chef (chefnonatf)
      const samirContract = unassignedContracts.find(c => c.client.name === 'samir');
      const secondChef = chefs.find(c => c.email === 'chefg5@mail.com'); // chefnonatf
      
      if (samirContract && secondChef) {
        await prisma.contract.update({
          where: { id: samirContract.id },
          data: { teamLeaderId: secondChef.id }
        });
        
        console.log(`✅ Assigned "${samirContract.client.name}" contract to ${secondChef.fullName}`);
      }
    }
    
    // Verify the assignments
    const allContracts = await prisma.contract.findMany({
      include: { 
        client: true,
        teamLeader: { select: { fullName: true, email: true } }
      }
    });
    
    console.log('\n📋 Final contract assignments:');
    allContracts.forEach(contract => {
      console.log(`  - ${contract.client.name}: ${contract.teamLeader?.fullName || 'UNASSIGNED'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixContractAssignments();