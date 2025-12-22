import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBordereauAssignment() {
  console.log('🔍 Checking SGS BR 31-2025 bordereau assignment...\n');

  try {
    const bordereau = await prisma.bordereau.findFirst({
      where: {
        reference: { contains: 'SGS BR 31-2025' }
      },
      include: {
        client: true,
        team: {
          select: {
            id: true,
            fullName: true,
            role: true
          }
        },
        currentHandler: {
          select: {
            id: true,
            fullName: true,
            role: true,
            teamLeaderId: true
          }
        }
      }
    });

    if (!bordereau) {
      console.log('❌ Bordereau not found!');
      return;
    }

    console.log('📋 Bordereau Info:');
    console.log(`  ID: ${bordereau.id}`);
    console.log(`  Reference: ${bordereau.reference}`);
    console.log(`  Status: ${bordereau.statut}`);
    console.log(`  Client: ${bordereau.client?.name || 'N/A'}`);
    console.log(`  Team ID: ${bordereau.teamId || 'N/A'}`);
    console.log(`  Current Handler ID: ${bordereau.currentHandlerId || 'N/A'}\n`);

    console.log('👥 Team Info:');
    if (bordereau.team) {
      console.log(`  Name: ${bordereau.team.fullName}`);
      console.log(`  Role: ${bordereau.team.role}`);
      console.log(`  ID: ${bordereau.team.id}\n`);
    } else {
      console.log('  No team assigned\n');
    }

    console.log('👤 Current Handler Info:');
    if (bordereau.currentHandler) {
      console.log(`  Name: ${bordereau.currentHandler.fullName}`);
      console.log(`  Role: ${bordereau.currentHandler.role}`);
      console.log(`  Team Leader ID: ${bordereau.currentHandler.teamLeaderId || 'N/A'}`);
      console.log(`  ID: ${bordereau.currentHandler.id}`);
      
      // Check if handler belongs to the team
      const belongsToTeam = bordereau.currentHandler.teamLeaderId === bordereau.teamId;
      console.log(`  ✓ Belongs to team: ${belongsToTeam ? 'YES' : 'NO'}`);
      console.log(`  ✓ Is GESTIONNAIRE: ${bordereau.currentHandler.role === 'GESTIONNAIRE' ? 'YES' : 'NO'}\n`);
    } else {
      console.log('  No current handler assigned\n');
    }

    console.log('✅ Analysis complete!');
    
    // Recommendation
    if (bordereau.currentHandler) {
      const shouldShow = bordereau.currentHandler.role === 'GESTIONNAIRE' && 
                        bordereau.currentHandler.teamLeaderId === bordereau.teamId;
      console.log('\n💡 Recommendation:');
      console.log(`  Should show assignedToName: ${shouldShow ? 'YES' : 'NO'}`);
      if (shouldShow) {
        console.log(`  Display: ${bordereau.currentHandler.fullName}`);
      } else {
        console.log(`  Display: Non assigné`);
        console.log(`  Reason: ${bordereau.currentHandler.role !== 'GESTIONNAIRE' ? 'Not a GESTIONNAIRE' : 'teamLeaderId does not match teamId'}`);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBordereauAssignment();
