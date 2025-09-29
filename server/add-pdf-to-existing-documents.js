const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function addPDFToExistingDocuments() {
  try {
    console.log('🚀 Adding PDF files to existing documents...');

    // Get existing documents to add PDF files for testing
    const documents = await prisma.document.findMany({
      include: {
        bordereau: { include: { client: true } }
      },
      take: 10 // Update first 10 documents
    });

    if (documents.length === 0) {
      console.log('❌ No documents found.');
      return;
    }

    console.log(`📋 Found ${documents.length} documents to add PDF files`);

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Test PDF content
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

    const updatedDocuments = [];

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      
      // Create PDF filename based on document name or ID
      const pdfFileName = `${doc.name.replace(/[^a-zA-Z0-9]/g, '_')}_${doc.id.substring(0, 8)}.pdf`;
      const pdfPath = path.join(uploadsDir, pdfFileName);
      
      // Create PDF file
      fs.writeFileSync(pdfPath, testPDFContent);
      
      // Update document in database with new PDF path
      const updatedDoc = await prisma.document.update({
        where: { id: doc.id },
        data: {
          path: pdfFileName // Just the filename, not full path
        }
      });

      updatedDocuments.push({
        id: doc.id,
        name: doc.name,
        reference: `DOS-${doc.id.substring(doc.id.length - 8)}`,
        client: doc.bordereau?.client?.name || 'N/A',
        pdfPath: pdfPath,
        oldPath: doc.path
      });

      console.log(`✅ Updated document: ${doc.name} (${doc.id})`);
      console.log(`   Old path: ${doc.path || 'null'}`);
      console.log(`   New path: ${pdfFileName}`);
    }

    console.log('\n🎉 PDF files added to existing documents successfully!');
    console.log('\n📋 Summary:');
    updatedDocuments.forEach(doc => {
      console.log(`  • ${doc.reference} - ${doc.name}`);
      console.log(`    Client: ${doc.client}`);
      console.log(`    PDF: ${doc.pdfPath}`);
      console.log('');
    });

    console.log('🔗 You can now test the "Voir PDF" button with these updated documents!');
    console.log('📝 Document IDs for testing:');
    updatedDocuments.forEach(doc => {
      console.log(`  ${doc.reference}: ${doc.id}`);
    });

  } catch (error) {
    console.error('❌ Error adding PDF files:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addPDFToExistingDocuments();