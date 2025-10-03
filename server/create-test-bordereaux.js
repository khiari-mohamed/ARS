const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestBordereaux() {
  console.log('\n🔧 Creating test TRAITÉ bordereaux...\n');

  try {
    // Get or create client
    let client = await prisma.client.findFirst();
    if (!client) {
      client = await prisma.client.create({
        data: {
          name: 'Test Client',
          email: 'test@client.com',
          phone: '12345678',
          address: 'Test Address',
          reglementDelay: 30,
          reclamationDelay: 15
        }
      });
    }

    // Create 5 TRAITÉ bordereaux
    const bordereaux = [];
    for (let i = 1; i <= 5; i++) {
      const bordereau = await prisma.bordereau.create({
        data: {
          reference: `BRD-TEST-${Date.now()}-${i}`,
          clientId: client.id,
          dateReception: new Date(),
          statut: 'TRAITE',
          nombreBS: Math.floor(Math.random() * 50) + 10,
          delaiReglement: 30,
          dateCloture: new Date(),
          scanStatus: 'FINALISE',
          completionRate: 100,
          priority: 1,
          archived: false
        }
      });
      bordereaux.push(bordereau);
      console.log(`✅ Created: ${bordereau.reference} (${bordereau.nombreBS} BS)`);
    }

    console.log(`\n✅ Successfully created ${bordereaux.length} TRAITÉ bordereaux!`);
    console.log('\nGo to Finance Module → TAB 2 to see them!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestBordereaux();
