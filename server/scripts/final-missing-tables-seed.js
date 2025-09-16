const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedFinalTables() {
  console.log('🌱 Seeding final missing tables...');

  const users = await prisma.user.findMany();
  const bordereaux = await prisma.bordereau.findMany();
  const clients = await prisma.client.findMany();
  const documents = await prisma.document.findMany();
  const contracts = await prisma.contract.findMany();
  const adherents = await prisma.adherent.findMany();
  const ordreVirements = [];

  // 1. Create DonneurOrdre
  const donneurOrdre = await prisma.donneurOrdre.create({
    data: {
      nom: 'ARS Compte Principal',
      rib: '08001000123456789012',
      banque: 'Banque Centrale de Tunisie',
      structureTxt: 'STRUCTURE_STANDARD',
      formatTxtType: 'STRUCTURE_1',
      statut: 'ACTIF',
    },
  });

  // 2. Create OrdreVirement
  for (let i = 0; i < 5; i++) {
    const ov = await prisma.ordreVirement.create({
      data: {
        reference: `OV-2024-${(i + 1).toString().padStart(4, '0')}`,
        donneurOrdreId: donneurOrdre.id,
        bordereauId: bordereaux[i]?.id,
        utilisateurSante: users[2].fullName,
        utilisateurFinance: users[0].fullName,
        etatVirement: 'NON_EXECUTE',
        montantTotal: Math.floor(Math.random() * 50000) + 10000,
        nombreAdherents: Math.floor(Math.random() * 20) + 5,
      },
    });
    ordreVirements.push(ov);
  }

  // 3. Create VirementItem
  for (const ov of ordreVirements) {
    for (let i = 0; i < 3; i++) {
      const adherent = adherents[Math.floor(Math.random() * adherents.length)];
      await prisma.virementItem.create({
        data: {
          ordreVirementId: ov.id,
          adherentId: adherent.id,
          montant: Math.floor(Math.random() * 2000) + 500,
          statut: 'VALIDE',
        },
      });
    }
  }

  // 4. Create VirementHistorique
  for (const ov of ordreVirements) {
    await prisma.virementHistorique.create({
      data: {
        ordreVirementId: ov.id,
        action: 'CREATED',
        ancienEtat: null,
        nouvelEtat: 'NON_EXECUTE',
        utilisateurId: users[0].id,
        commentaire: 'Ordre de virement créé',
      },
    });
  }

  // 5. Create TraitementHistory
  for (const bordereau of bordereaux.slice(0, 10)) {
    await prisma.traitementHistory.create({
      data: {
        bordereauId: bordereau.id,
        userId: users[2].id,
        action: 'ASSIGNED',
        fromStatus: 'EN_ATTENTE',
        toStatus: 'ASSIGNE',
        assignedToId: users[3].id,
      },
    });
  }

  // 6. Create ContractHistory
  for (const contract of contracts) {
    await prisma.contractHistory.create({
      data: {
        contractId: contract.id,
        modifiedById: users[0].id,
        changes: { field: 'delaiReglement', oldValue: 30, newValue: contract.delaiReglement },
      },
    });
  }

  // 7. Create WireTransferBatchHistory
  const batches = await prisma.wireTransferBatch.findMany();
  for (const batch of batches) {
    await prisma.wireTransferBatchHistory.create({
      data: {
        batchId: batch.id,
        status: 'CREATED',
        changedBy: users[0].id,
      },
    });
  }

  // 8. Create WireTransferHistory
  const transfers = await prisma.wireTransfer.findMany();
  for (const transfer of transfers.slice(0, 10)) {
    await prisma.wireTransferHistory.create({
      data: {
        transferId: transfer.id,
        status: 'PENDING',
        changedBy: users[0].id,
      },
    });
  }

  // 9. Create ScheduledReport
  const report = await prisma.scheduledReport.create({
    data: {
      name: 'Rapport Quotidien Bordereaux',
      description: 'Rapport automatique des bordereaux traités',
      type: 'dashboard',
      dataSource: 'bordereaux',
      frequency: 'daily',
      executionTime: '08:00',
      format: 'pdf',
      recipients: JSON.stringify([users[0].email, users[2].email]),
    },
  });

  // 10. Create ReportExecution
  await prisma.reportExecution.create({
    data: {
      reportId: report.id,
      status: 'completed',
      fileSize: 1024,
    },
  });

  // 11. Create ReportGeneration
  await prisma.reportGeneration.create({
    data: {
      type: 'dashboard',
      format: 'pdf',
      period: 'monthly',
      parameters: JSON.stringify({ client: 'all', status: 'all' }),
      status: 'completed',
      filename: 'rapport_mensuel_2024.pdf',
      fileSize: 2048,
    },
  });

  // 12. Create EscalationRule
  await prisma.escalationRule.create({
    data: {
      name: 'Escalade SLA Dépassé',
      alertType: 'SLA_BREACH',
      severity: 'HIGH',
      conditions: { delayHours: 24 },
      escalationPath: { level1: 'CHEF_EQUIPE', level2: 'SUPER_ADMIN' },
    },
  });

  // 13. Create NotificationChannel
  await prisma.notificationChannel.create({
    data: {
      name: 'Email Principal',
      type: 'EMAIL',
      config: { smtp: 'smtp.ars.tn', port: 587 },
      priority: 1,
      rateLimits: { maxPerHour: 100 },
    },
  });

  // 14. Create NotificationTemplate
  await prisma.notificationTemplate.create({
    data: {
      name: 'Alerte SLA',
      channel: 'EMAIL',
      subject: 'Alerte SLA - {{reference}}',
      body: 'Le bordereau {{reference}} a dépassé le délai SLA.',
      variables: { reference: 'string', client: 'string' },
    },
  });

  // 15. Create SuiviVirement
  for (const ov of ordreVirements) {
    await prisma.suiviVirement.create({
      data: {
        numeroBordereau: bordereaux[0].reference,
        societe: clients[0].name,
        utilisateurSante: users[2].fullName,
        utilisateurFinance: users[0].fullName,
        etatVirement: 'NON_EXECUTE',
        ordreVirementId: ov.id,
      },
    });
  }

  // 16. Create WorkflowNotification
  for (let i = 0; i < 5; i++) {
    await prisma.workflowNotification.create({
      data: {
        fromService: 'SCAN',
        toService: 'SANTE',
        bordereauId: bordereaux[i].id,
        message: `Bordereau ${bordereaux[i].reference} prêt pour traitement`,
        type: 'TASK_READY',
        status: 'SENT',
        userId: users[2].id,
      },
    });
  }

  // 17. Create TeamStructure
  const departments = await prisma.department.findMany();
  for (const dept of departments) {
    await prisma.teamStructure.create({
      data: {
        name: `Équipe ${dept.name}`,
        serviceType: dept.serviceType,
        leaderId: users[2].id,
        description: `Structure d'équipe pour ${dept.name}`,
      },
    });
  }

  // 18. Create AiOutput
  await prisma.aiOutput.create({
    data: {
      endpoint: '/api/ai/workload-prediction',
      inputData: { bordereaux: 15, users: 6, avgProcessingTime: 2.5 },
      result: { predictedWorkload: 'HIGH', recommendedStaff: 8 },
      userId: users[0].id,
      confidence: 0.85,
    },
  });

  console.log('✅ All final tables seeded successfully!');
}

seedFinalTables()
  .catch((e) => {
    console.error('❌ Final seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());