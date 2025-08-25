import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting full database seed...');

  // 1. Create Users
  const hashedPassword = await bcrypt.hash('password', 10);
  
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'fikoll@mail.com' },
      update: {},
      create: {
        email: 'fikoll@mail.com',
        password: hashedPassword,
        fullName: 'Super Admin',
        role: 'SUPER_ADMIN',
        active: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'admin@ars.com' },
      update: {},
      create: {
        email: 'admin@ars.com',
        password: hashedPassword,
        fullName: 'Admin ARS',
        role: 'ADMINISTRATEUR',
        active: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'chef@ars.com' },
      update: {},
      create: {
        email: 'chef@ars.com',
        password: hashedPassword,
        fullName: 'Chef Équipe',
        role: 'CHEF_EQUIPE',
        department: 'SANTE',
        active: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'gestionnaire1@ars.com' },
      update: {},
      create: {
        email: 'gestionnaire1@ars.com',
        password: hashedPassword,
        fullName: 'Gestionnaire 1',
        role: 'GESTIONNAIRE',
        department: 'SANTE',
        active: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'gestionnaire2@ars.com' },
      update: {},
      create: {
        email: 'gestionnaire2@ars.com',
        password: hashedPassword,
        fullName: 'Gestionnaire 2',
        role: 'GESTIONNAIRE',
        department: 'SANTE',
        active: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'bo@ars.com' },
      update: {},
      create: {
        email: 'bo@ars.com',
        password: hashedPassword,
        fullName: 'Bureau Ordre',
        role: 'CLIENT_SERVICE',
        department: 'BO',
        active: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'scan@ars.com' },
      update: {},
      create: {
        email: 'scan@ars.com',
        password: hashedPassword,
        fullName: 'Service Scan',
        role: 'MANAGER',
        department: 'SCAN',
        active: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'finance@ars.com' },
      update: {},
      create: {
        email: 'finance@ars.com',
        password: hashedPassword,
        fullName: 'Service Finance',
        role: 'MANAGER',
        department: 'FINANCE',
        active: true,
      },
    }),
  ]);

  console.log('✅ Users created');

  // 2. Create Clients
  const clients = await Promise.all([
    prisma.client.upsert({
      where: { name: 'ASSURANCES SALIM' },
      update: {},
      create: {
        name: 'ASSURANCES SALIM',
        reglementDelay: 30,
        reclamationDelay: 15,
        gestionnaires: {
          connect: [{ id: users[3].id }, { id: users[4].id }]
        }
      },
    }),
    prisma.client.upsert({
      where: { name: 'MAGHREBIA VIE' },
      update: {},
      create: {
        name: 'MAGHREBIA VIE',
        reglementDelay: 45,
        reclamationDelay: 20,
        gestionnaires: {
          connect: [{ id: users[3].id }]
        }
      },
    }),
    prisma.client.upsert({
      where: { name: 'STAR ASSURANCES' },
      update: {},
      create: {
        name: 'STAR ASSURANCES',
        reglementDelay: 30,
        reclamationDelay: 10,
        gestionnaires: {
          connect: [{ id: users[4].id }]
        }
      },
    }),
    prisma.client.upsert({
      where: { name: 'LLOYD TUNISIEN' },
      update: {},
      create: {
        name: 'LLOYD TUNISIEN',
        reglementDelay: 60,
        reclamationDelay: 25,
        gestionnaires: {
          connect: [{ id: users[3].id }, { id: users[4].id }]
        }
      },
    }),
  ]);

  console.log('✅ Clients created');

  // 3. Create Contracts
  const contracts = await Promise.all([
    prisma.contract.create({
      data: {
        clientId: clients[0].id,
        clientName: clients[0].name,
        delaiReglement: 30,
        delaiReclamation: 15,
        escalationThreshold: 50,
        documentPath: '/contracts/salim_2024.pdf',
        assignedManagerId: users[2].id,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        version: 1,
      },
    }),
    prisma.contract.create({
      data: {
        clientId: clients[1].id,
        clientName: clients[1].name,
        delaiReglement: 45,
        delaiReclamation: 20,
        escalationThreshold: 75,
        documentPath: '/contracts/maghrebia_2024.pdf',
        assignedManagerId: users[2].id,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        version: 1,
      },
    }),
    prisma.contract.create({
      data: {
        clientId: clients[2].id,
        clientName: clients[2].name,
        delaiReglement: 30,
        delaiReclamation: 10,
        escalationThreshold: 40,
        documentPath: '/contracts/star_2024.pdf',
        assignedManagerId: users[2].id,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        version: 1,
      },
    }),
    prisma.contract.create({
      data: {
        clientId: clients[3].id,
        clientName: clients[3].name,
        delaiReglement: 60,
        delaiReclamation: 25,
        escalationThreshold: 100,
        documentPath: '/contracts/lloyd_2024.pdf',
        assignedManagerId: users[2].id,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        version: 1,
      },
    }),
  ]);

  console.log('✅ Contracts created');

  // 4. Create Bordereaux
  const bordereaux = await Promise.all([
    prisma.bordereau.create({
      data: {
        reference: 'BORD-2024-001',
        dateReception: new Date('2024-08-01'),
        clientId: clients[0].id,
        contractId: contracts[0].id,
        delaiReglement: 30,
        nombreBS: 15,
        statut: 'EN_COURS',
        assignedToUserId: users[3].id,
      },
    }),
    prisma.bordereau.create({
      data: {
        reference: 'BORD-2024-002',
        dateReception: new Date('2024-08-05'),
        clientId: clients[1].id,
        contractId: contracts[1].id,
        delaiReglement: 45,
        nombreBS: 25,
        statut: 'SCANNE',
      },
    }),
    prisma.bordereau.create({
      data: {
        reference: 'BORD-2024-003',
        dateReception: new Date('2024-08-10'),
        clientId: clients[2].id,
        contractId: contracts[2].id,
        delaiReglement: 30,
        nombreBS: 8,
        statut: 'A_SCANNER',
      },
    }),
    prisma.bordereau.create({
      data: {
        reference: 'BORD-2024-004',
        dateReception: new Date('2024-08-15'),
        clientId: clients[3].id,
        contractId: contracts[3].id,
        delaiReglement: 60,
        nombreBS: 35,
        statut: 'TRAITE',
        assignedToUserId: users[4].id,
        dateCloture: new Date('2024-08-20'),
      },
    }),
    prisma.bordereau.create({
      data: {
        reference: 'BORD-2024-005',
        dateReception: new Date('2024-08-20'),
        clientId: clients[0].id,
        contractId: contracts[0].id,
        delaiReglement: 30,
        nombreBS: 12,
        statut: 'EN_DIFFICULTE',
        assignedToUserId: users[3].id,
      },
    }),
  ]);

  console.log('✅ Bordereaux created');

  // 5. Create BulletinSoins
  for (const bordereau of bordereaux) {
    const client = clients.find(c => c.id === bordereau.clientId);
    for (let i = 1; i <= Math.min(bordereau.nombreBS, 5); i++) {
      await prisma.bulletinSoin.create({
        data: {
          bordereauId: bordereau.id,
          numBs: `BS-${bordereau.reference}-${i.toString().padStart(3, '0')}`,
          codeAssure: `ASS${Math.floor(Math.random() * 10000)}`,
          nomAssure: `Assuré ${i}`,
          nomBeneficiaire: `Bénéficiaire ${i}`,
          nomSociete: client?.name || 'Société',
          matricule: `MAT${Math.floor(Math.random() * 100000)}`,
          dateSoin: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          montant: Math.floor(Math.random() * 1000) + 100,
          acte: 'Consultation',
          nomPrestation: 'Consultation médicale',
          nomBordereau: bordereau.reference,
          lien: `https://example.com/bs/${i}`,
          dateCreation: new Date(),
          dateMaladie: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
          totalPec: Math.floor(Math.random() * 800) + 50,
          observationGlobal: 'Observation standard',
          etat: ['IN_PROGRESS', 'VALIDATED', 'REJECTED'][Math.floor(Math.random() * 3)],
          ownerId: bordereau.assignedToUserId,
        },
      });
    }
  }

  console.log('✅ BulletinSoins created');

  // 6. Create Reclamations
  const reclamations = await Promise.all([
    prisma.reclamation.create({
      data: {
        clientId: clients[0].id,
        bordereauId: bordereaux[0].id,
        type: 'REMBOURSEMENT',
        severity: 'HAUTE',
        status: 'OUVERTE',
        description: 'Problème de remboursement pour le bordereau BORD-2024-001',
        assignedToId: users[3].id,
        createdById: users[5].id,
        contractId: contracts[0].id,
        department: 'SANTE',
      },
    }),
    prisma.reclamation.create({
      data: {
        clientId: clients[1].id,
        type: 'SERVICE',
        severity: 'MOYENNE',
        status: 'EN_COURS',
        description: 'Délai de traitement trop long',
        assignedToId: users[4].id,
        createdById: users[5].id,
        contractId: contracts[1].id,
        department: 'SANTE',
      },
    }),
  ]);

  console.log('✅ Reclamations created');

  // 7. Create Wire Transfer Data
  const society = await prisma.society.create({
    data: {
      name: 'ARS TUNISIE',
      code: 'ARS_TN',
    },
  });

  const donneur = await prisma.donneurDOrdre.create({
    data: {
      societyId: society.id,
      name: 'ARS Compte Principal',
      rib: '12345678901234567890',
    },
  });

  const members = await Promise.all([
    prisma.member.create({
      data: {
        societyId: society.id,
        name: 'Membre Test 1',
        rib: '11111111111111111111',
        cin: '12345678',
        address: 'Tunis, Tunisie',
      },
    }),
    prisma.member.create({
      data: {
        societyId: society.id,
        name: 'Membre Test 2',
        rib: '22222222222222222222',
        cin: '87654321',
        address: 'Sfax, Tunisie',
      },
    }),
  ]);

  console.log('✅ Wire transfer data created');

  // 8. Create Templates
  await Promise.all([
    prisma.template.create({
      data: {
        name: 'Notification Règlement',
        subject: 'Notification de règlement - {{reference}}',
        body: 'Cher client, votre bordereau {{reference}} a été traité et le règlement sera effectué sous {{delai}} jours.',
        variables: ['reference', 'delai'],
      },
    }),
    prisma.template.create({
      data: {
        name: 'Relance Client',
        subject: 'Relance - Documents manquants',
        body: 'Cher client, nous vous informons que des documents sont manquants pour le traitement de votre dossier {{reference}}.',
        variables: ['reference'],
      },
    }),
  ]);

  console.log('✅ Templates created');

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`- Users: ${users.length}`);
  console.log(`- Clients: ${clients.length}`);
  console.log(`- Contracts: ${contracts.length}`);
  console.log(`- Bordereaux: ${bordereaux.length}`);
  console.log(`- Reclamations: ${reclamations.length}`);
  console.log('\n🔑 Login credentials:');
  console.log('- fikoll@mail.com / password (SUPER_ADMIN)');
  console.log('- admin@ars.com / password (ADMINISTRATEUR)');
  console.log('- chef@ars.com / password (CHEF_EQUIPE)');
  console.log('- gestionnaire1@ars.com / password (GESTIONNAIRE)');
  console.log('- bo@ars.com / password (CLIENT_SERVICE)');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());