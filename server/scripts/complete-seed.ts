import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting COMPLETE database seed...');

  // 1. Create Users (all roles)
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

  // 2. Create Processes
  const processes = await Promise.all([
    prisma.process.create({
      data: {
        name: 'REMBOURSEMENT',
        description: 'Processus de remboursement des soins',
      },
    }),
    prisma.process.create({
      data: {
        name: 'RECLAMATION',
        description: 'Processus de traitement des réclamations',
      },
    }),
  ]);

  console.log('✅ Processes created');

  // 3. Create Prestataires
  const prestataires = await Promise.all([
    prisma.prestataire.create({
      data: { name: 'CLINIQUE HANNIBAL' },
    }),
    prisma.prestataire.create({
      data: { name: 'HOPITAL CHARLES NICOLLE' },
    }),
    prisma.prestataire.create({
      data: { name: 'CABINET DR AHMED' },
    }),
  ]);

  console.log('✅ Prestataires created');

  // 4. Create Clients
  const clients = await Promise.all([
    prisma.client.upsert({
      where: { name: 'ASSURANCES SALIM' },
      update: {},
      create: {
        name: 'ASSURANCES SALIM',
        reglementDelay: 30,
        reclamationDelay: 15,
        slaConfig: { maxDelay: 30, alertThreshold: 25 },
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
        slaConfig: { maxDelay: 45, alertThreshold: 40 },
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
        slaConfig: { maxDelay: 30, alertThreshold: 20 },
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
        slaConfig: { maxDelay: 60, alertThreshold: 50 },
        gestionnaires: {
          connect: [{ id: users[3].id }, { id: users[4].id }]
        }
      },
    }),
  ]);

  console.log('✅ Clients created');

  // 5. Create Contracts
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
        thresholds: { warning: 20, critical: 25 },
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
        thresholds: { warning: 35, critical: 40 },
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
        thresholds: { warning: 20, critical: 25 },
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
        thresholds: { warning: 45, critical: 50 },
      },
    }),
  ]);

  console.log('✅ Contracts created');

  // 6. Create Bordereaux
  const bordereaux = await Promise.all([
    prisma.bordereau.upsert({
      where: { reference: 'BORD-2024-001' },
      update: {},
      create: {
        reference: 'BORD-2024-001',
        dateReception: new Date('2024-08-01'),
        clientId: clients[0].id,
        contractId: contracts[0].id,
        delaiReglement: 30,
        nombreBS: 15,
        statut: 'EN_COURS',
        assignedToUserId: users[3].id,
        prestataireId: prestataires[0].id,
      },
    }),
    prisma.bordereau.upsert({
      where: { reference: 'BORD-2024-002' },
      update: {},
      create: {
        reference: 'BORD-2024-002',
        dateReception: new Date('2024-08-05'),
        clientId: clients[1].id,
        contractId: contracts[1].id,
        delaiReglement: 45,
        nombreBS: 25,
        statut: 'SCANNE',
        prestataireId: prestataires[1].id,
      },
    }),
    prisma.bordereau.upsert({
      where: { reference: 'BORD-2024-003' },
      update: {},
      create: {
        reference: 'BORD-2024-003',
        dateReception: new Date('2024-08-10'),
        clientId: clients[2].id,
        contractId: contracts[2].id,
        delaiReglement: 30,
        nombreBS: 8,
        statut: 'A_SCANNER',
        prestataireId: prestataires[2].id,
      },
    }),
    prisma.bordereau.upsert({
      where: { reference: 'BORD-2024-004' },
      update: {},
      create: {
        reference: 'BORD-2024-004',
        dateReception: new Date('2024-08-15'),
        clientId: clients[3].id,
        contractId: contracts[3].id,
        delaiReglement: 60,
        nombreBS: 35,
        statut: 'TRAITE',
        assignedToUserId: users[4].id,
        dateCloture: new Date('2024-08-20'),
        prestataireId: prestataires[0].id,
      },
    }),
    prisma.bordereau.upsert({
      where: { reference: 'BORD-2024-005' },
      update: {},
      create: {
        reference: 'BORD-2024-005',
        dateReception: new Date('2024-08-20'),
        clientId: clients[0].id,
        contractId: contracts[0].id,
        delaiReglement: 30,
        nombreBS: 12,
        statut: 'EN_DIFFICULTE',
        assignedToUserId: users[3].id,
        prestataireId: prestataires[1].id,
      },
    }),
  ]);

  console.log('✅ Bordereaux created');

  // 7. Create Documents
  for (const bordereau of bordereaux) {
    await prisma.document.create({
      data: {
        name: `Document_${bordereau.reference}`,
        type: 'BULLETIN_SOIN',
        path: `/uploads/${bordereau.reference}.pdf`,
        uploadedById: users[5].id,
        bordereauId: bordereau.id,
        status: 'TRAITE',
        ocrText: `OCR text for ${bordereau.reference}`,
        ocrResult: { confidence: 0.95, pages: 3 },
      },
    });
  }

  console.log('✅ Documents created');

  // 8. Create BulletinSoins with Items and Expertises
  for (const bordereau of bordereaux) {
    const client = clients.find(c => c.id === bordereau.clientId);
    for (let i = 1; i <= Math.min(bordereau.nombreBS, 3); i++) {
      const bs = await prisma.bulletinSoin.create({
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

      // Create BulletinSoinItems
      await prisma.bulletinSoinItem.create({
        data: {
          bulletinSoinId: bs.id,
          nomProduit: 'Consultation générale',
          quantite: 1,
          commentaire: 'Consultation standard',
          nomChapitre: 'Médecine générale',
          nomPrestataire: prestataires[i % prestataires.length].name,
          datePrestation: new Date(),
          typeHonoraire: 'FIXE',
          depense: 50.0,
          pec: 40.0,
          participationAdherent: 10.0,
          message: 'Remboursement approuvé',
          codeMessage: 'APPROVED',
          acuiteDroite: 10.0,
          acuiteGauche: 10.0,
          nombreCle: 'CLE001',
          nbJourDepassement: 0,
        },
      });

      // Create ExpertiseInfo
      await prisma.expertiseInfo.create({
        data: {
          bulletinSoinId: bs.id,
          isFavorable: 'FAVORABLE',
          matriculeAdherent: `MAT${Math.floor(Math.random() * 100000)}`,
          numBS: bs.numBs,
          contrat: contracts.find(c => c.clientId === bordereau.clientId)?.id || 'N/A',
          cin: `${Math.floor(Math.random() * 100000000)}`,
          vlodsphere: 0.5,
          vpogsphere: 0.5,
          prixMonture: 150.0,
          codification: 'COD001',
          natureActe: 'Consultation',
          societe: client?.name || 'Société',
          dents: '11,12,13',
        },
      });
    }
  }

  console.log('✅ BulletinSoins with Items and Expertises created');

  // 9. Create Reclamations with History
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
        processId: processes[0].id,
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
        processId: processes[1].id,
      },
    }),
  ]);

  // Create ReclamationHistory
  for (const reclamation of reclamations) {
    await prisma.reclamationHistory.create({
      data: {
        reclamationId: reclamation.id,
        userId: users[5].id,
        action: 'CREATED',
        description: 'Réclamation créée',
        aiSuggestions: { suggestions: ['Contacter le client', 'Vérifier le dossier'] },
      },
    });
  }

  console.log('✅ Reclamations with History created');

  // 10. Create Virements
  for (const bordereau of bordereaux.slice(0, 2)) {
    await prisma.virement.upsert({
      where: { bordereauId: bordereau.id },
      update: {},
      create: {
        bordereauId: bordereau.id,
        montant: Math.floor(Math.random() * 10000) + 1000,
        referenceBancaire: `REF${Math.floor(Math.random() * 1000000)}`,
        dateDepot: new Date(),
        dateExecution: new Date(Date.now() + 24 * 60 * 60 * 1000),
        confirmed: true,
        confirmedById: users[7].id,
        confirmedAt: new Date(),
      },
    });
  }

  console.log('✅ Virements created');

  // 11. Create Wire Transfer System
  const society = await prisma.society.upsert({
    where: { code: 'ARS_TN' },
    update: {},
    create: {
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

  // Create WireTransferBatch
  const batch = await prisma.wireTransferBatch.create({
    data: {
      societyId: society.id,
      donneurId: donneur.id,
      status: 'CREATED',
      fileName: 'batch_001.xlsx',
      fileType: 'EXCEL',
    },
  });

  // Create WireTransfers
  for (const member of members) {
    await prisma.wireTransfer.create({
      data: {
        batchId: batch.id,
        memberId: member.id,
        donneurId: donneur.id,
        amount: Math.floor(Math.random() * 5000) + 500,
        reference: `WT${Math.floor(Math.random() * 1000000)}`,
        status: 'PENDING',
      },
    });
  }

  console.log('✅ Wire Transfer System created');

  // 12. Create Templates
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

  // 13. Create Courriers
  for (const bordereau of bordereaux.slice(0, 2)) {
    await prisma.courrier.create({
      data: {
        subject: `Courrier pour ${bordereau.reference}`,
        body: `Contenu du courrier pour le bordereau ${bordereau.reference}`,
        type: 'REGLEMENT',
        templateUsed: 'Notification Règlement',
        status: 'SENT',
        sentAt: new Date(),
        bordereauId: bordereau.id,
        uploadedById: users[5].id,
      },
    });
  }

  console.log('✅ Courriers created');

  // 14. Create Workflow Assignments
  for (const bordereau of bordereaux.slice(0, 3)) {
    const assignment = await prisma.workflowAssignment.create({
      data: {
        taskId: bordereau.id,
        taskType: 'BORDEREAU_PROCESSING',
        assigneeId: bordereau.assignedToUserId || users[3].id,
        status: 'IN_PROGRESS',
        notes: `Traitement du bordereau ${bordereau.reference}`,
      },
    });

    await prisma.workflowAssignmentHistory.create({
      data: {
        assignmentId: assignment.id,
        prevStatus: 'PENDING',
        newStatus: 'IN_PROGRESS',
        slaMet: true,
      },
    });
  }

  console.log('✅ Workflow Assignments created');

  // 15. Create Audit Logs
  for (const user of users.slice(0, 3)) {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        details: { ip: '192.168.1.1', userAgent: 'Mozilla/5.0' },
      },
    });
  }

  console.log('✅ Audit Logs created');

  // 16. Create Alert Logs
  for (const bordereau of bordereaux.slice(0, 2)) {
    await prisma.alertLog.create({
      data: {
        bordereauId: bordereau.id,
        alertType: 'SLA_WARNING',
        alertLevel: 'WARNING',
        message: `Bordereau ${bordereau.reference} approche de la limite SLA`,
        notifiedRoles: ['CHEF_EQUIPE', 'GESTIONNAIRE'],
      },
    });
  }

  console.log('✅ Alert Logs created');

  // 17. Create Feedback
  await prisma.feedback.create({
    data: {
      userId: users[3].id,
      message: 'Interface très intuitive, bon travail!',
      page: '/dashboard',
    },
  });

  console.log('✅ Feedback created');

  // 18. Create SyncLog
  await prisma.syncLog.create({
    data: {
      imported: 150,
      errors: 2,
      details: 'Synchronisation des données externes',
    },
  });

  console.log('✅ SyncLog created');

  console.log('🎉 COMPLETE database seeding finished successfully!');
  console.log('\n📊 Summary:');
  console.log(`- Users: ${users.length}`);
  console.log(`- Processes: ${processes.length}`);
  console.log(`- Prestataires: ${prestataires.length}`);
  console.log(`- Clients: ${clients.length}`);
  console.log(`- Contracts: ${contracts.length}`);
  console.log(`- Bordereaux: ${bordereaux.length}`);
  console.log(`- Documents: ${bordereaux.length}`);
  console.log(`- BulletinSoins: ${bordereaux.length * 3} (with Items & Expertises)`);
  console.log(`- Reclamations: ${reclamations.length} (with History)`);
  console.log(`- Virements: 2`);
  console.log(`- Wire Transfer System: Complete`);
  console.log(`- Templates: 2`);
  console.log(`- Courriers: 2`);
  console.log(`- Workflow Assignments: 3 (with History)`);
  console.log(`- Audit Logs: 3`);
  console.log(`- Alert Logs: 2`);
  console.log(`- Feedback: 1`);
  console.log(`- SyncLog: 1`);
  console.log('\n🔑 Login credentials:');
  console.log('- fikoll@mail.com / password (SUPER_ADMIN)');
  console.log('- admin@ars.com / password (ADMINISTRATEUR)');
  console.log('- chef@ars.com / password (CHEF_EQUIPE)');
  console.log('- gestionnaire1@ars.com / password (GESTIONNAIRE)');
  console.log('- bo@ars.com / password (CLIENT_SERVICE)');
  console.log('- scan@ars.com / password (MANAGER - SCAN)');
  console.log('- finance@ars.com / password (MANAGER - FINANCE)');
}

main()
  .catch((e) => {
    console.error('❌ Complete seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());