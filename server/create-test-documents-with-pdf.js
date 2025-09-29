const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function createTestDocumentsWithPDF() {
  try {
    console.log('🚀 Creating test documents with PDF files...');

    // Get existing bordereaux and clients
    const bordereaux = await prisma.bordereau.findMany({
      include: { client: true },
      take: 5
    });

    const gestionnaires = await prisma.user.findMany({
      where: { role: 'GESTIONNAIRE' },
      take: 3
    });

    if (bordereaux.length === 0) {
      console.log('❌ No bordereaux found. Creating some first...');
      return;
    }

    if (gestionnaires.length === 0) {
      console.log('❌ No gestionnaires found. Creating some first...');
      return;
    }

    // Create test PDF files in uploads directory
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const testPDFContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test PDF Document) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
299
%%EOF`;

    const documentsToCreate = [
      {
        name: 'Bulletin_Soin_001.pdf',
        type: 'BULLETIN_SOIN',
        fileName: 'test-bulletin-soin-001.pdf'
      },
      {
        name: 'Adhesion_Client_002.pdf',
        type: 'ADHESION',
        fileName: 'test-adhesion-002.pdf'
      },
      {
        name: 'Complement_Dossier_003.pdf',
        type: 'COMPLEMENT_INFORMATION',
        fileName: 'test-complement-003.pdf'
      },
      {
        name: 'Reclamation_004.pdf',
        type: 'RECLAMATION',
        fileName: 'test-reclamation-004.pdf'
      },
      {
        name: 'Avenant_Contrat_005.pdf',
        type: 'CONTRAT_AVENANT',
        fileName: 'test-avenant-005.pdf'
      }
    ];

    const createdDocuments = [];

    for (let i = 0; i < documentsToCreate.length; i++) {
      const docData = documentsToCreate[i];
      const bordereau = bordereaux[i % bordereaux.length];
      const gestionnaire = gestionnaires[i % gestionnaires.length];

      // Create PDF file
      const pdfPath = path.join(uploadsDir, docData.fileName);
      fs.writeFileSync(pdfPath, testPDFContent);

      // Create document in database
      const document = await prisma.document.create({
        data: {
          name: docData.name,
          type: docData.type,
          path: docData.fileName, // Just the filename, not full path
          uploadedAt: new Date(),
          uploadedById: gestionnaire.id,
          bordereauId: bordereau.id,
          assignedToUserId: gestionnaire.id,
          assignedAt: new Date(),
          assignedByUserId: gestionnaire.id,
          status: ['UPLOADED', 'EN_COURS', 'TRAITE'][Math.floor(Math.random() * 3)],
          priority: Math.floor(Math.random() * 3) + 1
        }
      });

      createdDocuments.push({
        id: document.id,
        name: document.name,
        type: document.type,
        reference: `DOS-${document.id.substring(document.id.length - 8)}`,
        client: bordereau.client?.name || 'N/A',
        gestionnaire: gestionnaire.fullName,
        pdfPath: pdfPath
      });

      console.log(`✅ Created document: ${document.name} (${document.id})`);
    }

    console.log('\n🎉 Test documents with PDF files created successfully!');
    console.log('\n📋 Summary:');
    createdDocuments.forEach(doc => {
      console.log(`  • ${doc.reference} - ${doc.name}`);
      console.log(`    Client: ${doc.client}`);
      console.log(`    Gestionnaire: ${doc.gestionnaire}`);
      console.log(`    PDF: ${doc.pdfPath}`);
      console.log('');
    });

    console.log('🔗 You can now test the "Voir PDF" button with these documents!');
    console.log('📝 Document IDs for testing:');
    createdDocuments.forEach(doc => {
      console.log(`  ${doc.reference}: ${doc.id}`);
    });

  } catch (error) {
    console.error('❌ Error creating test documents:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createTestDocumentsWithPDF();