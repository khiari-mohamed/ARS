import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDepartments() {
  console.log('\n=== CHECKING DEPARTMENTS ===\n');

  // 1. Check Department table
  const departments = await prisma.department.findMany({
    include: {
      users: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true
        }
      }
    }
  });

  console.log(`📊 Total Departments: ${departments.length}\n`);
  
  if (departments.length === 0) {
    console.log('❌ NO DEPARTMENTS FOUND IN DATABASE!\n');
    console.log('Creating default departments...\n');
    
    // Create default departments
    const defaultDepts = [
      { name: "Bureau d'Ordre", code: 'BO', serviceType: 'ADMINISTRATIVE' },
      { name: 'Équipe Santé', code: 'SANTE', serviceType: 'HEALTH' },
      { name: 'Service Scan', code: 'SCAN', serviceType: 'SCANNING' },
      { name: 'Service Finance', code: 'FINANCE', serviceType: 'FINANCIAL' }
    ];
    
    for (const dept of defaultDepts) {
      await prisma.department.create({ data: dept });
      console.log(`✅ Created: ${dept.name}`);
    }
    
    console.log('\n✅ Default departments created!\n');
  } else {
    departments.forEach(dept => {
      console.log(`📁 ${dept.name} (${dept.code})`);
      console.log(`   Active: ${dept.active}`);
      console.log(`   Users: ${dept.users.length}`);
      if (dept.users.length > 0) {
        dept.users.forEach(user => {
          console.log(`      - ${user.fullName} (${user.role})`);
        });
      }
      console.log('');
    });
  }

  // 2. Check users without department
  const usersWithoutDept = await prisma.user.findMany({
    where: {
      departmentId: null,
      active: true
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      department: true
    }
  });

  console.log(`\n👥 Users without departmentId: ${usersWithoutDept.length}`);
  if (usersWithoutDept.length > 0) {
    console.log('\n⚠️  WARNING: These users have no departmentId:\n');
    usersWithoutDept.forEach(user => {
      console.log(`   - ${user.fullName} (${user.role})`);
      console.log(`     Email: ${user.email}`);
      console.log(`     department field: ${user.department || 'null'}`);
      console.log('');
    });
  }

  // 3. Check bordereaux assignments
  const bordereauxCount = await prisma.bordereau.count();
  const bordereauxWithAssignment = await prisma.bordereau.count({
    where: { assignedToUserId: { not: null } }
  });

  console.log(`\n📋 Bordereaux Statistics:`);
  console.log(`   Total: ${bordereauxCount}`);
  console.log(`   With assignment: ${bordereauxWithAssignment}`);
  console.log(`   Without assignment: ${bordereauxCount - bordereauxWithAssignment}\n`);

  // 4. Check if users have bordereaux
  const usersWithBordereaux = await prisma.user.findMany({
    where: {
      active: true,
      bordereauxCurrentHandler: {
        some: {}
      }
    },
    select: {
      id: true,
      fullName: true,
      departmentId: true,
      department: true,
      _count: {
        select: {
          bordereauxCurrentHandler: true
        }
      }
    }
  });

  console.log(`\n👤 Users with bordereaux: ${usersWithBordereaux.length}`);
  if (usersWithBordereaux.length > 0) {
    usersWithBordereaux.forEach(user => {
      console.log(`   - ${user.fullName}: ${user._count.bordereauxCurrentHandler} bordereaux`);
      console.log(`     departmentId: ${user.departmentId || 'null'}`);
      console.log(`     department: ${user.department || 'null'}`);
    });
  }

  await prisma.$disconnect();
}

checkDepartments()
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  });
