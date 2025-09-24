const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const documentTypes = [
  { type: 'BULLETIN_SOIN', label: 'Bulletin de Soin', count: 2 },
  { type: 'COMPLEMENT_INFORMATION', label: 'Complément Information', count: 2 },
  { type: 'ADHESION', label: 'Adhésion', count: 2 },
  { type: 'RECLAMATION', label: 'Réclamation', count: 2 },
  { type: 'CONTRAT_AVENANT', label: 'Contrat/Avenant', count: 2 },
  { type: 'DEMANDE_RESILIATION', label: 'Demande Résiliation', count: 2 },
  { type: 'CONVENTION_TIERS_PAYANT', label: 'Convention Tiers Payant', count: 2 }
];

async function populateDocumentTypes() {
  try {
    console.log('🚀 Starting document types population...');

    // Get first user for uploader
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error('❌ No user found. Please create a user first.');
      return;
    }

    console.log(`👤 Using user: ${user.fullName}`);

    for (const docType of documentTypes) {
      console.log(`\n📄 Creating ${docType.count} documents for ${docType.label}...`);
      
      for (let i = 1; i <= docType.count; i++) {
        const name = `${docType.type}-TEST-${Date.now()}-${String(i).padStart(3, '0')}.pdf`;
        const path = `/uploads/test/${name}`;
        
        const document = await prisma.document.create({
          data: {
            name,
            type: docType.type,
            path,
            uploadedById: user.id,
            status: ['UPLOADED', 'EN_COURS', 'TRAITE'][Math.floor(Math.random() * 3)]
          }
        });

        console.log(`  ✅ Created: ${name} (${document.status})`);
      }
    }

    console.log('\n🎉 Document types population completed successfully!');
    console.log('\n📊 Summary:');
    documentTypes.forEach(docType => {
      console.log(`  • ${docType.label}: ${docType.count} documents`);
    });

  } catch (error) {
    console.error('❌ Error populating document types:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
populateDocumentTypes();