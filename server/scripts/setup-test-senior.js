const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupTestSenior() {
  console.log('\n🔧 SETTING UP TEST GESTIONNAIRE SENIOR\n');
  console.log('='.repeat(80));

  try {
    // 1. Create new Gestionnaire Senior
    const senior = await prisma.user.create({
      data: {
        fullName: 'TEST SENIOR',
        email: 'test.senior@arstunisie.com',
        password: '$2b$10$abcdefghijklmnopqrstuv', // hashed "password"
        role: 'GESTIONNAIRE_SENIOR',
        active: true
      }
    });

    console.log(`✅ Created Senior: ${senior.fullName} (${senior.id})`);

    // 2. Get or create test client
    let client = await prisma.client.findFirst({ where: { name: 'TEST CLIENT' } });
    if (!client) {
      client = await prisma.client.create({
        data: {
          name: 'TEST CLIENT',
          email: 'test@client.com',
          phone: '12345678'
        }
      });
      console.log(`✅ Created Client: ${client.name}`);
    } else {
      console.log(`✅ Using existing Client: ${client.name}`);
    }

    // 3. Create bordereau assigned to senior
    const bordereau = await prisma.bordereau.create({
      data: {
        reference: `TEST-BR-${Date.now()}`,
        clientId: client.id,
        assignedToUserId: senior.id,
        statut: 'ASSIGNE',
        dateReception: new Date(),
        nombreBS: 3,
        delaiReglement: 5
      }
    });

    console.log(`✅ Created Bordereau: ${bordereau.reference}`);

    // 4. Create 3 documents for this bordereau
    const docs = [];
    for (let i = 1; i <= 3; i++) {
      const doc = await prisma.document.create({
        data: {
          name: `TEST-DOC-${i}.pdf`,
          type: 'BULLETIN_SOIN',
          path: `/test/doc-${i}.pdf`,
          uploadedById: senior.id,
          bordereauId: bordereau.id,
          assignedToUserId: senior.id,
          status: i === 1 ? 'TRAITE' : 'EN_COURS'
        }
      });
      docs.push(doc);
      console.log(`✅ Created Document ${i}: ${doc.name} (${doc.status})`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ TEST DATA CREATED SUCCESSFULLY\n');
    console.log(`Senior ID: ${senior.id}`);
    console.log(`Bordereau: ${bordereau.reference}`);
    console.log(`Documents: ${docs.length}`);
    console.log(`  - TRAITE: 1`);
    console.log(`  - EN_COURS: 2`);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

setupTestSenior();
