import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTeamWorkload() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEAM WORKLOAD ANALYSIS');
  console.log('='.repeat(80));

  // Get Chef d'équipe teams
  const chefEquipes = await prisma.user.findMany({
    where: { role: 'CHEF_EQUIPE', active: true },
    include: {
      teamMembers: {
        where: { active: true },
        include: {
          ownerBulletinSoins: {
            where: { etat: { in: ['IN_PROGRESS', 'ASSIGNED'] } }
          }
        }
      },
      ownerBulletinSoins: {
        where: { etat: { in: ['IN_PROGRESS', 'ASSIGNED'] } }
      }
    }
  });

  // Get individual teams
  const individualTeams = await prisma.user.findMany({
    where: {
      role: { in: ['GESTIONNAIRE_SENIOR', 'RESPONSABLE_DEPARTEMENT'] },
      active: true
    },
    include: {
      ownerBulletinSoins: {
        where: { etat: { in: ['IN_PROGRESS', 'ASSIGNED'] } }
      }
    }
  });

  let overloadedCount = 0;
  let busyCount = 0;
  let normalCount = 0;

  console.log(`\n🏢 CHEF D'ÉQUIPE TEAMS:\n`);
  
  for (const chef of chefEquipes) {
    const chefWorkload = chef.ownerBulletinSoins.length;
    const membersWorkload = chef.teamMembers.reduce((sum, m) => sum + m.ownerBulletinSoins.length, 0);
    const totalWorkload = chefWorkload + membersWorkload;
    const totalCapacity = chef.capacity + chef.teamMembers.reduce((sum, m) => sum + m.capacity, 0);
    const utilization = totalCapacity > 0 ? Math.round((totalWorkload / totalCapacity) * 100) : 0;
    
    let status = '🟢 NORMAL';
    if (utilization >= 90) {
      status = '🔴 OVERLOADED';
      overloadedCount++;
    } else if (utilization >= 70) {
      status = '🟠 BUSY';
      busyCount++;
    } else {
      normalCount++;
    }

    console.log(`Team: ${chef.fullName}`);
    console.log(`├─ Chef Workload: ${chefWorkload} BS`);
    console.log(`├─ Members Workload: ${membersWorkload} BS (${chef.teamMembers.length} members)`);
    console.log(`├─ Total Workload: ${totalWorkload} BS`);
    console.log(`├─ Total Capacity: ${totalCapacity}`);
    console.log(`├─ Utilization: ${utilization}%`);
    console.log(`└─ Status: ${status}\n`);
  }

  console.log(`👤 INDIVIDUAL TEAMS:\n`);
  
  for (const user of individualTeams) {
    const workload = user.ownerBulletinSoins.length;
    const utilization = user.capacity > 0 ? Math.round((workload / user.capacity) * 100) : 0;
    
    let status = '🟢 NORMAL';
    if (utilization >= 90) {
      status = '🔴 OVERLOADED';
      overloadedCount++;
    } else if (utilization >= 70) {
      status = '🟠 BUSY';
      busyCount++;
    } else {
      normalCount++;
    }

    console.log(`${user.fullName} (${user.role})`);
    console.log(`├─ Workload: ${workload} BS`);
    console.log(`├─ Capacity: ${user.capacity}`);
    console.log(`├─ Utilization: ${utilization}%`);
    console.log(`└─ Status: ${status}\n`);
  }

  const totalTeams = chefEquipes.length + individualTeams.length;

  console.log('='.repeat(80));
  console.log('📈 SUMMARY:');
  console.log('='.repeat(80));
  console.log(`Total Teams: ${totalTeams}`);
  console.log(`🔴 Overloaded (≥90%): ${overloadedCount}`);
  console.log(`🟠 Busy (70-89%): ${busyCount}`);
  console.log(`🟢 Normal (<70%): ${normalCount}`);
  console.log('='.repeat(80) + '\n');

  await prisma.$disconnect();
}

checkTeamWorkload().catch(console.error);
