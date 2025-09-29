const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTestGestionnaireData() {
  try {
    console.log('🔍 Checking data for "Test Gestionnaire"...\n');

    // Find the Test Gestionnaire user
    const testGestionnaire = await prisma.user.findFirst({
      where: { 
        fullName: { contains: 'Test Gestionnaire', mode: 'insensitive' },
        role: 'GESTIONNAIRE'
      }
    });

    if (!testGestionnaire) {
      console.log('❌ Test Gestionnaire user not found');
      return;
    }

    console.log('✅ Found Test Gestionnaire:');
    console.log(`   ID: ${testGestionnaire.id}`);
    console.log(`   Name: ${testGestionnaire.fullName}`);
    console.log(`   Email: ${testGestionnaire.email}`);
    console.log(`   Role: ${testGestionnaire.role}\n`);

    // Get assigned bordereaux
    const assignedBordereaux = await prisma.bordereau.findMany({
      where: {
        assignedToUserId: testGestionnaire.id
      },
      include: {
        client: { select: { name: true } },
        documents: {
          select: { 
            id: true,
            name: true, 
            type: true 
          }
        }
      }
    });

    console.log(`📊 ASSIGNED BORDEREAUX: ${assignedBordereaux.length} total\n`);

    if (assignedBordereaux.length === 0) {
      console.log('❌ No bordereaux assigned to Test Gestionnaire');
      console.log('💡 Creating test data...\n');
      
      // Create test data for Test Gestionnaire
      await createTestDataForGestionnaire(testGestionnaire.id);
      return;
    }

    // Group by document type (same logic as dashboard)
    const typeStats = {
      prestation: { total: 0, breakdown: {} },
      adhesion: { total: 0, breakdown: {} },
      complement: { total: 0, breakdown: {} },
      resiliation: { total: 0, breakdown: {} },
      reclamation: { total: 0, breakdown: {} },
      avenant: { total: 0, breakdown: {} }
    };

    assignedBordereaux.forEach(bordereau => {
      const clientName = bordereau.client?.name || 'Client inconnu';
      const docType = getDossierType(bordereau.documents);
      
      switch (docType) {
        case 'Prestation':
          typeStats.prestation.total++;
          typeStats.prestation.breakdown[clientName] = (typeStats.prestation.breakdown[clientName] || 0) + 1;
          break;
        case 'Réclamation':
          typeStats.reclamation.total++;
          typeStats.reclamation.breakdown[clientName] = (typeStats.reclamation.breakdown[clientName] || 0) + 1;
          break;
        case 'Complément Dossier':
          typeStats.complement.total++;
          typeStats.complement.breakdown[clientName] = (typeStats.complement.breakdown[clientName] || 0) + 1;
          break;
        case 'Adhésion':
          typeStats.adhesion.total++;
          typeStats.adhesion.breakdown[clientName] = (typeStats.adhesion.breakdown[clientName] || 0) + 1;
          break;
        case 'Avenant':
          typeStats.avenant.total++;
          typeStats.avenant.breakdown[clientName] = (typeStats.avenant.breakdown[clientName] || 0) + 1;
          break;
        case 'Résiliation':
          typeStats.resiliation.total++;
          typeStats.resiliation.breakdown[clientName] = (typeStats.resiliation.breakdown[clientName] || 0) + 1;
          break;
      }
    });

    console.log('📈 DASHBOARD STATISTICS (what should appear in interface):');
    console.log('═══════════════════════════════════════════════════════\n');

    Object.entries(typeStats).forEach(([type, data]) => {
      const typeName = type.charAt(0).toUpperCase() + type.slice(1);
      console.log(`${typeName}: ${data.total} total`);
      if (data.total > 0) {
        Object.entries(data.breakdown).forEach(([client, count]) => {
          console.log(`  └─ ${client}: ${count}`);
        });
      }
      console.log('');
    });

    // Show detailed bordereau list
    console.log('📋 DETAILED BORDEREAU LIST:');
    console.log('═══════════════════════════════════════════════════════\n');

    assignedBordereaux.forEach((bordereau, index) => {
      console.log(`${index + 1}. Bordereau: ${bordereau.reference}`);
      console.log(`   Client: ${bordereau.client?.name || 'N/A'}`);
      console.log(`   Status: ${bordereau.statut}`);
      console.log(`   Date: ${bordereau.dateReception}`);
      console.log(`   Documents: ${bordereau.documents.length}`);
      bordereau.documents.forEach(doc => {
        console.log(`     - ${doc.name} (${doc.type})`);
      });
      console.log('');
    });

    // Check corbeille data
    const corbeilleData = await getGestionnaireCorbeille(testGestionnaire.id);
    console.log('📥 CORBEILLE DATA:');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`Assigned Items: ${corbeilleData.assignedItems.length}`);
    console.log(`Processed Items: ${corbeilleData.processedItems.length}`);
    console.log(`Returned Items: ${corbeilleData.returnedItems.length}\n`);

    console.log('✅ Data check complete! This is what should appear in the gestionnaire dashboard.');

  } catch (error) {
    console.error('❌ Error checking data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function getDossierType(documents) {
  if (documents.some(d => d.type === 'RECLAMATION')) return 'Réclamation';
  if (documents.some(d => d.type === 'COMPLEMENT_INFORMATION')) return 'Complément Dossier';
  if (documents.some(d => d.type === 'ADHESION')) return 'Adhésion';
  if (documents.some(d => d.type === 'AVENANT')) return 'Avenant';
  if (documents.some(d => d.type === 'RESILIATION')) return 'Résiliation';
  return 'Prestation';
}

async function getGestionnaireCorbeille(gestionnaireId) {
  const assignedBordereaux = await prisma.bordereau.findMany({
    where: {
      assignedToUserId: gestionnaireId,
      statut: { in: ['ASSIGNE', 'EN_COURS'] }
    },
    include: {
      client: { select: { name: true } },
      BulletinSoin: {
        select: {
          montant: true
        }
      }
    }
  });

  const processedBordereaux = await prisma.bordereau.findMany({
    where: {
      assignedToUserId: gestionnaireId,
      statut: { in: ['TRAITE', 'CLOTURE'] }
    },
    include: {
      client: { select: { name: true } },
      BulletinSoin: {
        select: {
          montant: true
        }
      }
    }
  });

  const returnedItems = await prisma.bordereau.findMany({
    where: {
      statut: 'EN_DIFFICULTE',
      currentHandlerId: gestionnaireId
    },
    include: {
      client: { select: { name: true } },
      BulletinSoin: {
        select: {
          montant: true
        }
      }
    }
  });

  return {
    assignedItems: assignedBordereaux.map(b => ({
      id: b.id,
      reference: b.reference,
      clientName: b.client?.name,
      etat: b.statut,
      dateCreation: b.dateReception,
      totalPec: b.BulletinSoin.reduce((sum, bs) => sum + (bs.montant || 0), 0)
    })),
    processedItems: processedBordereaux.map(b => ({
      id: b.id,
      reference: b.reference,
      clientName: b.client?.name,
      etat: b.statut,
      dateCreation: b.dateReceptionSante || b.dateReception,
      totalPec: b.BulletinSoin.reduce((sum, bs) => sum + (bs.montant || 0), 0)
    })),
    returnedItems: returnedItems.map(b => ({
      id: b.id,
      reference: b.reference,
      clientName: b.client?.name,
      etat: b.statut,
      dateCreation: b.dateReception,
      totalPec: b.BulletinSoin.reduce((sum, bs) => sum + (bs.montant || 0), 0)
    }))
  };
}

async function createTestDataForGestionnaire(gestionnaireId) {
  console.log('🔧 Creating test data for Test Gestionnaire...\n');

  // Get some clients
  const clients = await prisma.client.findMany({ take: 3 });
  
  if (clients.length === 0) {
    console.log('❌ No clients found. Please create clients first.');
    return;
  }

  // Create test bordereaux
  for (let i = 0; i < 5; i++) {
    const client = clients[i % clients.length];
    
    const bordereau = await prisma.bordereau.create({
      data: {
        reference: `TEST-GEST-${Date.now()}-${i}`,
        clientId: client.id,
        assignedToUserId: gestionnaireId,
        statut: i < 3 ? 'ASSIGNE' : 'TRAITE',
        dateReception: new Date(),
        nombreBS: Math.floor(Math.random() * 10) + 1,
        delaiReglement: 30
      }
    });

    // Create documents for each bordereau
    const docTypes = ['BULLETIN_SOIN', 'RECLAMATION', 'COMPLEMENT_INFORMATION', 'ADHESION', 'AVENANT'];
    const docType = docTypes[i % docTypes.length];

    await prisma.document.create({
      data: {
        name: `Test-Doc-${i + 1}.pdf`,
        type: docType,
        path: `/test/path/doc-${i + 1}.pdf`,
        bordereauId: bordereau.id,
        assignedToUserId: gestionnaireId,
        status: 'UPLOADED'
      }
    });

    console.log(`✅ Created bordereau ${bordereau.reference} with ${docType} document`);
  }

  console.log('\n🎉 Test data created! Run the script again to see the results.');
}

// Run the check
checkTestGestionnaireData();