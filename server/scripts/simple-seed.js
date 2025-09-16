const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  console.log('🧹 Clearing existing data...');
  try {
    await prisma.bSLog.deleteMany();
    await prisma.bulletinSoinItem.deleteMany();
    await prisma.expertiseInfo.deleteMany();
    await prisma.bulletinSoin.deleteMany();
    await prisma.virement.deleteMany();
    await prisma.courrier.deleteMany();
    await prisma.workflowAssignmentHistory.deleteMany();
    await prisma.workflowAssignment.deleteMany();
    await prisma.workflowNotification.deleteMany();
    await prisma.reclamationHistory.deleteMany();
    await prisma.reclamation.deleteMany();
    await prisma.traitementHistory.deleteMany();
    await prisma.bordereauxAuditLog.deleteMany();
    await prisma.actionLog.deleteMany();
    await prisma.alertLog.deleteMany();
    await prisma.oCRLog.deleteMany();
    await prisma.document.deleteMany();
    await prisma.bordereau.deleteMany();
    await prisma.contractHistory.deleteMany();
    await prisma.contract.deleteMany();
    await prisma.client.deleteMany();
    await prisma.prestataire.deleteMany();
    await prisma.process.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.feedback.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.passwordResetToken.deleteMany();
    await prisma.userLockout.deleteMany();
    await prisma.template.deleteMany();
    await prisma.gecTemplate.deleteMany();
    await prisma.syncLog.deleteMany();
    await prisma.user.deleteMany();
  } catch (error) {
    console.log('⚠️ Some tables may not exist yet, continuing...');
  }

  // 1. Create Users
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'superadmin@ars.tn',
        password: hashedPassword,
        fullName: 'Super Admin',
        role: 'SUPER_ADMIN',
        active: true,
        capacity: 100,
      },
    }),
    prisma.user.create({
      data: {
        email: 'admin@ars.tn',
        password: hashedPassword,
        fullName: 'Admin ARS',
        role: 'ADMINISTRATEUR',
        active: true,
        capacity: 80,
      },
    }),
    prisma.user.create({
      data: {
        email: 'chef.sante@ars.tn',
        password: hashedPassword,
        fullName: 'Chef Équipe Santé',
        role: 'CHEF_EQUIPE',
        department: 'SANTE',
        active: true,
        capacity: 50,
      },
    }),
    prisma.user.create({
      data: {
        email: 'gestionnaire1@ars.tn',
        password: hashedPassword,
        fullName: 'Gestionnaire 1',
        role: 'GESTIONNAIRE',
        department: 'SANTE',
        active: true,
        capacity: 25,
      },
    }),
    prisma.user.create({
      data: {
        email: 'gestionnaire2@ars.tn',
        password: hashedPassword,
        fullName: 'Gestionnaire 2',
        role: 'GESTIONNAIRE',
        department: 'SANTE',
        active: true,
        capacity: 30,
      },
    }),
    prisma.user.create({
      data: {
        email: 'bo@ars.tn',
        password: hashedPassword,
        fullName: 'Bureau Ordre',
        role: 'CLIENT_SERVICE',
        department: 'BO',
        active: true,
        capacity: 40,
      },
    }),
    prisma.user.create({
      data: {
        email: 'scan@ars.tn',
        password: hashedPassword,
        fullName: 'Service Scan',
        role: 'MANAGER',
        department: 'SCAN',
        active: true,
        capacity: 60,
      },
    }),
    prisma.user.create({
      data: {
        email: 'finance@ars.tn',
        password: hashedPassword,
        fullName: 'Service Finance',
        role: 'MANAGER',
        department: 'FINANCE',
        active: true,
        capacity: 50,
      },
    }),
  ]);

  console.log('✅ Users created');

  // 2. Create Processes
  const processes = await Promise.all([
    prisma.process.create({
      data: {
        name: 'REMBOURSEMENT_SANTE',
        description: 'Processus de remboursement des soins de santé',
      },
    }),
    prisma.process.create({
      data: {
        name: 'RECLAMATION_CLIENT',
        description: 'Processus de traitement des réclamations clients',
      },
    }),
  ]);

  console.log('✅ Processes created');

  // 3. Create Prestataires
  const prestataires = await Promise.all([
    prisma.prestataire.create({ data: { name: 'CLINIQUE HANNIBAL' } }),
    prisma.prestataire.create({ data: { name: 'HOPITAL CHARLES NICOLLE' } }),
    prisma.prestataire.create({ data: { name: 'CABINET DR AHMED' } }),
    prisma.prestataire.create({ data: { name: 'CENTRE MEDICAL PASTEUR' } }),
    prisma.prestataire.create({ data: { name: 'CLINIQUE INTERNATIONALE' } }),
  ]);

  console.log('✅ Prestataires created');

  // 4. Create Clients
  const clients = await Promise.all([
    prisma.client.create({
      data: {
        name: 'ASSURANCES SALIM',
        reglementDelay: 30,
        reclamationDelay: 15,
        address: 'Avenue Habib Bourguiba, Tunis',
        email: 'contact@salim.tn',
        phone: '+216 71 123 456',
        status: 'active',
        slaConfig: { maxDelay: 30, alertThreshold: 25 },
      },
    }),
    prisma.client.create({
      data: {
        name: 'MAGHREBIA VIE',
        reglementDelay: 45,
        reclamationDelay: 20,
        address: 'Rue de la Liberté, Tunis',
        email: 'service@maghrebia.tn',
        phone: '+216 71 234 567',
        status: 'active',
        slaConfig: { maxDelay: 45, alertThreshold: 40 },
      },
    }),
    prisma.client.create({
      data: {
        name: 'STAR ASSURANCES',
        reglementDelay: 30,
        reclamationDelay: 10,
        address: 'Avenue Mohamed V, Sfax',
        email: 'info@star.tn',
        phone: '+216 74 345 678',
        status: 'active',
        slaConfig: { maxDelay: 30, alertThreshold: 20 },
      },
    }),
  ]);

  console.log('✅ Clients created');

  // 5. Create Contracts
  const contracts = [];
  for (let i = 0; i < clients.length; i++) {
    const client = clients[i];
    const contract = await prisma.contract.create({
      data: {
        clientId: client.id,
        clientName: client.name,
        delaiReglement: client.reglementDelay,
        delaiReclamation: client.reclamationDelay,
        escalationThreshold: Math.floor(client.reglementDelay * 0.8),
        documentPath: `/contracts/${client.name.toLowerCase().replace(/\s+/g, '_')}_2024.pdf`,
        assignedManagerId: users[2].id,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        version: 1,
        thresholds: { 
          warning: Math.floor(client.reglementDelay * 0.7), 
          critical: Math.floor(client.reglementDelay * 0.9) 
        },
      },
    });
    contracts.push(contract);
  }

  console.log('✅ Contracts created');

  // 6. Create Bordereaux
  const bordereaux = [];
  const statuses = ['EN_ATTENTE', 'A_SCANNER', 'SCAN_EN_COURS', 'SCANNE', 'A_AFFECTER', 'ASSIGNE', 'EN_COURS', 'TRAITE', 'CLOTURE'];
  
  for (let i = 1; i <= 20; i++) {
    const client = clients[Math.floor(Math.random() * clients.length)];
    const contract = contracts.find(c => c.clientId === client.id);
    const prestataire = prestataires[Math.floor(Math.random() * prestataires.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    const dateReception = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    const nombreBS = Math.floor(Math.random() * 20) + 5;
    
    let assignedUser = null;
    if (['ASSIGNE', 'EN_COURS', 'TRAITE', 'CLOTURE'].includes(status)) {
      assignedUser = users[Math.floor(Math.random() * 2) + 3]; // Gestionnaires
    }

    const bordereau = await prisma.bordereau.create({
      data: {
        reference: `BORD-2024-${i.toString().padStart(4, '0')}`,
        dateReception,
        clientId: client.id,
        contractId: contract?.id,
        delaiReglement: client.reglementDelay,
        nombreBS,
        statut: status,
        assignedToUserId: assignedUser?.id,
        prestataireId: prestataire.id,
        priority: Math.floor(Math.random() * 3) + 1,
        scanStatus: ['EN_ATTENTE', 'A_SCANNER'].includes(status) ? 'NON_SCANNE' : 'SCANNE',
        completionRate: status === 'CLOTURE' ? 100 : 
                       status === 'TRAITE' ? Math.floor(Math.random() * 20) + 80 :
                       status === 'EN_COURS' ? Math.floor(Math.random() * 60) + 20 : 0,
      },
    });
    bordereaux.push(bordereau);
  }

  console.log('✅ Bordereaux created');

  // 7. Create Documents
  for (const bordereau of bordereaux) {
    await prisma.document.create({
      data: {
        name: `Document_${bordereau.reference}`,
        type: 'PDF',
        path: `/uploads/bordereaux/${bordereau.reference}.pdf`,
        uploadedById: users[5].id, // BO user
        bordereauId: bordereau.id,
        status: bordereau.statut === 'CLOTURE' ? 'TRAITE' : 
               bordereau.statut === 'EN_COURS' ? 'EN_COURS' : 'UPLOADED',
        ocrText: `OCR extracted text for ${bordereau.reference}`,
        ocrResult: { 
          confidence: Math.random() * 0.3 + 0.7, 
          pages: Math.floor(Math.random() * 5) + 1
        },
      },
    });
  }

  console.log('✅ Documents created');

  // 8. Create BulletinSoins
  for (const bordereau of bordereaux) {
    const client = clients.find(c => c.id === bordereau.clientId);
    
    for (let i = 1; i <= Math.min(bordereau.nombreBS, 5); i++) {
      const dateSoin = new Date(bordereau.dateReception.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      const montant = Math.floor(Math.random() * 1000) + 100;
      const totalPec = Math.floor(montant * (0.6 + Math.random() * 0.3));
      
      const bs = await prisma.bulletinSoin.create({
        data: {
          bordereauId: bordereau.id,
          numBs: `BS-${bordereau.reference}-${i.toString().padStart(3, '0')}`,
          codeAssure: `ASS${Math.floor(Math.random() * 10000)}`,
          nomAssure: `Assuré ${i}`,
          nomBeneficiaire: `Bénéficiaire ${i}`,
          nomSociete: client?.name || 'Société',
          matricule: `MAT${Math.floor(Math.random() * 100000)}`,
          dateSoin,
          montant,
          acte: ['Consultation', 'Analyse', 'Radiographie'][Math.floor(Math.random() * 3)],
          nomPrestation: ['Consultation générale', 'Analyse sanguine', 'Radio thorax'][Math.floor(Math.random() * 3)],
          nomBordereau: bordereau.reference,
          lien: `https://ars.tn/bs/${bordereau.reference}/${i}`,
          dateCreation: bordereau.dateReception,
          dateMaladie: new Date(dateSoin.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          totalPec,
          observationGlobal: ['RAS', 'Dossier complet', 'À vérifier'][Math.floor(Math.random() * 3)],
          etat: ['IN_PROGRESS', 'VALIDATED', 'REJECTED'][Math.floor(Math.random() * 3)],
          ownerId: bordereau.assignedToUserId,
        },
      });

      // Create BulletinSoinItem
      await prisma.bulletinSoinItem.create({
        data: {
          bulletinSoinId: bs.id,
          nomProduit: 'Consultation spécialisée',
          quantite: 1,
          commentaire: 'Traitement standard',
          nomChapitre: 'Médecine générale',
          nomPrestataire: prestataires[Math.floor(Math.random() * prestataires.length)].name,
          datePrestation: dateSoin,
          typeHonoraire: 'FIXE',
          depense: Math.floor(Math.random() * 200) + 50,
          pec: Math.floor(Math.random() * 150) + 40,
          participationAdherent: Math.floor(Math.random() * 50) + 10,
          message: 'Remboursement approuvé',
          codeMessage: 'APPROVED',
          acuiteDroite: Math.random() * 20,
          acuiteGauche: Math.random() * 20,
          nombreCle: `CLE${Math.floor(Math.random() * 1000)}`,
          nbJourDepassement: 0,
        },
      });

      // Create ExpertiseInfo
      await prisma.expertiseInfo.create({
        data: {
          bulletinSoinId: bs.id,
          isFavorable: ['FAVORABLE', 'DEFAVORABLE'][Math.floor(Math.random() * 2)],
          matriculeAdherent: `MAT${Math.floor(Math.random() * 100000)}`,
          numBS: bs.numBs,
          contrat: contracts.find(c => c.clientId === bordereau.clientId)?.id || 'N/A',
          cin: `${Math.floor(Math.random() * 100000000)}`,
          vlodsphere: Math.random() * 2,
          vpogsphere: Math.random() * 2,
          prixMonture: Math.floor(Math.random() * 300) + 100,
          codification: `COD${Math.floor(Math.random() * 1000)}`,
          natureActe: 'Consultation',
          societe: client?.name || 'Société',
          dents: '11,12,13',
        },
      });
    }
  }

  console.log('✅ BulletinSoins with Items and Expertises created');

  // 9. Create Reclamations
  for (let i = 1; i <= 10; i++) {
    const client = clients[Math.floor(Math.random() * clients.length)];
    const bordereau = bordereaux.find(b => b.clientId === client.id) || bordereaux[0];
    
    const reclamation = await prisma.reclamation.create({
      data: {
        clientId: client.id,
        bordereauId: Math.random() > 0.5 ? bordereau.id : null,
        type: ['REMBOURSEMENT', 'DELAI', 'SERVICE'][Math.floor(Math.random() * 3)],
        severity: ['BASSE', 'MOYENNE', 'HAUTE'][Math.floor(Math.random() * 3)],
        status: ['OUVERTE', 'EN_COURS', 'FERMEE'][Math.floor(Math.random() * 3)],
        description: `Réclamation ${i} - Problème de traitement`,
        assignedToId: users[Math.floor(Math.random() * 2) + 3].id,
        createdById: users[5].id, // BO user
        contractId: contracts.find(c => c.clientId === client.id)?.id,
        department: 'SANTE',
        processId: processes[1].id,
        priority: Math.floor(Math.random() * 3) + 1,
      },
    });

    // Create ReclamationHistory
    await prisma.reclamationHistory.create({
      data: {
        reclamationId: reclamation.id,
        userId: users[5].id,
        action: 'CREATED',
        description: 'Réclamation créée par le service client',
        aiSuggestions: {
          suggestions: ['Contacter le client', 'Vérifier le dossier'],
          confidence: 0.85
        },
      },
    });
  }

  console.log('✅ Reclamations with History created');

  // 10. Create Templates
  await Promise.all([
    prisma.template.create({
      data: {
        name: 'Notification Règlement',
        subject: 'Notification de règlement - {{reference}}',
        body: 'Cher client, votre bordereau {{reference}} a été traité.',
        variables: ['reference'],
      },
    }),
    prisma.template.create({
      data: {
        name: 'Relance Documents',
        subject: 'Documents manquants - {{reference}}',
        body: 'Des documents sont manquants pour {{reference}}.',
        variables: ['reference'],
      },
    }),
  ]);

  console.log('✅ Templates created');

  // 11. Create Notifications
  for (const user of users) {
    for (let i = 0; i < 3; i++) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: ['INFO', 'WARNING', 'SUCCESS'][Math.floor(Math.random() * 3)],
          title: ['Nouveau dossier', 'Délai approchant', 'Traitement terminé'][Math.floor(Math.random() * 3)],
          message: `Notification ${i + 1} pour ${user.fullName}`,
          data: { priority: Math.floor(Math.random() * 3) + 1 },
          read: Math.random() > 0.5,
        },
      });
    }
  }

  console.log('✅ Notifications created');

  // 12. Create Feedback
  await prisma.feedback.create({
    data: {
      userId: users[3].id,
      message: 'Interface très intuitive, bon travail!',
      page: '/dashboard',
    },
  });

  console.log('✅ Feedback created');

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`- Users: ${users.length}`);
  console.log(`- Processes: ${processes.length}`);
  console.log(`- Prestataires: ${prestataires.length}`);
  console.log(`- Clients: ${clients.length}`);
  console.log(`- Contracts: ${contracts.length}`);
  console.log(`- Bordereaux: ${bordereaux.length}`);
  console.log(`- Documents: ${bordereaux.length}`);
  console.log(`- BulletinSoins: ~${bordereaux.length * 3} (with Items & Expertises)`);
  console.log(`- Reclamations: 10 (with History)`);
  console.log(`- Templates: 2`);
  console.log(`- Notifications: ~${users.length * 3}`);
  console.log(`- Feedback: 1`);
  
  console.log('\n🔑 Login credentials:');
  console.log('- superadmin@ars.tn / password123 (SUPER_ADMIN)');
  console.log('- admin@ars.tn / password123 (ADMINISTRATEUR)');
  console.log('- chef.sante@ars.tn / password123 (CHEF_EQUIPE)');
  console.log('- gestionnaire1@ars.tn / password123 (GESTIONNAIRE)');
  console.log('- gestionnaire2@ars.tn / password123 (GESTIONNAIRE)');
  console.log('- bo@ars.tn / password123 (CLIENT_SERVICE)');
  console.log('- scan@ars.tn / password123 (MANAGER - SCAN)');
  console.log('- finance@ars.tn / password123 (MANAGER - FINANCE)');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());