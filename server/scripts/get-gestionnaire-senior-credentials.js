const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Searching for GESTIONNAIRE_SENIOR users...\n');

  try {
    const gestionnairesSenior = await prisma.user.findMany({
      where: { role: 'GESTIONNAIRE_SENIOR' },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        department: true,
        active: true,
        createdAt: true
      }
    });

    if (gestionnairesSenior.length === 0) {
      console.log('❌ No GESTIONNAIRE_SENIOR users found in database.');
      console.log('\n💡 You need to create one first. Here\'s how:\n');
      console.log('Option 1: Use the comprehensive seed script');
      console.log('   cd server');
      console.log('   node scripts/comprehensive-seed.js\n');
      console.log('Option 2: Create manually via SQL or Prisma Studio\n');
      return;
    }

    console.log(`✅ Found ${gestionnairesSenior.length} GESTIONNAIRE_SENIOR user(s):\n`);
    console.log('='.repeat(80));
    
    gestionnairesSenior.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.fullName}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   🔑 Password: Password123@ (default from seed)`);
      console.log(`   👤 Role: ${user.role}`);
      console.log(`   🏢 Department: ${user.department || 'N/A'}`);
      console.log(`   ✅ Active: ${user.active ? 'Yes' : 'No'}`);
      console.log(`   📅 Created: ${user.createdAt.toLocaleDateString()}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n🚀 Login Instructions:');
    console.log('   1. Go to: http://localhost:5173 (or your frontend URL)');
    console.log('   2. Use the credentials above');
    console.log('   3. You should see the Gestionnaire Senior Dashboard\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
