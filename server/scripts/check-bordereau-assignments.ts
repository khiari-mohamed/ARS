import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBordereauAssignments() {
  console.log('\n=== CHECKING BORDEREAU ASSIGNMENTS ===\n');

  // Get users with bordereaux
  const usersWithBordereaux = await prisma.user.findMany({
    where: {
      bordereauxCurrentHandler: {
        some: {}
      }
    },
    include: {
      bordereauxCurrentHandler: true,
      departmentRef: true
    }
  });

  console.log(`👤 Users with bordereaux: ${usersWithBordereaux.length}\n`);

  for (const user of usersWithBordereaux) {
    console.log(`📋 ${user.fullName}:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   departmentId: ${user.departmentId || 'NULL'}`);
    console.log(`   Department: ${user.departmentRef?.name || 'None'}`);
    console.log(`   Bordereaux: ${user.bordereauxCurrentHandler.length}`);
    console.log('');
  }

  await prisma.$disconnect();
}

checkBordereauAssignments()
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  });
