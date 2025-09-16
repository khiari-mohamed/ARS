const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function populateChefEquipeTestData() {
  console.log('🚀 Starting Chef d\'Équipe test data population...');

  try {
    // 1. Create test clients
    console.log('📋 Creating test clients...');
    const clients = await Promise.all([
      prisma.client.upsert({
        where: { name: 'Assurance Alpha' },
        update: {},
        create: {
          name: 'Assurance Alpha',
          email: 'assurance.alpha@test.tn',
          phone: '71234567',
          address: 'Tunis, Tunisie',
          reglementDelay: 30,
          reclamationDelay: 15,
          status: 'ACTIVE'
        }
      }),
      prisma.client.upsert({
        where: { name: 'Mutuelle Beta' },
        update: {},
        create: {
          name: 'Mutuelle Beta',
          email: 'mutuelle.beta@test.tn',
          phone: '71234568',
          address: 'Sfax, Tunisie',
          reglementDelay: 45,
          reclamationDelay: 20,
          status: 'ACTIVE'
        }
      }),
      prisma.client.upsert({
        where: { name: 'Santé Gamma' },
        update: {},
        create: {
          name: 'Santé Gamma',
          email: 'sante.gamma@test.tn',
          phone: '71234569',
          address: 'Sousse, Tunisie',
          reglementDelay: 60,
          reclamationDelay: 30,
          status: 'ACTIVE'
        }
      })
    ]);

    // 2. Create test users (Chef d'équipe and Gestionnaires)
    console.log('👥 Creating test users...');
    const chefEquipe = await prisma.user.upsert({
      where: { email: 'chef.equipe@ars.tn' },
      update: {},
      create: {
        email: 'chef.equipe@ars.tn',
        fullName: 'Ahmed Ben Ali',
        role: 'CHEF_EQUIPE',
        active: true,
        capacity: 50,
        password: 'hashed_password_placeholder'
      }
    });

    const gestionnaires = await Promise.all([
      prisma.user.upsert({
        where: { email: 'gestionnaire1@ars.tn' },
        update: {},
        create: {
          email: 'gestionnaire1@ars.tn',
          fullName: 'Fatma Trabelsi',
          role: 'GESTIONNAIRE',
          active: true,
          capacity: 20,
          teamLeaderId: chefEquipe.id,
          password: 'hashed_password_placeholder'
        }
      }),
      prisma.user.upsert({
        where: { email: 'gestionnaire2@ars.tn' },
        update: {},
        create: {
          email: 'gestionnaire2@ars.tn',
          fullName: 'Mohamed Sassi',
          role: 'GESTIONNAIRE',
          active: true,
          capacity: 25,
          teamLeaderId: chefEquipe.id,
          password: 'hashed_password_placeholder'
        }
      }),
      prisma.user.upsert({
        where: { email: 'gestionnaire3@ars.tn' },
        update: {},
        create: {
          email: 'gestionnaire3@ars.tn',
          fullName: 'Leila Khediri',
          role: 'GESTIONNAIRE',
          active: true,
          capacity: 15,
          teamLeaderId: chefEquipe.id,
          password: 'hashed_password_placeholder'
        }
      })
    ]);

    // 3. Create Bureau d'Ordre and Scan users
    const bureauOrdre = await prisma.user.upsert({
      where: { email: 'bureau.ordre@ars.tn' },
      update: {},
      create: {
        email: 'bureau.ordre@ars.tn',
        fullName: 'Karim Bouazizi',
        role: 'BUREAU_ORDRE',
        active: true,
        password: 'hashed_password_placeholder'
      }
    });

    const scanUser = await prisma.user.upsert({
      where: { email: 'scan.user@ars.tn' },
      update: {},
      create: {
        email: 'scan.user@ars.tn',
        fullName: 'Nadia Hamdi',
        role: 'SCAN',
        active: true,
        password: 'hashed_password_placeholder'
      }
    });

    // 4. Create contracts for clients
    console.log('📄 Creating test contracts...');
    const contracts = await Promise.all(
      clients.map(client => 
        prisma.contract.create({
          data: {
            clientId: client.id,
            delaiReglement: client.reglementDelay,
            delaiReclamation: client.reclamationDelay,
            active: true
          }
        })
      )
    );

    // 5. Create NON-AFFECTÉS bordereaux (Tab 1 - Ready for assignment)
    console.log('📥 Creating NON-AFFECTÉS bordereaux...');
    const nonAffectesBordereaux = [];
    for (let i = 1; i <= 8; i++) {
      const client = clients[i % clients.length];
      const contract = contracts[i % contracts.length];
      
      const bordereau = await prisma.bordereau.create({
        data: {
          reference: `BDX-2024-${String(i).padStart(4, '0')}`,
          clientId: client.id,
          contractId: contract.id,
          dateReception: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000), // Last 5 days
          statut: Math.random() > 0.5 ? 'SCANNE' : 'A_AFFECTER',
          nombreBS: Math.floor(Math.random() * 50) + 10,
          delaiReglement: client.reglementDelay,
          scanStatus: 'completed',
          completionRate: 100,
          priority: Math.floor(Math.random() * 3) + 1,
          archived: false
        }
      });
      nonAffectesBordereaux.push(bordereau);
    }

    // 6. Create EN COURS bordereaux (Tab 2 - Being processed)
    console.log('🔄 Creating EN COURS bordereaux...');
    const enCoursBordereaux = [];
    for (let i = 1; i <= 12; i++) {
      const client = clients[i % clients.length];
      const contract = contracts[i % contracts.length];
      const gestionnaire = gestionnaires[i % gestionnaires.length];
      
      const bordereau = await prisma.bordereau.create({
        data: {
          reference: `BDX-2024-${String(i + 100).padStart(4, '0')}`,
          clientId: client.id,
          contractId: contract.id,
          dateReception: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000), // Last 10 days
          statut: Math.random() > 0.3 ? 'EN_COURS' : 'ASSIGNE',
          nombreBS: Math.floor(Math.random() * 40) + 15,
          delaiReglement: client.reglementDelay,
          assignedToUserId: gestionnaire.id,
          currentHandlerId: gestionnaire.id,
          teamId: chefEquipe.id,
          scanStatus: 'completed',
          completionRate: Math.floor(Math.random() * 60) + 20, // 20-80% complete
          priority: Math.floor(Math.random() * 3) + 1,
          archived: false
        }
      });
      enCoursBordereaux.push(bordereau);
    }

    // 7. Create TRAITÉS bordereaux (Tab 3 - Recently completed)
    console.log('✅ Creating TRAITÉS bordereaux...');
    const traitesBordereaux = [];
    for (let i = 1; i <= 15; i++) {
      const client = clients[i % clients.length];
      const contract = contracts[i % contracts.length];
      const gestionnaire = gestionnaires[i % gestionnaires.length];
      
      const bordereau = await prisma.bordereau.create({
        data: {
          reference: `BDX-2024-${String(i + 200).padStart(4, '0')}`,
          clientId: client.id,
          contractId: contract.id,
          dateReception: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000), // Last 15 days
          statut: Math.random() > 0.2 ? 'TRAITE' : 'CLOTURE',
          nombreBS: Math.floor(Math.random() * 60) + 20,
          delaiReglement: client.reglementDelay,
          assignedToUserId: gestionnaire.id,
          currentHandlerId: gestionnaire.id,
          teamId: chefEquipe.id,
          dateCloture: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Closed in last 7 days
          scanStatus: 'completed',
          completionRate: 100,
          priority: Math.floor(Math.random() * 3) + 1,
          archived: false
        }
      });
      traitesBordereaux.push(bordereau);
    }

    // 8. Create some documents for bordereaux
    console.log('📎 Creating documents...');
    const allBordereaux = [...nonAffectesBordereaux, ...enCoursBordereaux, ...traitesBordereaux];
    for (const bordereau of allBordereaux.slice(0, 20)) { // Add docs to first 20
      const docCount = Math.floor(Math.random() * 5) + 1;
      for (let j = 1; j <= docCount; j++) {
        await prisma.document.create({
          data: {
            name: `Document_${j}_${bordereau.reference}.pdf`,
            type: ['justificatif', 'facture', 'ordonnance', 'rapport'][Math.floor(Math.random() * 4)],
            path: `/uploads/documents/${bordereau.reference}_doc_${j}.pdf`,
            size: Math.floor(Math.random() * 1000000) + 100000,
            bordereauId: bordereau.id
          }
        });
      }
    }

    // 9. Create treatment history for some bordereaux
    console.log('📚 Creating treatment history...');
    for (const bordereau of [...enCoursBordereaux, ...traitesBordereaux].slice(0, 15)) {
      await prisma.traitementHistory.create({
        data: {
          bordereauId: bordereau.id,
          userId: chefEquipe.id,
          action: 'ASSIGNMENT',
          fromStatus: 'SCANNE',
          toStatus: 'ASSIGNE',
          assignedToId: bordereau.assignedToUserId
        }
      });

      if (bordereau.statut === 'TRAITE' || bordereau.statut === 'CLOTURE') {
        await prisma.traitementHistory.create({
          data: {
            bordereauId: bordereau.id,
            userId: bordereau.assignedToUserId,
            action: 'COMPLETION',
            fromStatus: 'EN_COURS',
            toStatus: bordereau.statut
          }
        });
      }
    }

    // 10. Create some notifications
    console.log('🔔 Creating notifications...');
    await Promise.all([
      prisma.notification.create({
        data: {
          userId: chefEquipe.id,
          type: 'OVERLOAD_ALERT',
          title: 'Gestionnaire surchargé',
          message: `${gestionnaires[0].fullName} a atteint sa capacité maximale`,
          data: { gestionnaireId: gestionnaires[0].id }
        }
      }),
      prisma.notification.create({
        data: {
          userId: gestionnaires[0].id,
          type: 'TASK_ASSIGNED',
          title: 'Nouveau dossier assigné',
          message: `Le bordereau ${nonAffectesBordereaux[0].reference} vous a été assigné`,
          data: { bordereauId: nonAffectesBordereaux[0].id }
        }
      })
    ]);

    // 11. Create audit logs
    console.log('📋 Creating audit logs...');
    await Promise.all([
      prisma.auditLog.create({
        data: {
          userId: chefEquipe.id,
          action: 'BORDEREAU_ASSIGNED',
          details: {
            bordereauId: enCoursBordereaux[0].id,
            reference: enCoursBordereaux[0].reference,
            gestionnaireId: gestionnaires[0].id,
            gestionnaireName: gestionnaires[0].fullName
          },
          timestamp: new Date()
        }
      }),
      prisma.auditLog.create({
        data: {
          userId: chefEquipe.id,
          action: 'BORDEREAU_REJECTED',
          details: {
            bordereauId: nonAffectesBordereaux[1].id,
            reference: nonAffectesBordereaux[1].reference,
            reason: 'Documents incomplets',
            returnTo: 'SCAN'
          },
          timestamp: new Date()
        }
      })
    ]);

    // 12. Generate summary statistics
    console.log('📊 Generating summary...');
    const stats = {
      clients: clients.length,
      users: {
        chefEquipe: 1,
        gestionnaires: gestionnaires.length,
        total: gestionnaires.length + 1
      },
      bordereaux: {
        nonAffectes: nonAffectesBordereaux.length,
        enCours: enCoursBordereaux.length,
        traites: traitesBordereaux.length,
        total: allBordereaux.length
      },
      documents: await prisma.document.count(),
      notifications: await prisma.notification.count(),
      auditLogs: await prisma.auditLog.count()
    };

    console.log('\n✅ Chef d\'Équipe test data populated successfully!');
    console.log('\n📊 SUMMARY:');
    console.log(`👥 Users: ${stats.users.total} (1 Chef + ${stats.users.gestionnaires} Gestionnaires)`);
    console.log(`🏢 Clients: ${stats.clients}`);
    console.log(`📋 Bordereaux: ${stats.bordereaux.total} total`);
    console.log(`   📥 Non-Affectés: ${stats.bordereaux.nonAffectes}`);
    console.log(`   🔄 En Cours: ${stats.bordereaux.enCours}`);
    console.log(`   ✅ Traités: ${stats.bordereaux.traites}`);
    console.log(`📎 Documents: ${stats.documents}`);
    console.log(`🔔 Notifications: ${stats.notifications}`);
    console.log(`📚 Audit Logs: ${stats.auditLogs}`);

    console.log('\n🎯 TEST SCENARIOS READY:');
    console.log('1. Tab "Non Affectés": 8 bordereaux ready for assignment');
    console.log('2. Tab "En Cours": 12 bordereaux being processed by team');
    console.log('3. Tab "Traités": 15 recently completed bordereaux');
    console.log('4. Action buttons: Affecter, Rejeter, Traiter all functional');
    console.log('5. Workload management: Gestionnaires with different capacities');
    console.log('6. SLA tracking: Various reception dates for testing');

    console.log('\n🔑 TEST USERS:');
    console.log(`Chef d'Équipe: chef.equipe@ars.tn (${chefEquipe.fullName})`);
    gestionnaires.forEach((g, i) => {
      console.log(`Gestionnaire ${i + 1}: ${g.email} (${g.fullName}) - Capacity: ${g.capacity}`);
    });

    return stats;

  } catch (error) {
    console.error('❌ Error populating test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  populateChefEquipeTestData()
    .then(() => {
      console.log('\n🚀 Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { populateChefEquipeTestData };