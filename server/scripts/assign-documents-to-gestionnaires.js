const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function assignDocumentsToGestionnaires() {
  console.log('📋 AFFECTATION DES DOCUMENTS AUX GESTIONNAIRES');
  console.log('=' .repeat(50));

  try {
    // Get gestionnaires
    const gestionnaires = await prisma.user.findMany({
      where: { role: 'GESTIONNAIRE' },
      select: { id: true, fullName: true }
    });

    console.log(`👥 Gestionnaires trouvés: ${gestionnaires.length}`);

    // Get unassigned documents
    const unassignedDocs = await prisma.document.findMany({
      where: {
        assignedToUserId: null,
        bordereau: { archived: false }
      },
      include: {
        bordereau: {
          include: { client: { select: { name: true } } }
        }
      }
    });

    console.log(`📄 Documents non affectés: ${unassignedDocs.length}`);

    if (gestionnaires.length === 0) {
      console.log('❌ Aucun gestionnaire trouvé!');
      return;
    }

    if (unassignedDocs.length === 0) {
      console.log('❌ Aucun document non affecté trouvé!');
      return;
    }

    // Assign documents to gestionnaires
    const statuses = ['TRAITE', 'EN_COURS', 'RETOUR_ADMIN'];
    let assignedCount = 0;

    for (let i = 0; i < unassignedDocs.length; i++) {
      const doc = unassignedDocs[i];
      const gestionnaire = gestionnaires[i % gestionnaires.length]; // Round robin
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

      await prisma.document.update({
        where: { id: doc.id },
        data: {
          assignedToUserId: gestionnaire.id,
          assignedAt: new Date(),
          status: randomStatus
        }
      });

      // Create assignment history
      await prisma.documentAssignmentHistory.create({
        data: {
          documentId: doc.id,
          assignedToUserId: gestionnaire.id,
          assignedByUserId: gestionnaires[0].id, // First gestionnaire as assigner
          action: 'ASSIGNED',
          reason: 'Affectation automatique pour test dashboard'
        }
      });

      assignedCount++;
      
      if (assignedCount % 10 === 0) {
        console.log(`   📋 ${assignedCount} documents affectés...`);
      }
    }

    console.log(`✅ Total documents affectés: ${assignedCount}`);

    // Show assignment summary
    console.log('\n📊 RÉSUMÉ DES AFFECTATIONS:');
    for (const gestionnaire of gestionnaires) {
      const [total, traites, enCours, retournes] = await Promise.all([
        prisma.document.count({
          where: { assignedToUserId: gestionnaire.id, bordereau: { archived: false } }
        }),
        prisma.document.count({
          where: { assignedToUserId: gestionnaire.id, status: 'TRAITE', bordereau: { archived: false } }
        }),
        prisma.document.count({
          where: { assignedToUserId: gestionnaire.id, status: 'EN_COURS', bordereau: { archived: false } }
        }),
        prisma.document.count({
          where: { assignedToUserId: gestionnaire.id, status: 'RETOUR_ADMIN', bordereau: { archived: false } }
        })
      ]);

      console.log(`   👤 ${gestionnaire.fullName}:`);
      console.log(`      Total: ${total} | Traités: ${traites} | En cours: ${enCours} | Retournés: ${retournes}`);
    }

    console.log('\n🎉 AFFECTATION TERMINÉE!');
    console.log('   Le dashboard Chef d\'équipe devrait maintenant afficher les affectations.');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assignDocumentsToGestionnaires();