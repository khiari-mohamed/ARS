import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixUsersDepartments() {
  console.log('🔧 Fixing users without departments...\n');

  // Get users without department
  const usersWithoutDept = await prisma.user.findMany({
    where: { department: null },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      _count: {
        select: {
          bordereauxCurrentHandler: true,
        }
      }
    }
  });

  console.log(`Found ${usersWithoutDept.length} users without department:\n`);

  for (const user of usersWithoutDept) {
    console.log(`📝 ${user.fullName} (${user.role}) - ${user._count.bordereauxCurrentHandler} bordereaux`);
    
    // Assign department based on role
    let department: string;
    
    switch (user.role) {
      case 'SUPER_ADMIN':
      case 'ADMINISTRATEUR':
      case 'RESPONSABLE_DEPARTEMENT':
        department = 'Direction Générale';
        break;
      case 'CHEF_EQUIPE':
      case 'GESTIONNAIRE':
      case 'GESTIONNAIRE_SENIOR':
        department = 'Équipe Métier';
        break;
      case 'BO':
      case 'BUREAU_ORDRE':
        department = 'Bureau d\'Ordre';
        break;
      case 'SCAN_TEAM':
        department = 'Équipe Scan';
        break;
      case 'FINANCE':
        department = 'Service Finance';
        break;
      case 'CLIENT_SERVICE':
        department = 'Service Client';
        break;
      default:
        department = 'Non Affecté';
    }

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: { department }
    });

    console.log(`   ✅ Assigned to: ${department}\n`);
  }

  console.log('\n✅ All users now have departments assigned!');
  
  // Verify
  const stillWithoutDept = await prisma.user.count({
    where: { department: null }
  });
  
  console.log(`\n📊 Users without department: ${stillWithoutDept}`);

  await prisma.$disconnect();
}

fixUsersDepartments()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  });
