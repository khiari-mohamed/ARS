const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function extractCredentials() {
  console.log('🔍 Extracting all user credentials...\n');

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        password: true,
        fullName: true,
        role: true,
        department: true,
        active: true
      },
      orderBy: [
        { role: 'asc' },
        { fullName: 'asc' }
      ]
    });

    console.log('================================================================================');
    console.log(`📋 ALL USER CREDENTIALS (${users.length} users)`);
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
        console.log(`     Password : ${user.password}`);
        console.log(`     Status   : ${status}`);
        console.log(`     Dept     : ${user.department || 'N/A'}`);
        console.log(`     ID       : ${user.id}`);
      });
    }

    console.log('\n\n================================================================================');
    console.log('📝 CREDENTIALS EXPORTED TO FILE');
    console.log('================================================================================\n');

    const fs = require('fs');
    const output = {
      totalUsers: users.length,
      exportDate: new Date().toISOString(),
      usersByRole: usersByRole,
      allUsers: users
    };

    fs.writeFileSync(
      'user-credentials-export.json',
      JSON.stringify(output, null, 2)
    );

    console.log('✅ Saved to: user-credentials-export.json\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

extractCredentials();
