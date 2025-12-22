const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function resetAllPasswords() {
  console.log('🔐 Resetting all user passwords...\n');

  const DEFAULT_PASSWORD = 'ARS2024!';
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  try {
    const users = await prisma.user.findMany({
      orderBy: [
        { role: 'asc' },
        { fullName: 'asc' }
      ]
    });

    console.log(`Found ${users.length} users\n`);
    console.log('================================================================================');
    console.log('📋 ALL USER CREDENTIALS (Password: ARS2024! for all)');
    console.log('================================================================================\n');

    const usersByRole = {};
    users.forEach(user => {
      if (!usersByRole[user.role]) {
        usersByRole[user.role] = [];
      }
      usersByRole[user.role].push(user);
    });

    for (const [role, roleUsers] of Object.entries(usersByRole)) {
      console.log(`\n🔹 ${role} (${roleUsers.length} users):`);
      console.log('─'.repeat(80));
      
      roleUsers.forEach((user, index) => {
        const status = user.active ? '🟢 Active' : '🔴 Inactive';
        console.log(`\n  ${index + 1}. ${user.fullName}`);
        console.log(`     Email    : ${user.email}`);
        console.log(`     Password : ARS2024!`);
        console.log(`     Status   : ${status}`);
        console.log(`     Dept     : ${user.department || 'N/A'}`);
      });
    }

    console.log('\n\n================================================================================');
    console.log('🔄 Updating passwords in database...');
    console.log('================================================================================\n');

    const result = await prisma.user.updateMany({
      data: {
        password: hashedPassword
      }
    });

    console.log(`✅ Successfully updated ${result.count} user passwords!\n`);
    
    console.log('================================================================================');
    console.log('📝 QUICK REFERENCE - TEST ACCOUNTS');
    console.log('================================================================================\n');
    
    console.log('🔹 SUPER_ADMIN:');
    console.log('   Email: bnala556@gmail.com');
    console.log('   Pass:  ARS2024!\n');
    
    console.log('🔹 CHEF_EQUIPE:');
    console.log('   Email: mohamed.frad@arstunisie.com');
    console.log('   Pass:  ARS2024!\n');
    
    console.log('🔹 GESTIONNAIRE:');
    console.log('   Email: ameni.dhrif@arstunisie.com');
    console.log('   Pass:  ARS2024!\n');
    
    console.log('🔹 FINANCE:');
    console.log('   Email: ahlem.hamdi@arstunisie.com');
    console.log('   Pass:  ARS2024!\n');
    
    console.log('🔹 BO (Bureau d\'Ordre):');
    console.log('   Email: sana.menzli@arstunisie.com');
    console.log('   Pass:  ARS2024!\n');
    
    console.log('🔹 SCAN_TEAM:');
    console.log('   Email: ameni.laaouini@arstunisie.com');
    console.log('   Pass:  ARS2024!\n');

    console.log('================================================================================');
    console.log('✅ ALL PASSWORDS RESET COMPLETE!');
    console.log('================================================================================\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAllPasswords();
