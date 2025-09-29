const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function createSampleDocuments() {
  try {
    console.log('🔧 Creating sample documents for Test Gestionnaire bordereaux...\n');

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

    // Get bordereaux without documents
    const bordereauxWithoutDocs = await prisma.bordereau.findMany({
      where: {
        assignedToUserId: testGestionnaire.id,
        documents: {
          none: {}
        }
      },
      include: {
        client: { select: { name: true } }
      }
    });

    console.log(`📊 Found ${bordereauxWithoutDocs.length} bordereaux without documents\n`);

    // Copy existing PDF files to create samples
    const sourceFiles = [
      'test-bulletin-soin-001.pdf',
      'test-adhesion-002.pdf'
    ];

    let createdCount = 0;

    for (let i = 0; i < Math.min(bordereauxWithoutDocs.length, 15); i++) {
      const bordereau = bordereauxWithoutDocs[i];
      const sourceFile = sourceFiles[i % sourceFiles.length];
      const sourcePath = path.join(process.cwd(), 'uploads', sourceFile);
      
      if (!fs.existsSync(sourcePath)) {
        console.log(`❌ Source file not found: ${sourcePath}`);
        continue;
      }

      // Create new filename
      const newFileName = `sample-${bordereau.reference.toLowerCase()}.pdf`;
      const newFilePath = path.join(process.cwd(), 'uploads', newFileName);

      try {
        // Copy the PDF file
        fs.copyFileSync(sourcePath, newFilePath);
        console.log(`✅ Created PDF: ${newFileName}`);

        // Determine document type based on client or reference
        let docType = 'BULLETIN_SOIN';
        if (bordereau.reference.includes('GAT') && i % 3 === 0) {
          docType = 'ADHESION';
        } else if (bordereau.reference.includes('RECLA')) {
          docType = 'RECLAMATION';
        }

        // Create document record
        const document = await prisma.document.create({
          data: {
            name: `${bordereau.reference}-Document.pdf`,
            type: docType,
            path: newFileName,
            status: 'EN_COURS',
            bordereau: {
              connect: { id: bordereau.id }
            },
            assignedTo: {
              connect: { id: testGestionnaire.id }
            },
            uploader: {
              connect: { id: testGestionnaire.id }
            },
            uploadedAt: new Date()
          }
        });

        console.log(`✅ Created document record: ${document.id}`);
        console.log(`   Name: ${document.name}`);
        console.log(`   Type: ${document.type}`);
        console.log(`   Path: ${document.path}`);
        console.log(`   Bordereau: ${bordereau.reference}`);
        console.log('');

        createdCount++;

      } catch (error) {
        console.error(`❌ Error creating document for ${bordereau.reference}:`, error.message);
      }
    }

    console.log(`🎉 Created ${createdCount} sample documents with PDF files\n`);

    // Verify the results
    const updatedBordereaux = await prisma.bordereau.findMany({
      where: {
        assignedToUserId: testGestionnaire.id
      },
      include: {
        documents: {
          select: { 
            id: true,
            name: true, 
            type: true,
            path: true
          }
        }
      }
    });

    const withDocs = updatedBordereaux.filter(b => b.documents.length > 0).length;
    const totalDocs = updatedBordereaux.reduce((sum, b) => sum + b.documents.length, 0);

    console.log('📈 UPDATED SUMMARY:');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Total Bordereaux: ${updatedBordereaux.length}`);
    console.log(`Bordereaux with Documents: ${withDocs}`);
    console.log(`Total Documents: ${totalDocs}`);
    console.log(`Coverage: ${Math.round((withDocs / updatedBordereaux.length) * 100)}%`);

  } catch (error) {
    console.error('❌ Error creating sample documents:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSampleDocuments();