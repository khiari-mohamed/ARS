const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkChefEquipeAssignments() {
  try {
    console.log('🔍 Analyzing Chef d\'Équipe assignments...\n');

    // Get all users with CHEF_EQUIPE role
    const chefEquipes = await prisma.user.findMany({
      where: { role: 'CHEF_EQUIPE' },
      select: {
        id: true,
        fullName: true,
        email: true,
        active: true
      }
    });

    console.log(`📊 Found ${chefEquipes.length} Chef d'Équipe users:`);
    chefEquipes.forEach((chef, index) => {
      console.log(`${index + 1}. ${chef.fullName} (${chef.email}) - ${chef.active ? 'Active' : 'Inactive'}`);
    });
    console.log('');

    // Check contracts assigned to each chef
    for (const chef of chefEquipes) {
      console.log(`\n🎯 Analyzing assignments for: ${chef.fullName}`);
      console.log('=' .repeat(50));

      // Get contracts assigned to this chef
      const contracts = await prisma.contract.findMany({
        where: { teamLeaderId: chef.id },
        include: {
          client: { select: { name: true } },
          assignedManager: { select: { fullName: true } }
        }
      });

      console.log(`📋 Contracts assigned: ${contracts.length}`);
      
      if (contracts.length > 0) {
        contracts.forEach((contract, index) => {
          console.log(`  ${index + 1}. Client: ${contract.client.name}`);
          console.log(`     Contract ID: ${contract.id}`);
          console.log(`     Manager: ${contract.assignedManager.fullName}`);
          console.log(`     Period: ${contract.startDate.toISOString().split('T')[0]} to ${contract.endDate.toISOString().split('T')[0]}`);
          console.log('');
        });

        // Get bordereaux for these contracts
        const bordereaux = await prisma.bordereau.findMany({
          where: {
            contract: {
              teamLeaderId: chef.id
            },
            archived: false
          },
          include: {
            client: { select: { name: true } },
            contract: { select: { clientName: true } }
          }
        });

        console.log(`📄 Bordereaux accessible: ${bordereaux.length}`);
        
        // Group by status
        const statusCounts = {};
        bordereaux.forEach(b => {
          statusCounts[b.statut] = (statusCounts[b.statut] || 0) + 1;
        });

        console.log('📊 Bordereau status breakdown:');
        Object.entries(statusCounts).forEach(([status, count]) => {
          console.log(`  - ${status}: ${count}`);
        });

        // Get documents for these bordereaux
        const documents = await prisma.document.findMany({
          where: {
            bordereau: {
              contract: {
                teamLeaderId: chef.id
              },
              archived: false
            }
          }
        });

        console.log(`📑 Documents accessible: ${documents.length}`);

        // Group documents by type
        const docTypeCounts = {};
        documents.forEach(d => {
          docTypeCounts[d.type] = (docTypeCounts[d.type] || 0) + 1;
        });

        console.log('📊 Document type breakdown:');
        Object.entries(docTypeCounts).forEach(([type, count]) => {
          console.log(`  - ${type}: ${count}`);
        });

      } else {
        console.log('❌ No contracts assigned to this chef d\'équipe');
      }
    }

    // Check for contracts without team leader
    console.log('\n\n🔍 Checking contracts without team leader assignment...');
    const unassignedContracts = await prisma.contract.findMany({
      where: { teamLeaderId: null },
      include: {
        client: { select: { name: true } },
        assignedManager: { select: { fullName: true } }
      }
    });

    console.log(`📋 Contracts without team leader: ${unassignedContracts.length}`);
    
    if (unassignedContracts.length > 0) {
      unassignedContracts.forEach((contract, index) => {
        console.log(`  ${index + 1}. Client: ${contract.client.name} (Manager: ${contract.assignedManager.fullName})`);
      });
    }

    // Summary
    console.log('\n\n📊 SUMMARY:');
    console.log('=' .repeat(50));
    console.log(`Total Chef d'Équipe users: ${chefEquipes.length}`);
    console.log(`Active Chef d'Équipe users: ${chefEquipes.filter(c => c.active).length}`);
    console.log(`Contracts without team leader: ${unassignedContracts.length}`);
    
    const totalAssignedContracts = await prisma.contract.count({
      where: { teamLeaderId: { not: null } }
    });
    console.log(`Contracts with team leader assigned: ${totalAssignedContracts}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkChefEquipeAssignments();