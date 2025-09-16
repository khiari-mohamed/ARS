const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCurrentLoggedUser() {
  console.log('🔍 Checking current logged user and data...');

  // Check all users
  const users = await prisma.user.findMany({
    select: { id: true, email: true, fullName: true, role: true }
  });

  console.log('👥 All users:');
  users.forEach(user => {
    console.log(`   - ${user.fullName} (${user.email}) - ${user.role} - ID: ${user.id}`);
  });

  // Check reclamations for the JWT user
  const jwtUserId = 'f7d0493c-f2a4-4241-8abc-b80ce85913cc';
  console.log(`\n🎯 Checking reclamations for JWT user: ${jwtUserId}`);
  
  const reclamationsForJwtUser = await prisma.reclamation.findMany({
    where: { assignedToId: jwtUserId },
    select: { id: true, status: true, description: true, assignedToId: true }
  });

  console.log(`📋 Found ${reclamationsForJwtUser.length} reclamations for JWT user:`);
  reclamationsForJwtUser.forEach(rec => {
    console.log(`   - ${rec.id.substring(0, 8)} - ${rec.status} - ${rec.description?.substring(0, 50)}`);
  });

  // If no data for JWT user, assign some
  if (reclamationsForJwtUser.length === 0) {
    console.log('\n🔧 No data found for JWT user, assigning reclamations...');
    
    const result = await prisma.reclamation.updateMany({
      data: { assignedToId: jwtUserId }
    });

    console.log(`✅ Assigned ${result.count} reclamations to JWT user`);
  }
}

checkCurrentLoggedUser()
  .catch(console.error)
  .finally(() => prisma.$disconnect());