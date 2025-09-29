const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkChefDashboardData() {
  console.log('🔍 VÉRIFICATION DES DONNÉES - DASHBOARD CHEF D\'ÉQUIPE');
  console.log('=' .repeat(60));

  try {
    // 1. Check Users (Gestionnaires)
    console.log('\n👥 1. VÉRIFICATION DES GESTIONNAIRES');
    const gestionnaires = await prisma.user.findMany({
      where: { role: 'GESTIONNAIRE' },
      select: { id: true, fullName: true, email: true }
    });
    
    console.log(`   ✅ Gestionnaires trouvés: ${gestionnaires.length}`);
    gestionnaires.forEach((g, i) => {
      console.log(`   ${i + 1}. ${g.fullName} (${g.email})`);
    });

    // 2. Check Documents
    console.log('\n📄 2. VÉRIFICATION DES DOCUMENTS');
    const totalDocs = await prisma.document.count({
      where: { bordereau: { archived: false } }
    });
    
    const docsByType = await prisma.document.groupBy({
      by: ['type'],
      where: { bordereau: { archived: false } },
      _count: { id: true }
    });
    
    console.log(`   ✅ Total documents: ${totalDocs}`);
    console.log('   📊 Répartition par type:');
    docsByType.forEach(group => {
      console.log(`      - ${group.type}: ${group._count.id}`);
    });

    // 3. Check Documents with Clients
    console.log('\n🏢 3. VÉRIFICATION DES CLIENTS');
    const docsWithClients = await prisma.document.findMany({
      where: { bordereau: { archived: false } },
      include: {
        bordereau: {
          include: { client: { select: { name: true } } }
        }
      },
      take: 5
    });
    
    console.log(`   ✅ Documents avec clients (échantillon): ${docsWithClients.length}`);
    docsWithClients.forEach((doc, i) => {
      console.log(`   ${i + 1}. ${doc.name} - Client: ${doc.bordereau?.client?.name || 'N/A'}`);
    });

    // 4. Check Document Assignments
    console.log('\n📋 4. VÉRIFICATION DES AFFECTATIONS');
    const assignedDocs = await prisma.document.count({
      where: { 
        assignedToUserId: { not: null },
        bordereau: { archived: false }
      }
    });
    
    const docsByStatus = await prisma.document.groupBy({
      by: ['status'],
      where: { 
        assignedToUserId: { not: null },
        bordereau: { archived: false }
      },
      _count: { id: true }
    });
    
    console.log(`   ✅ Documents affectés: ${assignedDocs}`);
    console.log('   📊 Répartition par statut:');
    docsByStatus.forEach(group => {
      console.log(`      - ${group.status || 'NULL'}: ${group._count.id}`);
    });

    // 5. Check Gestionnaire Assignments Detail
    console.log('\n🎯 5. DÉTAIL DES AFFECTATIONS PAR GESTIONNAIRE');
    for (const gestionnaire of gestionnaires.slice(0, 3)) { // Check first 3
      const [total, traites, enCours, retournes] = await Promise.all([
        prisma.document.count({
          where: {
            assignedToUserId: gestionnaire.id,
            bordereau: { archived: false }
          }
        }),
        prisma.document.count({
          where: {
            assignedToUserId: gestionnaire.id,
            status: 'TRAITE',
            bordereau: { archived: false }
          }
        }),
        prisma.document.count({
          where: {
            assignedToUserId: gestionnaire.id,
            status: 'EN_COURS',
            bordereau: { archived: false }
          }
        }),
        prisma.document.count({
          where: {
            assignedToUserId: gestionnaire.id,
            status: 'RETOUR_ADMIN',
            bordereau: { archived: false }
          }
        })
      ]);

      console.log(`   👤 ${gestionnaire.fullName}:`);
      console.log(`      Total: ${total} | Traités: ${traites} | En cours: ${enCours} | Retournés: ${retournes}`);
    }

    // 6. Simulate API Responses
    console.log('\n🔧 6. SIMULATION DES RÉPONSES API');
    
    // Simulate dashboard-stats-dossiers
    const typeMapping = {
      'BULLETIN_SOIN': 'prestation',
      'ADHESION': 'adhesion',
      'COMPLEMENT_INFORMATION': 'complement',
      'DEMANDE_RESILIATION': 'resiliation',
      'RECLAMATION': 'reclamation',
      'CONTRAT_AVENANT': 'avenant'
    };

    const stats = {
      prestation: { total: 0, breakdown: {} },
      adhesion: { total: 0, breakdown: {} },
      complement: { total: 0, breakdown: {} },
      resiliation: { total: 0, breakdown: {} },
      reclamation: { total: 0, breakdown: {} },
      avenant: { total: 0, breakdown: {} }
    };

    docsByType.forEach(group => {
      const category = typeMapping[group.type] || 'prestation';
      stats[category].total = group._count.id;
    });

    console.log('   📊 Stats simulées:');
    Object.entries(stats).forEach(([key, value]) => {
      console.log(`      ${key}: ${value.total}`);
    });

    // 7. Check if we have enough data
    console.log('\n✅ 7. RÉSUMÉ DE LA VÉRIFICATION');
    const hasGestionnaires = gestionnaires.length > 0;
    const hasDocuments = totalDocs > 0;
    const hasAssignments = assignedDocs > 0;
    
    console.log(`   Gestionnaires: ${hasGestionnaires ? '✅' : '❌'} (${gestionnaires.length})`);
    console.log(`   Documents: ${hasDocuments ? '✅' : '❌'} (${totalDocs})`);
    console.log(`   Affectations: ${hasAssignments ? '✅' : '❌'} (${assignedDocs})`);
    
    if (hasGestionnaires && hasDocuments) {
      console.log('\n🎉 RÉSULTAT: Les données sont suffisantes pour le dashboard!');
    } else {
      console.log('\n⚠️  RÉSULTAT: Données insuffisantes - création de données de test recommandée');
    }

  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkChefDashboardData();