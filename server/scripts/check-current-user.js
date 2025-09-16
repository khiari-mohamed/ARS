const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCurrentUser() {
  console.log('🔍 Checking current users and reclamations...');

  // Find all users
  const users = await prisma.user.findMany({
    where: { role: 'GESTIONNAIRE' },
    select: { id: true, email: true, fullName: true, role: true }
  });

  console.log('📊 Found gestionnaire users:');
  users.forEach(user => {
    console.log(`   - ${user.fullName} (${user.email}) - ID: ${user.id}`);
  });

  // Check reclamations
  const reclamations = await prisma.reclamation.findMany({
    select: { id: true, assignedToId: true, status: true, description: true }
  });

  console.log(`\n📋 Found ${reclamations.length} total reclamations:`);
  reclamations.forEach(rec => {
    console.log(`   - ${rec.id.substring(0, 8)} assigned to: ${rec.assignedToId || 'NONE'} (${rec.status})`);
  });

  // Assign all reclamations to the first gestionnaire found
  if (users.length > 0) {
    const targetUser = users[0];
    console.log(`\n🎯 Assigning all reclamations to: ${targetUser.fullName} (${targetUser.id})`);
    
    const result = await prisma.reclamation.updateMany({
      data: { assignedToId: targetUser.id }
    });

    console.log(`✅ Updated ${result.count} reclamations`);
  }
}

checkCurrentUser()
  .catch(console.error)
  .finally(() => prisma.$disconnect());