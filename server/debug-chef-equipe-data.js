const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugChefEquipeData() {
  console.log('\n========================================');
  console.log('🔍 DEBUG: Chef d\'équipe Data Analysis');
  console.log('========================================\n');

  try {
    // Find chef d'équipe user
    const chefUser = await prisma.user.findFirst({
      where: { role: 'CHEF_EQUIPE' }
    });

    if (!chefUser) {
      console.log('❌ No CHEF_EQUIPE user found');
      return;
    }

    console.log(`✅ Chef d'équipe user: ${chefUser.fullName} (${chefUser.email})`);
    console.log(`   User ID: ${chefUser.id}\n`);

    // Get all bordereaux
    console.log('📦 BORDEREAUX:');
    console.log('─────────────────────────────────────────\n');
    
    const bordereaux = await prisma.bordereau.findMany({
      include: {
        client: true,
        documents: {
          include: {
            assignedTo: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Total Bordereaux: ${bordereaux.length}\n`);

    bordereaux.forEach((bordereau, index) => {
      console.log(`${index + 1}. Bordereau: ${bordereau.reference}`);
      console.log(`   ID: ${bordereau.id}`);
      console.log(`   Client: ${bordereau.client?.name || 'N/A'}`);
      console.log(`   Type: ${bordereau.type}`);
      console.log(`   Statut: ${bordereau.statut}`);
      console.log(`   Date: ${bordereau.dateReception}`);
      console.log(`   Documents: ${bordereau.documents.length}`);
      
      if (bordereau.documents.length > 0) {
        console.log(`   Documents détails:`);
        bordereau.documents.forEach((doc, docIndex) => {
          console.log(`      ${docIndex + 1}. ${doc.name}`);
          console.log(`         - ID: ${doc.id}`);
          console.log(`         - Type: ${doc.type}`);
          console.log(`         - Status: ${doc.status}`);
          console.log(`         - Assigné à: ${doc.assignedTo?.fullName || 'Non assigné'}`);
          console.log(`         - Date upload: ${doc.uploadedAt}`);
        });
      }
      console.log('');
    });

    // Get all documents
    console.log('\n📄 ALL DOCUMENTS (Direct Query):');
    console.log('─────────────────────────────────────────\n');
    
    const allDocuments = await prisma.document.findMany({
      include: {
        bordereau: {
          include: {
            client: true
          }
        },
        assignedTo: true,
        uploader: true
      },
      orderBy: { uploadedAt: 'desc' }
    });

    console.log(`Total Documents: ${allDocuments.length}\n`);

    allDocuments.forEach((doc, index) => {
      console.log(`${index + 1}. Document: ${doc.name}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Type: ${doc.type}`);
      console.log(`   Status: ${doc.status}`);
      console.log(`   Bordereau: ${doc.bordereau?.reference || 'N/A'}`);
      console.log(`   Client: ${doc.bordereau?.client?.name || 'N/A'}`);
      console.log(`   Assigné à: ${doc.assignedTo?.fullName || 'Non assigné'}`);
      console.log(`   Uploadé par: ${doc.uploader?.fullName || 'N/A'}`);
      console.log(`   Date: ${doc.uploadedAt}`);
      console.log('');
    });

    // Group by status
    console.log('\n📈 DOCUMENTS BY STATUS:');
    console.log('─────────────────────────────────────────\n');
    
    const statusGroups = {};
    allDocuments.forEach(doc => {
      const status = doc.status || 'UNKNOWN';
      if (!statusGroups[status]) {
        statusGroups[status] = [];
      }
      statusGroups[status].push(doc.name);
    });

    Object.entries(statusGroups).forEach(([status, docs]) => {
      console.log(`${status}: ${docs.length} documents`);
      docs.forEach(name => console.log(`   - ${name}`));
      console.log('');
    });

    // Check what GED Corbeille would show
    console.log('\n🗂️ GED CORBEILLE TABS:');
    console.log('─────────────────────────────────────────\n');
    
    const traites = allDocuments.filter(doc => 
      doc.status === 'TRAITE' || doc.status === 'Traité' || doc.status === 'SCANNE'
    );
    const enCours = allDocuments.filter(doc => 
      doc.status === 'EN_COURS' || doc.status === 'En cours' || doc.status === 'UPLOADED' || doc.status === 'Nouveau'
    );
    const nonAffectes = allDocuments.filter(doc => 
      doc.status === 'A_AFFECTER' || doc.status === 'NON_AFFECTE' || !doc.assignedToUserId
    );

    console.log(`Traités (${traites.length}):`);
    traites.forEach(doc => console.log(`   - ${doc.name} (${doc.status})`));
    
    console.log(`\nEn cours (${enCours.length}):`);
    enCours.forEach(doc => console.log(`   - ${doc.name} (${doc.status})`));
    
    console.log(`\nNon affectés (${nonAffectes.length}):`);
    nonAffectes.forEach(doc => console.log(`   - ${doc.name} (${doc.status})`));

    console.log('\n========================================');
    console.log('✅ Debug Complete');
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugChefEquipeData();
