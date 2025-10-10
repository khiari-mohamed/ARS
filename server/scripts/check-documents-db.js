const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDocuments() {
  console.log('🔍 Checking Documents Database...\n');

  try {
    // Check all documents
    const allDocs = await prisma.document.findMany({
      include: {
        bordereau: true,
        uploader: true
      },
      orderBy: { uploadedAt: 'desc' },
      take: 10
    });

    console.log(`📄 Total Recent Documents: ${allDocs.length}\n`);
    
    allDocs.forEach((doc, index) => {
      console.log(`\n--- Document ${index + 1} ---`);
      console.log(`ID: ${doc.id}`);
      console.log(`Name: ${doc.name}`);
      console.log(`Type: ${doc.type}`);
      console.log(`Status: ${doc.status}`);
      console.log(`Uploader: ${doc.uploader?.username || 'N/A'}`);
      console.log(`Bordereau ID: ${doc.bordereauId || 'NOT LINKED'}`);
      console.log(`Bordereau Ref: ${doc.bordereau?.reference || 'N/A'}`);
      console.log(`Uploaded: ${doc.uploadedAt}`);
      console.log(`File Path: ${doc.path}`);
    });

    // Check bordereau brchef3 specifically
    console.log('\n\n🔍 Checking Bordereau "brchef3"...\n');
    
    const bordereau = await prisma.bordereau.findFirst({
      where: { reference: 'brchef3' },
      include: {
        documents: true,
        client: true,
        chargeCompte: true
      }
    });

    if (bordereau) {
      console.log('✅ Bordereau Found:');
      console.log(`ID: ${bordereau.id}`);
      console.log(`Reference: ${bordereau.reference}`);
      console.log(`Client: ${bordereau.client?.name || 'N/A'}`);
      console.log(`Type: ${bordereau.type}`);
      console.log(`Status: ${bordereau.status}`);
      console.log(`Charge Compte: ${bordereau.chargeCompte?.username || 'Non assigné'}`);
      console.log(`Total BS: ${bordereau.totalBS || 0}`);
      console.log(`Documents Linked: ${bordereau.documents.length}`);
      
      if (bordereau.documents.length > 0) {
        console.log('\n📎 Linked Documents:');
        bordereau.documents.forEach((doc, i) => {
          console.log(`  ${i + 1}. ${doc.name} (${doc.type}) - Status: ${doc.status}`);
        });
      } else {
        console.log('\n⚠️ NO DOCUMENTS LINKED TO THIS BORDEREAU!');
      }
    } else {
      console.log('❌ Bordereau "brchef3" NOT FOUND in database!');
    }

    // Check documents with bordereauId = brchef3's ID
    if (bordereau) {
      console.log('\n\n🔍 Checking documents with bordereauId...\n');
      const linkedDocs = await prisma.document.findMany({
        where: { bordereauId: bordereau.id }
      });
      console.log(`Found ${linkedDocs.length} documents linked to bordereau ID: ${bordereau.id}`);
    }

    // Check all bordereaux
    console.log('\n\n📋 All Bordereaux:\n');
    const allBordereaux = await prisma.bordereau.findMany({
      include: {
        client: true,
        chargeCompte: true,
        _count: {
          select: { documents: true }
        }
      },
      orderBy: { dateReception: 'desc' }
    });

    allBordereaux.forEach((b, i) => {
      console.log(`${i + 1}. ${b.reference} - Client: ${b.client?.name || 'N/A'} - Docs: ${b._count.documents} - Charge: ${b.chargeCompte?.username || 'Non assigné'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDocuments();
