import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateUserDepartments() {
  console.log('\n=== MIGRATING USER DEPARTMENTS ===\n');

  // Get all departments
  const departments = await prisma.department.findMany();
  const deptMap = new Map(departments.map(d => [d.code, d.id]));

  console.log('📁 Department Mapping:');
  departments.forEach(d => console.log(`   ${d.code} → ${d.id} (${d.name})`));
  console.log('');

  // Get all users with old department field
  const users = await prisma.user.findMany({
    where: {
      department: { not: null },
      departmentId: null
    }
  });

  console.log(`👥 Found ${users.length} users to migrate\n`);

  let migrated = 0;
  let skipped = 0;

  for (const user of users) {
    let deptId: string | null = null;

    // Map old department string to new departmentId
    if (user.department) {
      const deptUpper = user.department.toUpperCase();
      
      if (deptUpper.includes('SANTE') || deptUpper.includes('SANTÉ')) {
        deptId = deptMap.get('SANTE') || null;
      } else if (deptUpper.includes('BO') || deptUpper.includes('BUREAU')) {
        deptId = deptMap.get('BO') || null;
      } else if (deptUpper.includes('SCAN')) {
        deptId = deptMap.get('SCAN') || null;
      } else if (deptUpper.includes('FINANCE')) {
        deptId = deptMap.get('FINANCE') || null;
      }
    }

    if (deptId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { departmentId: deptId }
      });
      
      const dept = departments.find(d => d.id === deptId);
      console.log(`✅ ${user.fullName} → ${dept?.name}`);
      migrated++;
    } else {
      console.log(`⚠️  ${user.fullName} → Could not map "${user.department}"`);
      skipped++;
    }
  }

  console.log(`\n📊 Migration Complete:`);
  console.log(`   Migrated: ${migrated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log('');

  // Verify
  const usersWithDept = await prisma.user.count({
    where: { departmentId: { not: null } }
  });
  console.log(`✅ Total users with departmentId: ${usersWithDept}\n`);

  await prisma.$disconnect();
}

migrateUserDepartments()
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  });
