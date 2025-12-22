import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDepartments() {
  console.log('\n📊 CHECKING DEPARTMENTS\n');
  
  const departments = await prisma.department.findMany({
    include: {
      users: {
        where: { active: true },
        select: { id: true, fullName: true, email: true }
      }
    }
  });
  
  console.log(`Found ${departments.length} departments:\n`);
  
  departments.forEach(dept => {
    console.log(`✅ ${dept.name} (${dept.code})`);
    console.log(`   Service Type: ${dept.serviceType}`);
    console.log(`   Active: ${dept.active}`);
    console.log(`   Users: ${dept.users.length}`);
    dept.users.forEach(u => console.log(`      - ${u.fullName || u.email}`));
    console.log('');
  });
  
  // Check users without departments
  const usersWithoutDept = await prisma.user.findMany({
    where: { 
      active: true,
      departmentId: null
    },
    select: { id: true, fullName: true, email: true, role: true }
  });
  
  console.log(`\n⚠️  Users without department: ${usersWithoutDept.length}\n`);
  usersWithoutDept.forEach(u => {
    console.log(`   - ${u.fullName || u.email} (${u.role})`);
  });
  
  await prisma.$disconnect();
}

checkDepartments().catch(console.error);
