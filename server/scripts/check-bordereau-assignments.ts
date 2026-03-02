import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBordereauAssignments() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 BORDEREAU ASSIGNMENT VERIFICATION');
  
  // Get all active users
  const users = await prisma.user.findMany({
    where: { active: true },
    orderBy: { fullName: 'asc' }
  });

  console.log(`📋 Total Active Users: ${users.length}\n`);

  // Get CHEF_EQUIPE teams
  const chefEquipes = users.filter(u => u.role === 'CHEF_EQUIPE');
  
  console.log('🏢 CHEF D\'ÉQUIPE TEAMS:\n');
  
  for (const chef of chefEquipes) {
    // Get team members
    const members = await prisma.user.findMany({
      where: { 
        teamLeaderId: chef.id,
        active: true
      }
    });

    // Get chef's bordereaux
    const chefBordereaux = await prisma.bordereau.count({
      where: { assignedToUserId: chef.id }
    });

    // Get all members' bordereaux
    let totalMembersBordereaux = 0;
    const memberDetails: string[] = [];
    
    for (const member of members) {
      const count = await prisma.bordereau.count({
        where: { assignedToUserId: member.id }
      });
      totalMembersBordereaux += count;
      if (count > 0) {
        memberDetails.push(`  │ ├─ ${member.fullName}: ${count} bordereaux`);
      }
    }

    const totalBordereaux = chefBordereaux + totalMembersBordereaux;
    const capacity = chef.capacity || 400;
    const utilization = capacity > 0 ? Math.round((totalBordereaux / capacity) * 100) : 0;
    
    let status = '🟢 NORMAL';
    if (utilization >= 90) status = '🔴 OVERLOADED';
    else if (utilization >= 70) status = '🟠 BUSY';

    console.log(`Team: ${chef.fullName}`);
    console.log(`├─ Chef Bordereaux: ${chefBordereaux}`);
    console.log(`├─ Members: ${members.length}`);
    if (memberDetails.length > 0) {
      memberDetails.forEach(detail => console.log(detail));
    }
    console.log(`├─ Total Bordereaux: ${totalBordereaux}`);
    console.log(`├─ Total Capacity: ${capacity}`);
    console.log(`├─ Utilization: ${utilization}%`);
    console.log(`└─ Status: ${status}\n`);
  }

  // Get GESTIONNAIRE_SENIOR users
  const seniors = users.filter(u => u.role === 'GESTIONNAIRE_SENIOR');
  
  console.log('👤 INDIVIDUAL TEAMS (GESTIONNAIRE_SENIOR):\n');
  
  for (const senior of seniors) {
    const bordereaux = await prisma.bordereau.count({
      where: { assignedToUserId: senior.id }
    });

    const capacity = senior.capacity || 50;
    const utilization = capacity > 0 ? Math.round((bordereaux / capacity) * 100) : 0;
    
    let status = '🟢 NORMAL';
    if (utilization >= 90) status = '🔴 OVERLOADED';
    else if (utilization >= 70) status = '🟠 BUSY';

    console.log(`${senior.fullName} (GESTIONNAIRE_SENIOR)`);
    console.log(`├─ Bordereaux: ${bordereaux}`);
    console.log(`├─ Capacity: ${capacity}`);
    console.log(`├─ Utilization: ${utilization}%`);
    console.log(`└─ Status: ${status}\n`);
  }

  // Get RESPONSABLE_DEPARTEMENT users
  const responsables = users.filter(u => u.role === 'RESPONSABLE_DEPARTEMENT');
  
  console.log('👤 RESPONSABLE_DEPARTEMENT:\n');
  
  for (const resp of responsables) {
    const bordereaux = await prisma.bordereau.count({
      where: { assignedToUserId: resp.id }
    });

    const capacity = resp.capacity || 20;
    const utilization = capacity > 0 ? Math.round((bordereaux / capacity) * 100) : 0;
    
    let status = '🟢 NORMAL';
    if (utilization >= 90) status = '🔴 OVERLOADED';
    else if (utilization >= 70) status = '🟠 BUSY';

    console.log(`${resp.fullName} (RESPONSABLE_DEPARTEMENT)`);
    console.log(`├─ Bordereaux: ${bordereaux}`);
    console.log(`├─ Capacity: ${capacity}`);
    console.log(`├─ Utilization: ${utilization}%`);
    console.log(`└─ Status: ${status}\n`);
  }

  // Get OTHER USERS with bordereaux
  const otherUsers = users.filter(u => 
    !['CHEF_EQUIPE', 'GESTIONNAIRE_SENIOR', 'RESPONSABLE_DEPARTEMENT'].includes(u.role)
  );
  
  console.log('👥 OTHER USERS WITH BORDEREAUX:\n');
  
  for (const user of otherUsers) {
    const bordereaux = await prisma.bordereau.count({
      where: { assignedToUserId: user.id }
    });

    if (bordereaux > 0) {
      console.log(`${user.fullName} (${user.role}): ${bordereaux} bordereaux`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📄 BORDEREAU STATUS BREAKDOWN\n');
  
  const statusCounts = await prisma.bordereau.groupBy({
    by: ['statut'],
    _count: { statut: true }
  });

  statusCounts.forEach(({ statut, _count }) => {
    console.log(`${statut}: ${_count.statut} bordereaux`);
  });

  const totalBordereaux = await prisma.bordereau.count();
  const assignedBordereaux = await prisma.bordereau.count({
    where: { assignedToUserId: { not: null } }
  });

  console.log(`\nTOTAL: ${totalBordereaux} bordereaux`);
  console.log(`ASSIGNED: ${assignedBordereaux} bordereaux`);
  console.log(`UNASSIGNED: ${totalBordereaux - assignedBordereaux} bordereaux`);

  console.log('\n' + '='.repeat(80));
}

checkBordereauAssignments()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
