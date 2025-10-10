const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkChefGestionnaireData() {
  console.log('='.repeat(80));
  console.log('📊 CHECKING CHEF D\'ÉQUIPE AND GESTIONNAIRE DATA');
  console.log('='.repeat(80));
  console.log('');

  try {
    // 1. Find chef1 user
    const chef1 = await prisma.user.findFirst({
      where: { 
        OR: [
          { email: 'chef1@ars.tn' },
          { fullName: { contains: 'chef1' } }
        ]
      }
    });

    if (!chef1) {
      console.log('❌ Chef1 user not found!');
      return;
    }

    console.log('👤 CHEF D\'ÉQUIPE FOUND:');
    console.log(`   ID: ${chef1.id}`);
    console.log(`   Full Name: ${chef1.fullName}`);
    console.log(`   Email: ${chef1.email}`);
    console.log(`   Role: ${chef1.role}`);
    console.log('');

    // 2. Find gestionnaire belonging to chef1
    const gestionnaires = await prisma.user.findMany({
      where: {
        role: 'GESTIONNAIRE',
        teamLeaderId: chef1.id
      }
    });

    console.log(`👥 GESTIONNAIRES UNDER CHEF1: ${gestionnaires.length}`);
    gestionnaires.forEach((gest, idx) => {
      console.log(`   ${idx + 1}. ${gest.fullName} - ID: ${gest.id}`);
    });
    console.log('');

    // 3. Get all bordereaux accessible to chef1
    const bordereaux = await prisma.bordereau.findMany({
      where: {
        archived: false,
        OR: [
          { currentHandlerId: chef1.id },
          { 
            contract: {
              teamLeaderId: chef1.id
            }
          }
        ]
      },
      include: {
        client: true,
        contract: true,
        documents: {
          include: {
            assignedTo: true
          }
        },
        currentHandler: true
      },
      orderBy: { dateReception: 'desc' }
    });

    console.log(`📋 BORDEREAUX ACCESSIBLE TO CHEF1: ${bordereaux.length}`);
    console.log('');

    // Group by status
    const statusGroups = {
      'A_SCANNER': [],
      'SCAN_EN_COURS': [],
      'SCANNE': [],
      'A_AFFECTER': [],
      'EN_COURS': [],
      'ASSIGNE': [],
      'TRAITE': [],
      'CLOTURE': []
    };

    bordereaux.forEach(b => {
      if (statusGroups[b.statut]) {
        statusGroups[b.statut].push(b);
      }
    });

    console.log('📊 BORDEREAUX BY STATUS:');
    Object.entries(statusGroups).forEach(([status, items]) => {
      if (items.length > 0) {
        console.log(`   ${status}: ${items.length}`);
      }
    });
    console.log('');

    // 4. Detailed bordereau information
    console.log('📄 DETAILED BORDEREAU INFORMATION:');
    console.log('-'.repeat(80));
    
    bordereaux.slice(0, 10).forEach((bordereau, idx) => {
      console.log(`\n${idx + 1}. BORDEREAU: ${bordereau.reference}`);
      console.log(`   ID: ${bordereau.id}`);
      console.log(`   Client: ${bordereau.client?.name || 'N/A'}`);
      console.log(`   Status: ${bordereau.statut}`);
      console.log(`   Date Reception: ${bordereau.dateReception.toISOString().split('T')[0]}`);
      console.log(`   Current Handler: ${bordereau.currentHandler?.fullName || 'Non assigné'}`);
      console.log(`   Total Documents: ${bordereau.documents.length}`);
      
      if (bordereau.documents.length > 0) {
        console.log(`   Documents:`);
        bordereau.documents.forEach((doc, docIdx) => {
          console.log(`      ${docIdx + 1}. ${doc.name}`);
          console.log(`         - ID: ${doc.id}`);
          console.log(`         - Type: ${doc.type}`);
          console.log(`         - Status: ${doc.status || 'UPLOADED'}`);
          console.log(`         - Assigned To: ${doc.assignedTo?.fullName || 'Non assigné'}`);
          console.log(`         - Path: ${doc.path}`);
        });
      }
    });

    if (bordereaux.length > 10) {
      console.log(`\n... and ${bordereaux.length - 10} more bordereaux`);
    }

    console.log('');
    console.log('-'.repeat(80));

    // 5. Documents assigned to gestionnaires
    console.log('');
    console.log('📝 DOCUMENTS ASSIGNED TO GESTIONNAIRES:');
    console.log('-'.repeat(80));

    for (const gestionnaire of gestionnaires) {
      const assignedDocs = await prisma.document.findMany({
        where: {
          assignedToUserId: gestionnaire.id,
          bordereau: {
            archived: false
          }
        },
        include: {
          bordereau: {
            include: {
              client: true
            }
          }
        },
        orderBy: { uploadedAt: 'desc' }
      });

      console.log(`\n👤 ${gestionnaire.fullName}`);
      console.log(`   Total Assigned Documents: ${assignedDocs.length}`);
      
      if (assignedDocs.length > 0) {
        // Group by status
        const docsByStatus = {
          'UPLOADED': 0,
          'SCANNE': 0,
          'EN_COURS': 0,
          'TRAITE': 0,
          'REJETE': 0
        };

        assignedDocs.forEach(doc => {
          const status = doc.status || 'UPLOADED';
          if (docsByStatus[status] !== undefined) {
            docsByStatus[status]++;
          }
        });

        console.log(`   By Status:`);
        Object.entries(docsByStatus).forEach(([status, count]) => {
          if (count > 0) {
            console.log(`      ${status}: ${count}`);
          }
        });

        console.log(`   Recent Documents (last 5):`);
        assignedDocs.slice(0, 5).forEach((doc, idx) => {
          console.log(`      ${idx + 1}. ${doc.name}`);
          console.log(`         - Bordereau: ${doc.bordereau?.reference || 'N/A'}`);
          console.log(`         - Client: ${doc.bordereau?.client?.name || 'N/A'}`);
          console.log(`         - Type: ${doc.type}`);
          console.log(`         - Status: ${doc.status || 'UPLOADED'}`);
          console.log(`         - Uploaded: ${doc.uploadedAt.toISOString().split('T')[0]}`);
        });
      }
    }

    console.log('');
    console.log('-'.repeat(80));

    // 6. Summary Statistics
    console.log('');
    console.log('📈 SUMMARY STATISTICS:');
    console.log('-'.repeat(80));
    
    const totalDocuments = bordereaux.reduce((sum, b) => sum + b.documents.length, 0);
    const assignedDocuments = await prisma.document.count({
      where: {
        assignedToUserId: { in: gestionnaires.map(g => g.id) },
        bordereau: { archived: false }
      }
    });
    const unassignedDocuments = totalDocuments - assignedDocuments;

    console.log(`Total Bordereaux: ${bordereaux.length}`);
    console.log(`Total Documents: ${totalDocuments}`);
    console.log(`Assigned to Gestionnaires: ${assignedDocuments}`);
    console.log(`Unassigned: ${unassignedDocuments}`);
    console.log('');

    // Document types breakdown
    const docTypes = await prisma.document.groupBy({
      by: ['type'],
      where: {
        bordereau: {
          archived: false,
          OR: [
            { currentHandlerId: chef1.id },
            { contract: { teamLeaderId: chef1.id } }
          ]
        }
      },
      _count: true
    });

    console.log('Documents by Type:');
    docTypes.forEach(dt => {
      console.log(`   ${dt.type}: ${dt._count}`);
    });

    console.log('');
    console.log('='.repeat(80));
    console.log('✅ DATA CHECK COMPLETE');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error checking data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
checkChefGestionnaireData();
