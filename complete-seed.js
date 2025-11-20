const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting complete database seeding...');

  // Clear existing data
  console.log('🧹 Clearing existing data...');
  await prisma.document.deleteMany();
  await prisma.bulletinSoin.deleteMany();
  await prisma.bordereau.deleteMany();
  await prisma.virement.deleteMany();
  await prisma.reclamation.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.user.deleteMany();
  await prisma.client.deleteMany();

  // Create Users first (needed for other relations)
  console.log('👤 Creating users...');
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'superadmin@ars.ma',
        password: hashedPassword,
        fullName: 'Super Admin',
        role: 'SUPER_ADMIN'
      }
    }),
    prisma.user.create({
      data: {
        email: 'chef.equipe@ars.ma',
        password: hashedPassword,
        fullName: 'Ahmed Benali',
        role: 'CHEF_EQUIPE'
      }
    }),
    prisma.user.create({
      data: {
        email: 'gestionnaire.senior@ars.ma',
        password: hashedPassword,
        fullName: 'Fatima Alami',
        role: 'GESTIONNAIRE_SENIOR'
      }
    }),
    prisma.user.create({
      data: {
        email: 'gestionnaire1@ars.ma',
        password: hashedPassword,
        fullName: 'Omar Tazi',
        role: 'GESTIONNAIRE'
      }
    }),
    prisma.user.create({
      data: {
        email: 'finance@ars.ma',
        password: hashedPassword,
        fullName: 'Youssef Benjelloun',
        role: 'FINANCE'
      }
    }),
    prisma.user.create({
      data: {
        email: 'scan@ars.ma',
        password: hashedPassword,
        fullName: 'Laila Chakir',
        role: 'SCAN_TEAM'
      }
    })
  ]);

  // Create Clients
  console.log('👥 Creating clients...');
  const clients = await Promise.all([
    prisma.client.create({
      data: {
        name: 'CNSS',
        email: 'contact@cnss.ma',
        phone: '+212522123456',
        address: 'Casablanca, Morocco',
        reglementDelay: 30,
        reclamationDelay: 15
      }
    }),
    prisma.client.create({
      data: {
        name: 'CNOPS',
        email: 'info@cnops.ma',
        phone: '+212537654321',
        address: 'Rabat, Morocco',
        reglementDelay: 35,
        reclamationDelay: 15
      }
    }),
    prisma.client.create({
      data: {
        name: 'RAMED',
        email: 'support@ramed.ma',
        phone: '+212522987654',
        address: 'Casablanca, Morocco',
        reglementDelay: 40,
        reclamationDelay: 20
      }
    })
  ]);

  // Create Contracts
  console.log('📋 Creating contracts...');
  const contracts = await Promise.all(
    clients.map((client, index) => 
      prisma.contract.create({
        data: {
          clientId: client.id,
          clientName: client.name,
          codeAssure: `CODE_${client.name.toUpperCase()}_${index + 1}`,
          delaiReclamation: 15,
          delaiReglement: 30 + (index * 5),
          documentPath: `/contracts/${client.name.toLowerCase()}_contract.pdf`,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          signature: `Contrat signé électroniquement - ${client.name}`,
          version: 1
        }
      })
    )
  );

  // Create Bordereaux
  console.log('📄 Creating bordereaux...');
  const bordereaux = [];
  
  for (let i = 0; i < 15; i++) {
    const client = clients[i % clients.length];
    const contract = contracts[i % contracts.length];
    
    const statuses = ['EN_ATTENTE', 'A_SCANNER', 'SCANNE', 'ASSIGNE', 'EN_COURS', 'TRAITE'];
    const status = statuses[i % statuses.length];
    
    let assignedUser = null;
    if (['ASSIGNE', 'EN_COURS', 'TRAITE'].includes(status)) {
      const gestionnaires = users.filter(u => ['GESTIONNAIRE', 'GESTIONNAIRE_SENIOR'].includes(u.role));
      assignedUser = gestionnaires[i % gestionnaires.length];
    }

    const bordereau = await prisma.bordereau.create({
      data: {
        reference: `BDX-2024-${String(i + 1).padStart(4, '0')}`,
        clientId: client.id,
        contractId: contract.id,
        dateReception: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)),
        statut: status,
        currentHandlerId: assignedUser?.id,
        priority: i % 3 === 0 ? 3 : i % 3 === 1 ? 2 : 1,
        nombreBS: Math.floor(Math.random() * 50) + 10,
        delaiReglement: client.reglementDelay
      }
    });
    
    bordereaux.push(bordereau);
  }

  // Create Documents
  console.log('📎 Creating documents...');
  for (const bordereau of bordereaux) {
    const numDocs = Math.floor(Math.random() * 3) + 1;
    
    for (let j = 0; j < numDocs; j++) {
      const docTypes = ['BULLETIN_SOIN', 'COMPLEMENT_INFORMATION', 'RECLAMATION'];
      const docType = docTypes[j % docTypes.length];
      
      await prisma.document.create({
        data: {
          name: `document_${bordereau.reference}_${j + 1}.pdf`,
          type: docType,
          path: `/uploads/bordereaux/${bordereau.id}/document_${j + 1}.pdf`,
          uploadedById: users.find(u => u.role === 'SCAN_TEAM')?.id || users[0].id,
          bordereauId: bordereau.id,
          ocrText: `OCR content for document ${j + 1} of bordereau ${bordereau.reference}`
        }
      });
    }
  }

  // Create Bulletin de Soin
  console.log('🏥 Creating bulletins de soin...');
  for (let i = 0; i < 10; i++) {
    const bordereau = bordereaux[i];
    
    await prisma.bulletinSoin.create({
      data: {
        bordereauId: bordereau.id,
        numBs: `BS-${bordereau.reference}-${String(i + 1).padStart(2, '0')}`,
        etat: 'VALIDE',
        codeAssure: `CODE_${i + 1}`,
        dateCreation: new Date(),
        dateMaladie: new Date(Date.now() - (Math.random() * 30 * 24 * 60 * 60 * 1000)),
        lien: 'CONJOINT',
        nomAssure: `Assuré ${i + 1}`,
        nomBeneficiaire: `Bénéficiaire ${i + 1}`,
        nomBordereau: bordereau.reference,
        nomPrestation: 'Consultation médicale',
        nomSociete: clients[i % clients.length].name,
        observationGlobal: `Observation ${i + 1}`,
        totalPec: Math.floor(Math.random() * 2000) + 100
      }
    });
  }

  // Create Virements
  console.log('💰 Creating virements...');
  const processedBordereaux = bordereaux.filter(b => b.statut === 'TRAITE');
  
  for (const bordereau of processedBordereaux.slice(0, 3)) {
    await prisma.virement.create({
      data: {
        bordereauId: bordereau.id,
        montant: Math.floor(Math.random() * 50000) + 10000,
        referenceBancaire: `REF-${Date.now()}-${bordereau.id}`,
        dateDepot: new Date(),
        dateExecution: new Date(Date.now() + (24 * 60 * 60 * 1000))
      }
    });
  }

  // Create Reclamations
  console.log('📢 Creating reclamations...');
  for (let i = 0; i < 5; i++) {
    const bordereau = bordereaux[i];
    await prisma.reclamation.create({
      data: {
        clientId: bordereau.clientId,
        bordereauId: bordereau.id,
        type: i % 2 === 0 ? 'RETARD_TRAITEMENT' : 'MONTANT_INCORRECT',
        severity: 'MOYENNE',
        status: 'OUVERTE',
        description: `Réclamation concernant le bordereau ${bordereau.reference}`,
        createdById: users.find(u => u.role === 'CHEF_EQUIPE')?.id || users[0].id,
        assignedToId: users.find(u => u.role === 'CHEF_EQUIPE')?.id,
        priority: 1
      }
    });
  }

  console.log('✅ Database seeding completed successfully!');
  console.log(`Created:
  - ${clients.length} clients
  - ${contracts.length} contracts  
  - ${users.length} users
  - ${bordereaux.length} bordereaux
  - Documents and bulletins for each bordereau
  - ${processedBordereaux.slice(0, 3).length} virements
  - 5 reclamations`);

  console.log('\n👤 User accounts created:');
  console.log('Email: superadmin@ars.ma | Password: password123 | Role: SUPER_ADMIN');
  console.log('Email: chef.equipe@ars.ma | Password: password123 | Role: CHEF_EQUIPE');
  console.log('Email: gestionnaire.senior@ars.ma | Password: password123 | Role: GESTIONNAIRE_SENIOR');
  console.log('Email: gestionnaire1@ars.ma | Password: password123 | Role: GESTIONNAIRE');
  console.log('Email: finance@ars.ma | Password: password123 | Role: FINANCE');
  console.log('Email: scan@ars.ma | Password: password123 | Role: SCAN_TEAM');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });