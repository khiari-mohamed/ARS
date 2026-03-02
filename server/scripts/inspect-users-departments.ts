import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectUsersDepartments() {
  console.log('🔍 Inspecting users and their departments...\n');

  // Get all users
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      department: true,
      active: true,
      _count: {
        select: {
          bordereauxCurrentHandler: true,
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`📊 Total users: ${allUsers.length}\n`);

  // Users without department
  const usersWithoutDept = allUsers.filter(u => !u.department);
  console.log(`❌ Users WITHOUT department: ${usersWithoutDept.length}`);
  usersWithoutDept.forEach(u => {
    console.log(`   - ${u.fullName} (${u.email}) - Role: ${u.role} - Bordereaux: ${u._count.bordereauxCurrentHandler}`);
  });

  // Users with department
  const usersWithDept = allUsers.filter(u => u.department);
  console.log(`\n✅ Users WITH department: ${usersWithDept.length}`);
  
  // Group by department
  const deptGroups = usersWithDept.reduce((acc, u) => {
    if (!acc[u.department!]) acc[u.department!] = [];
    acc[u.department!].push(u);
    return acc;
  }, {} as Record<string, typeof usersWithDept>);

  Object.entries(deptGroups).forEach(([dept, users]) => {
    console.log(`\n   📁 ${dept}: ${users.length} users`);
    users.forEach(u => {
      console.log(`      - ${u.fullName} (${u.role}) - Bordereaux: ${u._count.bordereauxCurrentHandler}`);
    });
  });

  // Check bordereaux assigned to users without department
  console.log('\n\n🔍 Checking bordereaux assigned to users without department...');
  
  for (const user of usersWithoutDept) {
    if (user._count.bordereauxCurrentHandler > 0) {
      const bordereaux = await prisma.bordereau.findMany({
        where: { currentHandlerId: user.id },
        select: {
          id: true,
          reference: true,
          statut: true,
          createdAt: true
        },
        take: 5
      });
      
      console.log(`\n   ⚠️  ${user.fullName} has ${user._count.bordereauxCurrentHandler} bordereaux (showing first 5):`);
      bordereaux.forEach(b => {
        console.log(`      - ${b.reference} (${b.statut}) - Created: ${b.createdAt.toLocaleDateString()}`);
      });
    }
  }

  await prisma.$disconnect();
}

inspectUsersDepartments()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  });
