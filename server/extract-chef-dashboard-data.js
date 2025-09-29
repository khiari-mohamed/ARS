const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function extractChefDashboardData() {
  console.log('🔍 EXTRACTING CHEF D\'ÉQUIPE DASHBOARD DATA FROM DATABASE\n');
  
  try {
    // 1. STATISTICS CARDS DATA
    console.log('📊 1. STATISTICS CARDS DATA:');
    console.log('=====================================');
    
    const [totalDossiers, clotures, enCours, nonAffectes] = await Promise.all([
      prisma.bordereau.count({ where: { archived: false } }),
      prisma.bordereau.count({ where: { statut: 'TRAITE', archived: false } }),
      prisma.bordereau.count({ where: { statut: { in: ['EN_COURS', 'ASSIGNE'] }, archived: false } }),
      prisma.bordereau.count({ where: { statut: { in: ['A_SCANNER', 'SCANNE', 'A_AFFECTER'] }, archived: false } })
    ]);
    
    console.log(`Total Dossiers: ${totalDossiers}`);
    console.log(`Clôturés: ${clotures}`);
    console.log(`En cours: ${enCours}`);
    console.log(`Non Affectés: ${nonAffectes}\n`);

    // 2. DOCUMENT TYPES BREAKDOWN
    console.log('📄 2. DOCUMENT TYPES BREAKDOWN:');
    console.log('=====================================');
    
    const documents = await prisma.document.findMany({
      where: { bordereau: { archived: false } },
      include: { 
        bordereau: { 
          include: { client: true } 
        },
        assignedTo: { select: { fullName: true } }
      }
    });

    const typeMapping = {
      'BULLETIN_SOIN': 'Prestation',
      'ADHESION': 'Adhésion', 
      'COMPLEMENT_INFORMATION': 'Complément Dossier',
      'CONTRAT_AVENANT': 'Avenant',
      'RECLAMATION': 'Réclamation'
    };

    const types = {};
    const clientBreakdown = {};
    const gestionnaireBreakdown = {};
    
    Object.values(typeMapping).forEach(type => {
      types[type] = { total: 0, clotures: 0, enCours: 0, nonAffectes: 0 };
      clientBreakdown[type] = {};
      gestionnaireBreakdown[type] = {};
    });

    documents.forEach(doc => {
      if (!doc.bordereau) return;
      const typeName = typeMapping[doc.type] || 'Prestation';
      const clientName = doc.bordereau.client?.name || 'Unknown';
      const gestionnaireName = doc.assignedTo?.fullName || 'Non assigné';
      
      types[typeName].total++;
      
      // Client breakdown
      if (!clientBreakdown[typeName][clientName]) {
        clientBreakdown[typeName][clientName] = 0;
      }
      clientBreakdown[typeName][clientName]++;
      
      // Gestionnaire breakdown
      if (!gestionnaireBreakdown[typeName][gestionnaireName]) {
        gestionnaireBreakdown[typeName][gestionnaireName] = 0;
      }
      gestionnaireBreakdown[typeName][gestionnaireName]++;
      
      if (doc.bordereau.statut === 'TRAITE') {
        types[typeName].clotures++;
      } else if (['EN_COURS', 'ASSIGNE'].includes(doc.bordereau.statut)) {
        types[typeName].enCours++;
      } else if (['A_SCANNER', 'SCANNE', 'A_AFFECTER'].includes(doc.bordereau.statut)) {
        types[typeName].nonAffectes++;
      }
    });

    Object.entries(types).forEach(([type, data]) => {
      console.log(`\n${type}: ${data.total}`);
      console.log(`  Par client:`);
      Object.entries(clientBreakdown[type]).forEach(([client, count]) => {
        console.log(`    ${client}: ${count}`);
      });
      console.log(`  Par gestionnaire:`);
      Object.entries(gestionnaireBreakdown[type]).forEach(([gest, count]) => {
        console.log(`    ${gest}: ${count}`);
      });
    });

    // 3. GESTIONNAIRE ASSIGNMENTS
    console.log('\n\n👥 3. GESTIONNAIRE ASSIGNMENTS:');
    console.log('=====================================');
    
    const gestionnaires = await prisma.user.findMany({
      where: { role: 'GESTIONNAIRE' },
      select: {
        id: true,
        fullName: true,
        assignedDocuments: {
          include: {
            bordereau: { include: { client: true } }
          },
          where: {
            bordereau: { archived: false }
          }
        }
      }
    });

    for (const gestionnaire of gestionnaires) {
      const docsByType = {};
      gestionnaire.assignedDocuments.forEach(doc => {
        const type = typeMapping[doc.type] || 'Prestation';
        docsByType[type] = (docsByType[type] || 0) + 1;
      });

      const traites = gestionnaire.assignedDocuments.filter(doc => doc.status === 'TRAITE').length;
      const enCours = gestionnaire.assignedDocuments.filter(doc => doc.status === 'EN_COURS').length;
      const retournes = gestionnaire.assignedDocuments.filter(doc => doc.status === 'REJETE').length;

      console.log(`\n${gestionnaire.fullName}`);
      console.log(`  Total affectés: ${gestionnaire.assignedDocuments.length}`);
      console.log(`  ✓ Traités: ${traites}`);
      console.log(`  ⏳ En cours: ${enCours}`);
      console.log(`  ↩ Retournés: ${retournes}`);
      console.log(`  Par type: ${Object.entries(docsByType).map(([type, count]) => `${type}: ${count}`).join(', ') || 'Aucun'}`);
    }

    // 4. DERNIERS BORDEREAUX AJOUTÉS
    console.log('\n\n📋 4. DERNIERS BORDEREAUX AJOUTÉS:');
    console.log('=====================================');
    
    const derniersDossiers = await prisma.document.findMany({
      where: { 
        bordereau: { archived: false }
      },
      include: {
        bordereau: { include: { client: true } },
        assignedTo: true
      },
      orderBy: { uploadedAt: 'desc' },
      take: 10
    });

    derniersDossiers.forEach(doc => {
      const reference = `DOS-${doc.id.substring(doc.id.length - 8)}`;
      const client = doc.bordereau?.client?.name || 'N/A';
      const type = typeMapping[doc.type] || 'Prestation';
      const gestionnaire = doc.assignedTo?.fullName || 'Non assigné';
      const completionPercentage = doc.status === 'TRAITE' ? 100 : doc.status === 'EN_COURS' ? 60 : 30;
      const states = doc.status === 'TRAITE' ? ['Traité'] : doc.status === 'EN_COURS' ? ['En cours'] : ['Nouveau'];
      const hasPDF = doc.path && !doc.path.includes('placeholder') ? '✅ PDF' : '❌ No PDF';
      
      console.log(`${reference} | ${client} | ${type} | ${completionPercentage}% | ${states.join(', ')} | ${gestionnaire} | ${hasPDF}`);
    });

    // 5. BORDEREAUX EN COURS
    console.log('\n\n🔄 5. BORDEREAUX EN COURS:');
    console.log('=====================================');
    
    const dossiersEnCours = await prisma.document.findMany({
      where: {
        bordereau: { 
          statut: { in: ['EN_COURS', 'ASSIGNE'] },
          archived: false 
        }
      },
      include: {
        bordereau: { include: { client: true } },
        assignedTo: true
      },
      orderBy: { uploadedAt: 'asc' },
      take: 10
    });

    dossiersEnCours.forEach(doc => {
      const reference = `DOS-${doc.id.substring(doc.id.length - 8)}`;
      const client = doc.bordereau?.client?.name || 'N/A';
      const type = typeMapping[doc.type] || 'Prestation';
      const joursEnCours = Math.floor((new Date().getTime() - new Date(doc.uploadedAt).getTime()) / (1000 * 60 * 60 * 24));
      const priorite = joursEnCours > 7 ? 'Élevée' : joursEnCours > 3 ? 'Moyenne' : 'Normale';
      
      console.log(`${reference} | ${client} | ${type} | ${joursEnCours} jours | ${priorite}`);
    });

    // 6. RAW DATABASE COUNTS
    console.log('\n\n🗄️ 6. RAW DATABASE COUNTS:');
    console.log('=====================================');
    
    const totalBordereaux = await prisma.bordereau.count();
    const totalDocuments = await prisma.document.count();
    const totalUsers = await prisma.user.count({ where: { role: 'GESTIONNAIRE' } });
    const totalClients = await prisma.client.count();
    
    console.log(`Total Bordereaux in DB: ${totalBordereaux}`);
    console.log(`Total Documents in DB: ${totalDocuments}`);
    console.log(`Total Gestionnaires: ${totalUsers}`);
    console.log(`Total Clients: ${totalClients}`);

    // 7. DOCUMENT STATUS DISTRIBUTION
    console.log('\n\n📈 7. DOCUMENT STATUS DISTRIBUTION:');
    console.log('=====================================');
    
    const statusCounts = await prisma.document.groupBy({
      by: ['status'],
      _count: { id: true },
      where: { bordereau: { archived: false } }
    });
    
    statusCounts.forEach(status => {
      const statusLabel = status.status === 'TRAITE' ? 'Traité' : 
                         status.status === 'EN_COURS' ? 'En cours' : 
                         status.status === 'REJETE' ? 'Retourné' : 
                         status.status || 'Nouveau';
      console.log(`${statusLabel}: ${status._count.id}`);
    });

    // 8. ALL DOCUMENTS WITH PDF STATUS
    console.log('\n\n📄 8. ALL DOCUMENTS WITH PDF STATUS:');
    console.log('=====================================');
    
    const allDocuments = await prisma.document.findMany({
      where: { bordereau: { archived: false } },
      include: {
        bordereau: { include: { client: true } },
        assignedTo: true
      },
      orderBy: { uploadedAt: 'desc' }
    });

    let documentsWithPDF = 0;
    let documentsWithoutPDF = 0;
    
    console.log('Documents with PDF files:');
    console.log('-------------------------');
    allDocuments.forEach(doc => {
      const reference = `DOS-${doc.id.substring(doc.id.length - 8)}`;
      const client = doc.bordereau?.client?.name || 'N/A';
      const type = typeMapping[doc.type] || 'Prestation';
      const gestionnaire = doc.assignedTo?.fullName || 'Non assigné';
      const hasPDF = doc.path && !doc.path.includes('placeholder');
      
      if (hasPDF) {
        documentsWithPDF++;
        console.log(`✅ ${reference} | ${client} | ${type} | ${gestionnaire} | Path: ${doc.path}`);
      } else {
        documentsWithoutPDF++;
      }
    });
    
    console.log('\nDocuments WITHOUT PDF files:');
    console.log('-----------------------------');
    allDocuments.forEach(doc => {
      const reference = `DOS-${doc.id.substring(doc.id.length - 8)}`;
      const client = doc.bordereau?.client?.name || 'N/A';
      const type = typeMapping[doc.type] || 'Prestation';
      const gestionnaire = doc.assignedTo?.fullName || 'Non assigné';
      const hasPDF = doc.path && !doc.path.includes('placeholder');
      
      if (!hasPDF) {
        console.log(`❌ ${reference} | ${client} | ${type} | ${gestionnaire} | Path: ${doc.path || 'NULL'}`);
      }
    });
    
    console.log(`\n📊 PDF SUMMARY:`);
    console.log(`Documents with PDF: ${documentsWithPDF}`);
    console.log(`Documents without PDF: ${documentsWithoutPDF}`);
    console.log(`Total documents: ${allDocuments.length}`);

  } catch (error) {
    console.error('❌ Error extracting data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

extractChefDashboardData();