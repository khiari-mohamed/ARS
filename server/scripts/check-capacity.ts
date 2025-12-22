import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCapacity() {
  console.log('🔍 Checking capacity analysis data...\n');

  // Check users
  const users = await prisma.user.findMany({
    where: {
      active: true,
      role: { in: ['GESTIONNAIRE', 'CHEF_EQUIPE'] }
    },
    include: {
      bordereauxCurrentHandler: {
        where: {
          statut: { in: ['EN_COURS', 'ASSIGNE'] }
        }
      }
    }
  });

  console.log(`Found ${users.length} active users\n`);

  for (const user of users) {
    console.log(`${user.fullName}:`);
    console.log(`  Active bordereaux (EN_COURS/ASSIGNE): ${user.bordereauxCurrentHandler.length}`);
    console.log(`  Capacity: ${user.capacity || 20}`);
  }

  // Check all bordereau statuses
  console.log('\n📊 Bordereau status distribution:');
  const statusCounts = await prisma.bordereau.groupBy({
    by: ['statut'],
    _count: true
  });

  statusCounts.forEach(s => {
    console.log(`  ${s.statut}: ${s._count}`);
  });

  await prisma.$disconnect();
}

checkCapacity().catch(console.error);
