const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addTestClient() {
  try {
    // Get Mohamed Ben Ali
    const mohamed = await prisma.user.findUnique({
      where: { email: 'chef.sante@ars.tn' }
    });

    if (!mohamed) {
      console.log('❌ Mohamed Ben Ali not found');
      return;
    }

    // Create new client
    const client = await prisma.client.create({
      data: {
        name: 'Client Test Exclusive',
        email: 'test@exclusive.tn',
        phone: '+216 20 999 888',
        address: 'Test Address, Tunis',
        reglementDelay: 20,
        reclamationDelay: 12,
        status: 'active',
        gestionnaires: {
          connect: [{ id: mohamed.id }]
        }
      }
    });

    console.log('✅ Client created successfully!');
    console.log(`   Name: ${client.name}`);
    console.log(`   ID: ${client.id}`);
    console.log(`   Assigned to: Mohamed Ben Ali ONLY`);
    console.log('\n📊 Expected visibility:');
    console.log('   - Mohamed Ben Ali: Should see 5 clients');
    console.log('   - Fatma Trabelsi: Should see 4 clients');
    console.log('   - Super Admin: Should see 5 clients');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTestClient();
