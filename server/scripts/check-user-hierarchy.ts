import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserHierarchy() {
  console.log('\n' + '='.repeat(80));
  console.log('👥 USER HIERARCHY REPORT');
  console.log('='.repeat(80));

  const allUsers = await prisma.user.findMany({
    where: { active: true },
    include: {
      teamLeader: { select: { id: true, fullName: true, role: true } },
      teamMembers: { 
        where: { active: true }, 
        select: { id: true, fullName: true, role: true, capacity: true } 
      }
    },
    orderBy: { role: 'asc' }
  });

  // Group by role
  const byRole: Record<string, any[]> = {};
  allUsers.forEach(user => {
    if (!byRole[user.role]) byRole[user.role] = [];
    byRole[user.role].push(user);
  });

  console.log(`\n📊 SUMMARY:`);
  console.log(`   Total Users: ${allUsers.length}`);
  console.log(`   Active Users: ${allUsers.filter(u => u.active).length}`);

  console.log(`\n📋 BY ROLE:`);
  Object.keys(byRole).sort().forEach(role => {
    console.log(`   ${role}: ${byRole[role].length} users`);
  });

  // Build team structures
  console.log(`\n🏢 TEAM STRUCTURES:`);
  
  const chefEquipes = allUsers.filter(u => u.role === 'CHEF_EQUIPE');
  console.log(`\n   Chef d'Équipe Teams: ${chefEquipes.length}`);
  
  chefEquipes.forEach((chef, idx) => {
    const totalCapacity = chef.capacity + chef.teamMembers.reduce((sum, m) => sum + m.capacity, 0);
    console.log(`\n   Team ${idx + 1}: ${chef.fullName}`);
    console.log(`   ├─ Role: CHEF_EQUIPE`);
    console.log(`   ├─ Capacity: ${chef.capacity}`);
    console.log(`   ├─ Team Size: ${chef.teamMembers.length + 1} (1 chef + ${chef.teamMembers.length} members)`);
    console.log(`   ├─ Total Team Capacity: ${totalCapacity}`);
    
    if (chef.teamMembers.length > 0) {
      console.log(`   └─ Members:`);
      chef.teamMembers.forEach((member, i) => {
        const prefix = i === chef.teamMembers.length - 1 ? '      └─' : '      ├─';
        console.log(`${prefix} ${member.fullName} (${member.role}) - Capacity: ${member.capacity}`);
      });
    } else {
      console.log(`   └─ No members assigned`);
    }
  });

  // Individual teams
  const individualTeams = allUsers.filter(u => 
    ['GESTIONNAIRE_SENIOR', 'RESPONSABLE_DEPARTEMENT'].includes(u.role)
  );
  
  if (individualTeams.length > 0) {
    console.log(`\n   Individual Teams: ${individualTeams.length}`);
    individualTeams.forEach((user, idx) => {
      console.log(`\n   Individual Team ${idx + 1}: ${user.fullName}`);
      console.log(`   ├─ Role: ${user.role}`);
      console.log(`   └─ Capacity: ${user.capacity}`);
    });
  }

  // Orphaned gestionnaires
  const orphaned = allUsers.filter(u => u.role === 'GESTIONNAIRE' && !u.teamLeaderId);
  
  if (orphaned.length > 0) {
    console.log(`\n⚠️  ORPHANED GESTIONNAIRES (No Team Leader): ${orphaned.length}`);
    orphaned.forEach(g => {
      console.log(`   ⚠️  ${g.fullName} (ID: ${g.id}, Capacity: ${g.capacity})`);
    });
  }

  // Calculate total teams
  const totalTeams = chefEquipes.length + individualTeams.length;
  console.log(`\n📈 TEAM COUNT CALCULATION:`);
  console.log(`   Chef d'Équipe Teams: ${chefEquipes.length}`);
  console.log(`   Individual Teams (GESTIONNAIRE_SENIOR + RESPONSABLE_DEPARTEMENT): ${individualTeams.length}`);
  console.log(`   ─────────────────────────────────`);
  console.log(`   TOTAL TEAMS: ${totalTeams}`);

  console.log('\n' + '='.repeat(80) + '\n');

  await prisma.$disconnect();
}

checkUserHierarchy().catch(console.error);
