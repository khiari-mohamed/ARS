const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGestionnairePerformance() {
  console.log('=== Checking Gestionnaire Performance Data ===\n');
  
  // Get all gestionnaires
  const gestionnaires = await prisma.user.findMany({
    where: {
      role: { in: ['GESTIONNAIRE', 'GESTIONNAIRE_SENIOR', 'CHEF_EQUIPE'] },
      active: true
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      teamLeaderId: true
    },
    orderBy: { fullName: 'asc' }
  });
  
  console.log(`Found ${gestionnaires.length} gestionnaires:\n`);
  
  for (const gest of gestionnaires) {
    console.log(`\n--- ${gest.fullName || gest.email} (${gest.role}) ---`);
    console.log(`ID: ${gest.id}`);
    console.log(`Team Leader ID: ${gest.teamLeaderId || 'None'}`);
    
    // Count documents assigned to this user
    const docCount = await prisma.document.count({
      where: { assignedToUserId: gest.id }
    });
    
    console.log(`Documents assigned: ${docCount}`);
    
    // Count bordereaux assigned to this user
    const bordCount = await prisma.bordereau.count({
      where: { assignedToUserId: gest.id }
    });
    
    console.log(`Bordereaux assigned: ${bordCount}`);
    
    // If senior/chef, check team members
    if (gest.role === 'GESTIONNAIRE_SENIOR' || gest.role === 'CHEF_EQUIPE') {
      const teamMembers = await prisma.user.findMany({
        where: { teamLeaderId: gest.id },
        select: { id: true, fullName: true }
      });
      
      console.log(`Team members: ${teamMembers.length}`);
      if (teamMembers.length > 0) {
        console.log(`Team: ${teamMembers.map(m => m.fullName).join(', ')}`);
        
        const teamDocCount = await prisma.document.count({
          where: { assignedToUserId: { in: teamMembers.map(m => m.id) } }
        });
        console.log(`Team documents: ${teamDocCount}`);
      }
    }
  }
  
  console.log('\n\n=== Document Assignment Summary ===\n');
  
  const docsByUser = await prisma.document.groupBy({
    by: ['assignedToUserId'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } }
  });
  
  for (const doc of docsByUser) {
    if (!doc.assignedToUserId) {
      console.log(`Unassigned: ${doc._count.id} documents`);
      continue;
    }
    
    const user = await prisma.user.findUnique({
      where: { id: doc.assignedToUserId },
      select: { fullName: true, email: true, role: true }
    });
    
    console.log(`${user?.fullName || user?.email || 'Unknown'} (${user?.role}): ${doc._count.id} documents`);
  }
  
  await prisma.$disconnect();
}

checkGestionnairePerformance().catch(console.error);
