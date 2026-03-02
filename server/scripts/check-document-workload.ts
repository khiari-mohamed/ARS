import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDocumentWorkload() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 DOCUMENT WORKLOAD VERIFICATION');
  console.log('='.repeat(80));

  // Get all active users with their assigned documents
  const allUsers = await prisma.user.findMany({
    where: { active: true },
    include: {
      assignedDocuments: true, // ALL documents, no status filter
      teamLeader: {
        select: { fullName: true, role: true }
      },
      teamMembers: {
        where: { active: true },
        include: {
          assignedDocuments: true // ALL documents, no status filter
        }
      }
    },
    orderBy: { role: 'asc' }
  });

  console.log(`\n📋 Total Active Users: ${allUsers.length}\n`);

  // Group by role
  const byRole: Record<string, any[]> = {};
  allUsers.forEach(user => {
    if (!byRole[user.role]) byRole[user.role] = [];
    byRole[user.role].push(user);
  });

  // Check CHEF_EQUIPE teams
  const chefEquipes = allUsers.filter(u => u.role === 'CHEF_EQUIPE');
  
  console.log('🏢 CHEF D\'ÉQUIPE TEAMS:\n');
  for (const chef of chefEquipes) {
    const chefDocs = chef.assignedDocuments.length;
    const membersDocs = chef.teamMembers.reduce((sum, m) => sum + m.assignedDocuments.length, 0);
    const totalDocs = chefDocs + membersDocs;
    const totalCapacity = chef.capacity + chef.teamMembers.reduce((sum, m) => sum + m.capacity, 0);
    const utilization = totalCapacity > 0 ? Math.round((totalDocs / totalCapacity) * 100) : 0;

    console.log(`Team: ${chef.fullName}`);
    console.log(`├─ Chef Documents: ${chefDocs}`);
    console.log(`├─ Members: ${chef.teamMembers.length}`);
    
    chef.teamMembers.forEach((member, idx) => {
      const prefix = idx === chef.teamMembers.length - 1 ? '│  └─' : '│  ├─';
      console.log(`${prefix} ${member.fullName}: ${member.assignedDocuments.length} docs`);
    });
    
    console.log(`├─ Total Documents: ${totalDocs}`);
    console.log(`├─ Total Capacity: ${totalCapacity}`);
    console.log(`├─ Utilization: ${utilization}%`);
    console.log(`└─ Status: ${utilization >= 90 ? '🔴 OVERLOADED' : utilization >= 70 ? '🟠 BUSY' : '🟢 NORMAL'}\n`);
  }

  // Check individual teams
  const individualTeams = allUsers.filter(u => 
    ['GESTIONNAIRE_SENIOR', 'RESPONSABLE_DEPARTEMENT'].includes(u.role)
  );

  console.log('👤 INDIVIDUAL TEAMS:\n');
  for (const user of individualTeams) {
    const docs = user.assignedDocuments.length;
    const utilization = user.capacity > 0 ? Math.round((docs / user.capacity) * 100) : 0;

    console.log(`${user.fullName} (${user.role})`);
    console.log(`├─ Documents: ${docs}`);
    console.log(`├─ Capacity: ${user.capacity}`);
    console.log(`├─ Utilization: ${utilization}%`);
    console.log(`└─ Status: ${utilization >= 90 ? '🔴 OVERLOADED' : utilization >= 70 ? '🟠 BUSY' : '🟢 NORMAL'}\n`);
  }

  // Check all other users
  const otherUsers = allUsers.filter(u => 
    !['CHEF_EQUIPE', 'GESTIONNAIRE_SENIOR', 'RESPONSABLE_DEPARTEMENT'].includes(u.role)
  );

  if (otherUsers.length > 0) {
    console.log('👥 OTHER USERS:\n');
    for (const user of otherUsers) {
      const docs = user.assignedDocuments.length;
      if (docs > 0) {
        console.log(`${user.fullName} (${user.role}): ${docs} documents`);
      }
    }
  }

  // Document status breakdown
  console.log('\n' + '='.repeat(80));
  console.log('📄 DOCUMENT STATUS BREAKDOWN');
  console.log('='.repeat(80) + '\n');

  const docsByStatus = await prisma.document.groupBy({
    by: ['status'],
    _count: { id: true }
  });

  docsByStatus.forEach(group => {
    console.log(`   ${group.status || 'NULL'}: ${group._count.id} documents`);
  });

  const totalDocs = await prisma.document.count();
  const assignedDocs = await prisma.document.count({
    where: { assignedToUserId: { not: null } }
  });

  console.log(`\n   TOTAL: ${totalDocs} documents`);
  console.log(`   ASSIGNED: ${assignedDocs} documents`);

  console.log('\n' + '='.repeat(80) + '\n');

  await prisma.$disconnect();
}

checkDocumentWorkload().catch(console.error);
