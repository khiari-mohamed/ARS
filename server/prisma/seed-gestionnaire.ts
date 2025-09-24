import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedGestionnaireData() {
  console.log('🌱 Seeding Gestionnaire test data...');

  // Create test client
  const client = await prisma.client.upsert({
    where: { name: 'Test Client ARS' },
    update: {},
    create: {
      name: 'Test Client ARS',
      reglementDelay: 30,
      reclamationDelay: 15,
      address: '123 Rue de Test, Tunis',
      email: 'client@test.com',
      phone: '+216 12 345 678'
    }
  });

  // Create test gestionnaire user
  const bcrypt = require('bcrypt');
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const gestionnaire = await prisma.user.upsert({
    where: { email: 'gestionnaire@test.com' },
    update: {
      password: hashedPassword
    },
    create: {
      email: 'gestionnaire@test.com',
      password: hashedPassword,
      fullName: 'Test Gestionnaire',
      role: 'GESTIONNAIRE',
      department: 'SANTE',
      capacity: 25
    }
  });

  // Create test contract
  const contract = await prisma.contract.create({
    data: {
      clientId: client.id,
      clientName: client.name,
      assignedManagerId: gestionnaire.id,
      delaiReglement: 30,
      delaiReclamation: 15,
      documentPath: '/contracts/test-contract.pdf',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31')
    }
  });

  // Create test bordereaux with documents and BS
  for (let i = 1; i <= 5; i++) {
    const bordereau = await prisma.bordereau.create({
      data: {
        reference: `BDX-2024-${String(i).padStart(3, '0')}`,
        clientId: client.id,
        contractId: contract.id,
        dateReception: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        delaiReglement: 30,
        nombreBS: 3,
        statut: i <= 2 ? 'ASSIGNE' : 'EN_COURS',
        assignedToUserId: gestionnaire.id,
        dateReceptionBO: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        scanStatus: 'SCANNE'
      }
    });

    // Create document for each bordereau
    await prisma.document.create({
      data: {
        name: `GED-${String(i).padStart(4, '0')}`,
        type: i % 3 === 0 ? 'RECLAMATION' : i % 3 === 1 ? 'COMPLEMENT_INFORMATION' : 'BULLETIN_SOIN',
        path: `/documents/bordereau-${bordereau.id}.pdf`,
        uploadedById: gestionnaire.id,
        bordereauId: bordereau.id,
        status: 'TRAITE'
      }
    });

    // Create bulletin soins for each bordereau
    for (let j = 1; j <= 3; j++) {
      await prisma.bulletinSoin.create({
        data: {
          bordereauId: bordereau.id,
          numBs: `BS-${i}-${j}`,
          etat: j === 1 ? 'EN_COURS' : j === 2 ? 'TRAITE' : 'REJETE',
          codeAssure: `ASS${String(i * 100 + j).padStart(6, '0')}`,
          dateCreation: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          dateMaladie: new Date(Date.now() - (i + 5) * 24 * 60 * 60 * 1000),
          lien: 'CONJOINT',
          nomAssure: `Assuré ${i}`,
          nomBeneficiaire: `Bénéficiaire ${i}-${j}`,
          nomBordereau: bordereau.reference,
          nomPrestation: 'Consultation médicale',
          nomSociete: client.name,
          observationGlobal: 'RAS',
          totalPec: 150.50 + (i * 10) + (j * 5),
          ownerId: gestionnaire.id,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          processedById: j === 2 ? gestionnaire.id : null,
          processedAt: j === 2 ? new Date() : null
        }
      });
    }
  }

  // Create additional clients for dropdown
  await prisma.client.createMany({
    data: [
      {
        name: 'Société Alpha',
        reglementDelay: 25,
        reclamationDelay: 10,
        address: '456 Avenue Alpha, Tunis'
      },
      {
        name: 'Société Beta',
        reglementDelay: 35,
        reclamationDelay: 20,
        address: '789 Boulevard Beta, Sfax'
      },
      {
        name: 'Société Gamma',
        reglementDelay: 30,
        reclamationDelay: 15,
        address: '321 Rue Gamma, Sousse'
      }
    ],
    skipDuplicates: true
  });

  console.log('✅ Gestionnaire test data seeded successfully!');
  console.log(`📊 Created:`);
  console.log(`   - 1 Test Client`);
  console.log(`   - 1 Gestionnaire User`);
  console.log(`   - 1 Contract`);
  console.log(`   - 5 Bordereaux`);
  console.log(`   - 5 Documents`);
  console.log(`   - 15 Bulletin Soins`);
  console.log(`   - 3 Additional Clients`);
}

seedGestionnaireData()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });