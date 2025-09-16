const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function seedMissingTables() {
  console.log('🌱 Seeding missing tables...');

  try {
    // Get existing data
    const users = await prisma.user.findMany();
    const clients = await prisma.client.findMany();
    const bordereaux = await prisma.bordereau.findMany();
    const bulletinSoins = await prisma.bulletinSoin.findMany();
    const documents = await prisma.document.findMany();
    const reclamations = await prisma.reclamation.findMany();

    // 1. Create Departments
    const departments = await Promise.all([
      prisma.department.create({
        data: {
          name: 'Bureau d\'Ordre',
          code: 'BO',
          serviceType: 'RECEPTION',
          description: 'Service de réception et enregistrement des dossiers',
        },
      }),
      prisma.department.create({
        data: {
          name: 'Service Scan',
          code: 'SCAN',
          serviceType: 'NUMERISATION',
          description: 'Service de numérisation des documents',
        },
      }),
      prisma.department.create({
        data: {
          name: 'Équipe Santé',
          code: 'SANTE',
          serviceType: 'TRAITEMENT',
          description: 'Service de traitement des bordereaux santé',
        },
      }),
      prisma.department.create({
        data: {
          name: 'Service Finance',
          code: 'FINANCE',
          serviceType: 'FINANCE',
          description: 'Service de gestion financière et virements',
        },
      }),
    ]);
    console.log('✅ Departments created');

    // 2. Create BulletinSoinItems and ExpertiseInfo
    for (const bs of bulletinSoins) {
      await prisma.bulletinSoinItem.create({
        data: {
          bulletinSoinId: bs.id,
          nomProduit: 'Consultation spécialisée',
          quantite: 1,
          commentaire: 'Traitement standard',
          nomChapitre: 'Médecine générale',
          nomPrestataire: 'Prestataire Test',
          datePrestation: bs.dateSoin || new Date(),
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

      await prisma.expertiseInfo.create({
        data: {
          bulletinSoinId: bs.id,
          isFavorable: ['FAVORABLE', 'DEFAVORABLE'][Math.floor(Math.random() * 2)],
          matriculeAdherent: bs.matricule || `MAT${Math.floor(Math.random() * 100000)}`,
          numBS: bs.numBs,
          contrat: 'CONTRAT_TEST',
          cin: `${Math.floor(Math.random() * 100000000)}`,
          vlodsphere: Math.random() * 2,
          vpogsphere: Math.random() * 2,
          prixMonture: Math.floor(Math.random() * 300) + 100,
          codification: `COD${Math.floor(Math.random() * 1000)}`,
          natureActe: 'Consultation',
          societe: bs.nomSociete,
          dents: '11,12,13',
        },
      });
    }
    console.log('✅ BulletinSoinItems and ExpertiseInfo created');

    // 3. Create ReclamationHistory
    for (const reclamation of reclamations) {
      await prisma.reclamationHistory.create({
        data: {
          reclamationId: reclamation.id,
          userId: reclamation.createdById,
          action: 'CREATED',
          description: 'Réclamation créée par le service client',
          aiSuggestions: {
            suggestions: ['Contacter le client', 'Vérifier le dossier'],
            confidence: 0.85
          },
        },
      });
    }
    console.log('✅ ReclamationHistory created');

    // 4. Create Adherents
    for (const client of clients) {
      for (let i = 1; i <= 10; i++) {
        await prisma.adherent.create({
          data: {
            matricule: `${client.name.substring(0, 3).toUpperCase()}${i.toString().padStart(6, '0')}`,
            nom: `Nom${i}`,
            prenom: `Prenom${i}`,
            clientId: client.id,
            rib: `${Math.floor(Math.random() * 10000000000000000000).toString().padStart(20, '0')}`,
            statut: 'ACTIF',
          },
        });
      }
    }
    console.log('✅ Adherents created');

    // 5. Create Templates
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

    // 6. Create GecTemplates
    await Promise.all([
      prisma.gecTemplate.create({
        data: {
          name: 'Email Règlement',
          content: 'Votre règlement de {{montant}} TND pour le bordereau {{reference}} sera effectué le {{dateReglement}}.',
          type: 'EMAIL',
          category: 'Règlement',
          createdById: users[0].id,
          usageCount: Math.floor(Math.random() * 50),
        },
      }),
      prisma.gecTemplate.create({
        data: {
          name: 'SMS Alerte',
          content: 'ARS: Votre dossier {{reference}} nécessite votre attention.',
          type: 'SMS',
          category: 'Alerte',
          createdById: users[0].id,
          usageCount: Math.floor(Math.random() * 30),
        },
      }),
    ]);
    console.log('✅ GecTemplates created');

    // 7. Create Courriers
    for (let i = 0; i < 10; i++) {
      const bordereau = bordereaux[Math.floor(Math.random() * bordereaux.length)];
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

    // 8. Create Virements
    for (let i = 0; i < 5; i++) {
      const bordereau = bordereaux[i];
      await prisma.virement.create({
        data: {
          bordereauId: bordereau.id,
          montant: Math.floor(Math.random() * 10000) + 1000,
          referenceBancaire: `REF${Math.floor(Math.random() * 1000000)}`,
          dateDepot: new Date(),
          dateExecution: new Date(Date.now() + 24 * 60 * 60 * 1000),
          confirmed: true,
          confirmedById: users[0].id,
          confirmedAt: new Date(),
        },
      });
    }
    console.log('✅ Virements created');

    // 9. Create AlertLogs
    for (let i = 0; i < 10; i++) {
      const bordereau = bordereaux[Math.floor(Math.random() * bordereaux.length)];
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
    console.log('✅ AlertLogs created');

    // 10. Create ActionLogs
    for (const bordereau of bordereaux) {
      await prisma.actionLog.create({
        data: {
          bordereauId: bordereau.id,
          action: 'CREATED',
          details: { user: 'system', timestamp: new Date().toISOString() },
        },
      });
    }
    console.log('✅ ActionLogs created');

    // 11. Create WorkflowAssignments
    for (let i = 0; i < 10; i++) {
      const bordereau = bordereaux[Math.floor(Math.random() * bordereaux.length)];
      const assignee = users[Math.floor(Math.random() * 3) + 3];
      
      const assignment = await prisma.workflowAssignment.create({
        data: {
          taskId: bordereau.id,
          taskType: 'BORDEREAU_PROCESSING',
          assigneeId: assignee.id,
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
    console.log('✅ WorkflowAssignments created');

    // 12. Create Wire Transfer System
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
        rib: '08001000123456789012',
      },
    });

    const members = [];
    for (let i = 1; i <= 20; i++) {
      const member = await prisma.member.create({
        data: {
          societyId: society.id,
          name: `Membre ${i}`,
          rib: `${Math.floor(Math.random() * 10000000000000000000).toString().padStart(20, '0')}`,
          cin: `${Math.floor(Math.random() * 100000000)}`,
          address: `Adresse ${i}, Tunisie`,
        },
      });
      members.push(member);
    }

    const batch = await prisma.wireTransferBatch.create({
      data: {
        societyId: society.id,
        donneurId: donneur.id,
        status: 'CREATED',
        fileName: 'batch_001.xlsx',
        fileType: 'EXCEL',
      },
    });

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

    // 13. Create AI Learning Data
    for (let i = 0; i < 20; i++) {
      await prisma.aILearning.create({
        data: {
          analysisType: 'WORKLOAD_PREDICTION',
          inputPattern: `Pattern ${i}`,
          expectedOutput: `Expected ${i}`,
          actualOutput: `Actual ${i}`,
          accuracy: Math.random() * 0.3 + 0.7,
          feedback: Math.floor(Math.random() * 5) + 1,
          userId: users[Math.floor(Math.random() * users.length)].id,
        },
      });
    }
    console.log('✅ AI Learning data created');

    // 14. Create Performance Analysis
    for (const user of users.slice(2)) {
      await prisma.performanceAnalysis.create({
        data: {
          userId: user.id,
          rootCauses: 'Charge de travail élevée',
          bottlenecks: 'Validation manuelle',
          trainingNeeds: 'Formation OCR',
          recommendations: 'Automatiser les tâches répétitives',
          confidence: Math.random() * 0.3 + 0.7,
        },
      });
    }
    console.log('✅ Performance Analysis created');

    // 15. Create System Configuration
    await Promise.all([
      prisma.systemConfiguration.create({
        data: {
          configKey: 'SLA_ALERT_THRESHOLD',
          configValue: { percentage: 80, enabled: true },
          description: 'Seuil d\'alerte SLA en pourcentage',
        },
      }),
      prisma.systemConfiguration.create({
        data: {
          configKey: 'MAX_UPLOAD_SIZE',
          configValue: { size: 50, unit: 'MB' },
          description: 'Taille maximale des fichiers uploadés',
        },
      }),
    ]);
    console.log('✅ System Configuration created');

    // 16. Create Feedback
    await prisma.feedback.create({
      data: {
        userId: users[3].id,
        message: 'Interface très intuitive, bon travail!',
        page: '/dashboard',
      },
    });
    console.log('✅ Feedback created');

    // 17. Create BSLogs
    for (const bs of bulletinSoins.slice(0, 10)) {
      await prisma.bSLog.create({
        data: {
          userId: users[3].id,
          bsId: bs.id,
          action: 'PROCESSED',
        },
      });
    }
    console.log('✅ BSLogs created');

    // 18. Create OCRLogs
    for (const doc of documents.slice(0, 5)) {
      await prisma.oCRLog.create({
        data: {
          documentId: doc.id,
          userId: users[0].id,
          processedById: users[0].id,
          status: 'SUCCESS',
          ocrAt: new Date(),
        },
      });
    }
    console.log('✅ OCRLogs created');

    console.log('🎉 All missing tables have been seeded!');

  } catch (error) {
    console.error('❌ Error seeding missing tables:', error);
    throw error;
  }
}

seedMissingTables()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());