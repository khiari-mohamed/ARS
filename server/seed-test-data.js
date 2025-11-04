const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Starting database seeding...\n');

  try {
    // 1. Create Chef d'équipe
    console.log('👤 Creating Chef d\'équipe...');
    const hashedPassword = await bcrypt.hash('Chef123@', 10);
    const chef = await prisma.user.upsert({
      where: { email: 'chef@ars.com' },
      update: {},
      create: {
        email: 'chef@ars.com',
        password: hashedPassword,
        fullName: 'Chef Equipe',
        role: 'CHEF_EQUIPE',
        department: 'SANTE'
      }
    });
    console.log('✅ Chef created:', chef.email);

    // 2. Create Client
    console.log('\n🏢 Creating Client...');
    const client = await prisma.client.upsert({
      where: { name: 'Test Insurance Company' },
      update: {},
      create: {
        name: 'Test Insurance Company',
        email: 'client@test.com',
        phone: '+216 12 345 678',
        address: 'Tunis, Tunisia',
        reglementDelay: 15,
        reclamationDelay: 10,
        status: 'ACTIVE'
      }
    });
    console.log('✅ Client created:', client.name);

    // 3. Create Contract
    console.log('\n📄 Creating Contract...');
    const contract = await prisma.contract.create({
      data: {
        clientId: client.id,
        clientName: client.name,
        assignedManagerId: chef.id,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        delaiReclamation: 10,
        delaiReglement: 15,
        documentPath: '/contracts/test-contract.pdf'
      }
    });
    console.log('✅ Contract created:', contract.reference);

    // 4. Create Bordereau
    console.log('\n📋 Creating Bordereau...');
    const bordereau = await prisma.bordereau.create({
      data: {
        reference: `BDX-${Date.now()}`,
        clientId: client.id,
        contractId: contract.id,
        type: 'BULLETIN_SOIN',
        dateReception: new Date(),
        nombreBS: 10,
        statut: 'SCANNE',
        teamId: chef.id,
        delaiReglement: 15
      }
    });
    console.log('✅ Bordereau created:', bordereau.reference);

    // 5. Create Documents (BS)
    console.log('\n📄 Creating Documents (BS)...');
    const documents = [];
    for (let i = 1; i <= 5; i++) {
      const doc = await prisma.document.create({
        data: {
          bordereauId: bordereau.id,
          type: 'BULLETIN_SOIN',
          name: `bulletin_soins_${i}.pdf`,
          path: `/uploads/bs_${i}.pdf`,
          status: i <= 3 ? 'TRAITE' : 'EN_COURS',
          uploadedById: chef.id
        }
      });
      documents.push(doc);
    }
    console.log(`✅ Created ${documents.length} documents`);

    // 6. Update Bordereau stats
    console.log('\n📊 Updating Bordereau statistics...');
    await prisma.bordereau.update({
      where: { id: bordereau.id },
      data: {
        completionRate: 30
      }
    });
    console.log('✅ Bordereau stats updated');

    console.log('\n' + '='.repeat(60));
    console.log('✅ SEEDING COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\n📋 Test Data Summary:');
    console.log(`   Chef d'équipe: ${chef.email} / Chef123@`);
    console.log(`   Client: ${client.name}`);
    console.log(`   Contract: ${contract.reference}`);
    console.log(`   Bordereau: ${bordereau.reference}`);
    console.log(`   Documents: ${documents.length} BS created`);
    console.log('\n🚀 Ready to run: node test-email-notification-system.js\n');

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
