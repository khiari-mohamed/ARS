import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seedBSData() {
  console.log('🌱 Seeding BS data...');

  // Create gestionnaires
  const gestionnaires: any[] = [];
  for (let i = 1; i <= 5; i++) {
    const gestionnaire = await prisma.user.upsert({
      where: { email: `gestionnaire${i}@ars.com` },
      update: {},
      create: {
        email: `gestionnaire${i}@ars.com`,
        password: await bcrypt.hash('password123', 10),
        fullName: `Gestionnaire ${i}`,
        role: 'gestionnaire',
        department: 'Santé',
        active: true,
      },
    });
    gestionnaires.push(gestionnaire);
  }

  // Create a client
  const client = await prisma.client.upsert({
    where: { name: 'Client Test BS' },
    update: {},
    create: {
      name: 'Client Test BS',
      email: 'client@test.com',
      reglementDelay: 5,
      reclamationDelay: 3,
      status: 'active',
    },
  });

  // Create a contract
  const existingContract = await prisma.contract.findFirst({
    where: { clientName: 'Client Test BS' }
  });
  
  const contract = existingContract || await prisma.contract.create({
    data: {
      clientId: client.id,
      clientName: client.name,
      assignedManagerId: gestionnaires[0].id,
      delaiReglement: 5,
      delaiReclamation: 3,
      documentPath: '/contracts/test-bs.pdf',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
    },
  });

  // Create bordereaux
  const bordereaux: any[] = [];
  for (let i = 1; i <= 3; i++) {
    const bordereau = await prisma.bordereau.create({
      data: {
        reference: `BDX-BS-2024-${i.toString().padStart(3, '0')}`,
        clientId: client.id,
        contractId: contract.id,
        dateReception: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        delaiReglement: 5,
        statut: 'EN_COURS',
        nombreBS: Math.floor(Math.random() * 10) + 5,
      },
    });
    bordereaux.push(bordereau);
  }

  // Create bulletin soins
  const bsStates = ['IN_PROGRESS', 'EN_COURS', 'VALIDATED', 'REJECTED'];
  
  for (const bordereau of bordereaux) {
    for (let j = 1; j <= bordereau.nombreBS; j++) {
      const randomGestionnaire = gestionnaires[Math.floor(Math.random() * gestionnaires.length)];
      const randomState = bsStates[Math.floor(Math.random() * bsStates.length)];
      const daysAgo = Math.floor(Math.random() * 10) + 1;
      const dateCreation = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      const dueDate = new Date(dateCreation.getTime() + 5 * 24 * 60 * 60 * 1000);

      const bs = await prisma.bulletinSoin.create({
        data: {
          bordereauId: bordereau.id,
          numBs: `BS-${bordereau.reference}-${j.toString().padStart(3, '0')}`,
          etat: randomState,
          ownerId: randomState === 'IN_PROGRESS' || randomState === 'EN_COURS' ? randomGestionnaire.id : null,
          processedById: randomState === 'VALIDATED' || randomState === 'REJECTED' ? randomGestionnaire.id : null,
          processedAt: randomState === 'VALIDATED' || randomState === 'REJECTED' ? new Date() : null,
          codeAssure: `ASS${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
          dateCreation,
          dateMaladie: new Date(dateCreation.getTime() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
          dueDate,
          lien: `/documents/bs-${j}.pdf`,
          nomAssure: `Assuré ${j} ${bordereau.reference}`,
          nomBeneficiaire: `Bénéficiaire ${j}`,
          nomBordereau: bordereau.reference,
          nomPrestation: `Prestataire ${Math.floor(Math.random() * 5) + 1}`,
          nomSociete: client.name,
          observationGlobal: `Observation pour BS ${j}`,
          totalPec: Math.floor(Math.random() * 500) + 100,
          priority: Math.floor(Math.random() * 3) + 1,
        },
      });

      // Create BS items
      const itemCount = Math.floor(Math.random() * 3) + 1;
      for (let k = 1; k <= itemCount; k++) {
        await prisma.bulletinSoinItem.create({
          data: {
            bulletinSoinId: bs.id,
            nomProduit: `Produit ${k}`,
            quantite: Math.floor(Math.random() * 5) + 1,
            commentaire: `Commentaire item ${k}`,
            nomChapitre: `Chapitre ${Math.floor(Math.random() * 3) + 1}`,
            nomPrestataire: `Prestataire ${k}`,
            datePrestation: new Date(dateCreation.getTime() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000),
            typeHonoraire: Math.random() > 0.5 ? 'FIXE' : 'VARIABLE',
            depense: Math.floor(Math.random() * 200) + 50,
            pec: Math.floor(Math.random() * 150) + 30,
            participationAdherent: Math.floor(Math.random() * 50) + 10,
            message: `Message ${k}`,
            codeMessage: `CODE${k}`,
            acuiteDroite: Math.random() * 10,
            acuiteGauche: Math.random() * 10,
            nombreCle: `CLE${k}`,
            nbJourDepassement: Math.floor(Math.random() * 5),
          },
        });
      }

      // Create some logs
      await prisma.bSLog.create({
        data: {
          bsId: bs.id,
          userId: randomGestionnaire.id,
          action: 'Créé',
          timestamp: dateCreation,
        },
      });

      if (randomState === 'VALIDATED' || randomState === 'REJECTED') {
        await prisma.bSLog.create({
          data: {
            bsId: bs.id,
            userId: randomGestionnaire.id,
            action: randomState === 'VALIDATED' ? 'Validé' : 'Rejeté',
            timestamp: new Date(),
          },
        });
      }
    }
  }

  console.log('✅ BS data seeded successfully!');
  console.log(`Created ${gestionnaires.length} gestionnaires`);
  console.log(`Created ${bordereaux.length} bordereaux`);
  
  const bsCount = await prisma.bulletinSoin.count();
  console.log(`Created ${bsCount} bulletin soins`);
}

seedBSData()
  .catch((e) => {
    console.error('❌ Error seeding BS data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });