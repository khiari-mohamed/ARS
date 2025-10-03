const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkChefTeamData() {
  console.log('🔍 Checking Chef d\'équipe team data and bordereaux assignments...\n');

  try {
    // 1. Get all Chef d'équipes
    const chefs = await prisma.user.findMany({
      where: { role: 'CHEF_EQUIPE' },
      select: {
        id: true,
        fullName: true,
        email: true
      }
    });

    console.log(`📋 Found ${chefs.length} Chef d'équipes:`);
    chefs.forEach(chef => {
      console.log(`  - ${chef.fullName} (${chef.email}) ID: ${chef.id}`);
    });
    console.log('');

    // 2. For each chef, get their team gestionnaires
    for (const chef of chefs) {
      console.log(`👥 Team for ${chef.fullName}:`);
      
      const teamGestionnaires = await prisma.user.findMany({
        where: {
          role: 'GESTIONNAIRE',
          teamLeaderId: chef.id,
          active: true
        },
        select: {
          id: true,
          fullName: true,
          email: true
        }
      });

      if (teamGestionnaires.length === 0) {
        console.log(`  ❌ No gestionnaires assigned to ${chef.fullName}`);
      } else {
        console.log(`  ✅ ${teamGestionnaires.length} gestionnaire(s):`);
        teamGestionnaires.forEach(gest => {
          console.log(`    - ${gest.fullName} (${gest.email}) ID: ${gest.id}`);
        });
      }
      console.log('');
    }

    // 3. Get all bordereaux and their assignments
    console.log('📄 Bordereaux assignments:');
    const bordereaux = await prisma.bordereau.findMany({
      where: { archived: false },
      include: {
        client: { select: { name: true } },
        currentHandler: { 
          select: { 
            id: true, 
            fullName: true, 
            role: true,
            teamLeaderId: true
          } 
        }
      },
      orderBy: { dateReception: 'desc' },
      take: 20
    });

    console.log(`Found ${bordereaux.length} recent bordereaux:`);
    bordereaux.forEach(bordereau => {
      const assignedTo = bordereau.currentHandler;
      let assignmentInfo = 'Unassigned';
      
      if (assignedTo) {
        assignmentInfo = `${assignedTo.fullName} (${assignedTo.role})`;
        if (assignedTo.teamLeaderId) {
          const chef = chefs.find(c => c.id === assignedTo.teamLeaderId);
          if (chef) {
            assignmentInfo += ` -> Chef: ${chef.fullName}`;
          }
        }
      }
      
      console.log(`  📋 ${bordereau.reference} (${bordereau.client?.name || 'No client'}) -> ${assignmentInfo}`);
    });
    console.log('');

    // 4. Check specific chef "chefmed" data
    const chefmed = await prisma.user.findFirst({
      where: { 
        OR: [
          { fullName: { contains: 'chefmed', mode: 'insensitive' } },
          { email: { contains: 'chef@mail.com', mode: 'insensitive' } }
        ]
      }
    });

    if (chefmed) {
      console.log(`🎯 Specific analysis for chefmed (${chefmed.fullName}):`);
      console.log(`   ID: ${chefmed.id}`);
      console.log(`   Email: ${chefmed.email}`);
      
      // Get chefmed's team
      const chefmedTeam = await prisma.user.findMany({
        where: {
          role: 'GESTIONNAIRE',
          teamLeaderId: chefmed.id,
          active: true
        }
      });
      
      console.log(`   Team size: ${chefmedTeam.length}`);
      chefmedTeam.forEach(member => {
        console.log(`     - ${member.fullName} (${member.email})`);
      });
      
      // Get bordereaux that should be visible to chefmed
      const teamMemberIds = chefmedTeam.map(m => m.id);
      const chefmedBordereaux = await prisma.bordereau.findMany({
        where: {
          archived: false,
          OR: [
            { assignedToUserId: null }, // Unassigned
            { assignedToUserId: { in: teamMemberIds } } // Assigned to team members
          ]
        },
        include: {
          client: { select: { name: true } },
          currentHandler: { select: { fullName: true } }
        }
      });
      
      console.log(`   Should see ${chefmedBordereaux.length} bordereaux:`);
      chefmedBordereaux.forEach(b => {
        const assignment = b.currentHandler ? b.currentHandler.fullName : 'Unassigned';
        console.log(`     - ${b.reference} (${b.client?.name}) -> ${assignment}`);
      });
      
      // Check if "samir" bordereau is in the list
      const samirBordereau = chefmedBordereaux.find(b => 
        b.client?.name?.toLowerCase().includes('samir') || 
        b.reference?.toLowerCase().includes('samir')
      );
      
      if (samirBordereau) {
        console.log(`   ❌ PROBLEM: chefmed can see samir bordereau: ${samirBordereau.reference}`);
        console.log(`       Assigned to: ${samirBordereau.currentHandler?.fullName || 'Unassigned'}`);
      } else {
        console.log(`   ✅ Good: chefmed cannot see samir bordereau`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkChefTeamData();