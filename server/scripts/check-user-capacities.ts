import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      role: { in: ['GESTIONNAIRE', 'CHEF_EQUIPE'] },
      active: true
    },
    select: {
      fullName: true,
      role: true,
      capacity: true
    }
  });
  
  console.log('User capacities:');
  users.forEach(u => {
    console.log(`${u.fullName} (${u.role}): ${u.capacity}`);
  });
  
  await prisma.$disconnect();
}

main().catch(console.error);
