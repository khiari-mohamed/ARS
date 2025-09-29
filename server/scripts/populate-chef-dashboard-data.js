const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function populateChefDashboardData() {
  console.log('🚀 CRÉATION DES DONNÉES DE TEST - DASHBOARD CHEF D\'ÉQUIPE');
  console.log('=' .repeat(60));

  try {
    // 1. Create test clients
    console.log('\n🏢 1. CRÉATION DES CLIENTS DE TEST');
    const clients = [];
    const clientNames = ['ASSURANCE SANTÉ PLUS', 'MUTUELLE FAMILIALE', 'PROTECTION SOCIALE'];
    
    for (const name of clientNames) {
      const client = await prisma.client.upsert({
        where: { name },
        update: {},
        create: {
          name,
          reglementDelay: 30,
          reclamationDelay: 15
        }
      });
      clients.push(client);
      console.log(`   ✅ Client créé: ${client.name}`);
    }

    // 2. Create test gestionnaires
    console.log('\n👥 2. CRÉATION DES GESTIONNAIRES DE TEST');
    const gestionnaires = [];
    const gestionnaireData = [
      { fullName: 'Marie Dubois', email: 'marie.dubois@ars.tn' },
      { fullName: 'Ahmed Ben Ali', email: 'ahmed.benali@ars.tn' },
      { fullName: 'Sophie Martin', email: 'sophie.martin@ars.tn' }
    ];

    for (const data of gestionnaireData) {
      const gestionnaire = await prisma.user.upsert({
        where: { email: data.email },
        update: {},
        create: {
          ...data,
          password: 'hashedpassword123',
          role: 'GESTIONNAIRE',
          active: true,
          capacity: 20
        }
      });
      gestionnaires.push(gestionnaire);
      console.log(`   ✅ Gestionnaire créé: ${gestionnaire.fullName}`);
    }

    // 3. Create test bordereaux
    console.log('\n📋 3. CRÉATION DES BORDEREAUX DE TEST');
    const bordereaux = [];
    
    for (let i = 0; i < clients.length; i++) {
      const client = clients[i];
      for (let j = 1; j <= 3; j++) {
        const bordereau = await prisma.bordereau.create({
          data: {
            reference: `BR-${client.name.substring(0, 3).toUpperCase()}-${Date.now()}-${j}`,
            clientId: client.id,
            dateReception: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
            delaiReglement: 30,
            nombreBS: Math.floor(Math.random() * 10) + 1,
            statut: 'SCANNE'
          }
        });
        bordereaux.push(bordereau);
        console.log(`   ✅ Bordereau créé: ${bordereau.reference}`);
      }
    }

    // 4. Create test documents
    console.log('\n📄 4. CRÉATION DES DOCUMENTS DE TEST');
    const documentTypes = ['BULLETIN_SOIN', 'ADHESION', 'COMPLEMENT_INFORMATION', 'RECLAMATION'];
    const documentStatuses = ['TRAITE', 'EN_COURS', 'RETOUR_ADMIN', 'UPLOADED'];
    
    let docCount = 0;
    for (const bordereau of bordereaux) {
      const numDocs = Math.floor(Math.random() * 5) + 2; // 2-6 documents per bordereau
      
      for (let i = 0; i < numDocs; i++) {
        const randomType = documentTypes[Math.floor(Math.random() * documentTypes.length)];
        const randomStatus = documentStatuses[Math.floor(Math.random() * documentStatuses.length)];
        const randomGestionnaire = gestionnaires[Math.floor(Math.random() * gestionnaires.length)];
        
        const document = await prisma.document.create({
          data: {
            name: `Document-${bordereau.reference}-${i + 1}.pdf`,
            type: randomType,
            path: `/uploads/test-documents/doc-${docCount}.pdf`,
            uploadedById: randomGestionnaire.id,
            bordereauId: bordereau.id,
            status: randomStatus,
            assignedToUserId: Math.random() > 0.3 ? randomGestionnaire.id : null, // 70% assigned
            assignedAt: Math.random() > 0.3 ? new Date() : null
          }
        });
        docCount++;
        
        if (docCount % 10 === 0) {
          console.log(`   📄 ${docCount} documents créés...`);
        }
      }
    }
    
    console.log(`   ✅ Total documents créés: ${docCount}`);

    // 5. Create some assignment history
    console.log('\n📋 5. CRÉATION DE L\'HISTORIQUE D\'AFFECTATIONS');
    const assignedDocs = await prisma.document.findMany({
      where: { assignedToUserId: { not: null } },
      take: 20
    });

    for (const doc of assignedDocs) {
      await prisma.documentAssignmentHistory.create({
        data: {
          documentId: doc.id,
          assignedToUserId: doc.assignedToUserId,
          assignedByUserId: gestionnaires[0].id, // First gestionnaire as assigner
          action: 'ASSIGNED',
          reason: 'Affectation automatique de test'
        }
      });
    }
    
    console.log(`   ✅ Historique créé pour ${assignedDocs.length} documents`);

    // 6. Verify created data
    console.log('\n✅ 6. VÉRIFICATION DES DONNÉES CRÉÉES');
    const [totalClients, totalGestionnaires, totalBordereaux, totalDocuments, totalAssigned] = await Promise.all([
      prisma.client.count(),
      prisma.user.count({ where: { role: 'GESTIONNAIRE' } }),
      prisma.bordereau.count(),
      prisma.document.count(),
      prisma.document.count({ where: { assignedToUserId: { not: null } } })
    ]);

    console.log(`   Clients: ${totalClients}`);
    console.log(`   Gestionnaires: ${totalGestionnaires}`);
    console.log(`   Bordereaux: ${totalBordereaux}`);
    console.log(`   Documents: ${totalDocuments}`);
    console.log(`   Documents affectés: ${totalAssigned}`);

    console.log('\n🎉 DONNÉES DE TEST CRÉÉES AVEC SUCCÈS!');
    console.log('   Le dashboard Chef d\'équipe devrait maintenant afficher des données.');

  } catch (error) {
    console.error('❌ Erreur lors de la création des données:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the population
populateChefDashboardData();