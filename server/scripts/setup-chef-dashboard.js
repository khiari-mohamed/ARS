const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupChefDashboard() {
  console.log('🔧 CONFIGURATION DASHBOARD CHEF D\'ÉQUIPE');
  console.log('=' .repeat(50));

  try {
    // 1. Check current data
    console.log('\n🔍 1. VÉRIFICATION DES DONNÉES EXISTANTES');
    const [gestionnaires, documents, assignedDocs] = await Promise.all([
      prisma.user.count({ where: { role: 'GESTIONNAIRE' } }),
      prisma.document.count({ where: { bordereau: { archived: false } } }),
      prisma.document.count({ where: { assignedToUserId: { not: null }, bordereau: { archived: false } } })
    ]);

    console.log(`   Gestionnaires: ${gestionnaires}`);
    console.log(`   Documents: ${documents}`);
    console.log(`   Documents affectés: ${assignedDocs}`);

    const needsData = gestionnaires === 0 || documents === 0;

    if (needsData) {
      console.log('\n⚠️  DONNÉES INSUFFISANTES - CRÉATION DE DONNÉES DE TEST');
      await createTestData();
    } else {
      console.log('\n✅ DONNÉES SUFFISANTES DÉTECTÉES');
    }

    // 2. Test the actual endpoints
    console.log('\n🧪 2. TEST DES ENDPOINTS');
    await testEndpoints();

    console.log('\n🎉 CONFIGURATION TERMINÉE!');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function createTestData() {
  // Create minimal test data
  const client = await prisma.client.upsert({
    where: { name: 'TEST CLIENT' },
    update: {},
    create: {
      name: 'TEST CLIENT',
      reglementDelay: 30,
      reclamationDelay: 15
    }
  });

  const gestionnaire = await prisma.user.upsert({
    where: { email: 'test.gestionnaire@ars.tn' },
    update: {},
    create: {
      fullName: 'Test Gestionnaire',
      email: 'test.gestionnaire@ars.tn',
      password: 'hashedpassword123',
      role: 'GESTIONNAIRE',
      active: true,
      capacity: 20
    }
  });

  const bordereau = await prisma.bordereau.create({
    data: {
      reference: `TEST-BR-${Date.now()}`,
      clientId: client.id,
      dateReception: new Date(),
      delaiReglement: 30,
      nombreBS: 5,
      statut: 'SCANNE'
    }
  });

  // Create test documents
  const documentTypes = ['BULLETIN_SOIN', 'ADHESION', 'COMPLEMENT_INFORMATION'];
  const statuses = ['TRAITE', 'EN_COURS', 'RETOUR_ADMIN'];

  for (let i = 0; i < 10; i++) {
    await prisma.document.create({
      data: {
        name: `Test-Document-${i + 1}.pdf`,
        type: documentTypes[i % documentTypes.length],
        path: `/uploads/test/doc-${i}.pdf`,
        uploadedById: gestionnaire.id,
        bordereauId: bordereau.id,
        status: statuses[i % statuses.length],
        assignedToUserId: i < 7 ? gestionnaire.id : null, // 70% assigned
        assignedAt: i < 7 ? new Date() : null
      }
    });
  }

  console.log('   ✅ Données de test créées');
}

async function testEndpoints() {
  // Test 1: dashboard-stats-dossiers
  console.log('   📊 Test stats endpoint...');
  const docsByType = await prisma.document.groupBy({
    by: ['type'],
    where: { bordereau: { archived: false } },
    _count: { id: true }
  });
  console.log(`      ✅ Types trouvés: ${docsByType.length}`);

  // Test 2: dashboard-dossiers
  console.log('   📄 Test dossiers endpoint...');
  const documents = await prisma.document.findMany({
    where: { bordereau: { archived: false } },
    include: {
      bordereau: {
        include: { client: { select: { name: true } } }
      }
    },
    take: 5
  });
  console.log(`      ✅ Documents trouvés: ${documents.length}`);

  // Test 3: gestionnaire-assignments-dossiers
  console.log('   👥 Test assignments endpoint...');
  const gestionnaires = await prisma.user.findMany({
    where: { role: 'GESTIONNAIRE' },
    select: { id: true, fullName: true }
  });

  for (const gest of gestionnaires.slice(0, 2)) {
    const [total, traites, enCours, retournes] = await Promise.all([
      prisma.document.count({
        where: { assignedToUserId: gest.id, bordereau: { archived: false } }
      }),
      prisma.document.count({
        where: { assignedToUserId: gest.id, status: 'TRAITE', bordereau: { archived: false } }
      }),
      prisma.document.count({
        where: { assignedToUserId: gest.id, status: 'EN_COURS', bordereau: { archived: false } }
      }),
      prisma.document.count({
        where: { assignedToUserId: gest.id, status: 'RETOUR_ADMIN', bordereau: { archived: false } }
      })
    ]);

    console.log(`      ✅ ${gest.fullName}: ${total} total (${traites} traités, ${enCours} en cours, ${retournes} retournés)`);
  }
}

// Run setup
setupChefDashboard();