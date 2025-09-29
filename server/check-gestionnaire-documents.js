const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function checkGestionnaireDocuments() {
  try {
    console.log('🔍 Checking documents for Test Gestionnaire...\n');

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
    console.log(`   Name: ${testGestionnaire.fullName}\n`);

    // Get all bordereaux assigned to this gestionnaire
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
            type: true,
            path: true,
            status: true
          }
        }
      }
    });

    console.log(`📊 ASSIGNED BORDEREAUX: ${assignedBordereaux.length} total\n`);

    let totalDocuments = 0;
    let documentsWithPDF = 0;
    let documentsWithoutPDF = 0;

    assignedBordereaux.forEach((bordereau, index) => {
      console.log(`${index + 1}. Bordereau: ${bordereau.reference}`);
      console.log(`   Client: ${bordereau.client?.name || 'N/A'}`);
      console.log(`   Documents: ${bordereau.documents.length}`);
      
      if (bordereau.documents.length === 0) {
        console.log('   ❌ No documents attached');
      } else {
        bordereau.documents.forEach(doc => {
          totalDocuments++;
          console.log(`     📄 Document ID: ${doc.id}`);
          console.log(`        Name: ${doc.name}`);
          console.log(`        Type: ${doc.type}`);
          console.log(`        Path: ${doc.path || 'No path'}`);
          console.log(`        Status: ${doc.status || 'No status'}`);
          
          // Check if PDF file exists
          if (doc.path && !doc.path.includes('placeholder')) {
            const filePath = path.join(process.cwd(), 'uploads', doc.path);
            if (fs.existsSync(filePath)) {
              console.log(`        ✅ PDF file exists: ${filePath}`);
              documentsWithPDF++;
            } else {
              console.log(`        ❌ PDF file NOT found: ${filePath}`);
              documentsWithoutPDF++;
            }
          } else {
            console.log(`        ❌ No valid path (placeholder or empty)`);
            documentsWithoutPDF++;
          }
          console.log('');
        });
      }
      console.log('');
    });

    console.log('📈 SUMMARY:');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Total Bordereaux: ${assignedBordereaux.length}`);
    console.log(`Total Documents: ${totalDocuments}`);
    console.log(`Documents with PDF: ${documentsWithPDF}`);
    console.log(`Documents without PDF: ${documentsWithoutPDF}`);
    console.log(`PDF Success Rate: ${totalDocuments > 0 ? Math.round((documentsWithPDF / totalDocuments) * 100) : 0}%\n`);

    // Show specific document that was requested
    const requestedDocId = 'ec2cf97f-5cf1-4205-a434-32ca63294427';
    console.log(`🔍 CHECKING SPECIFIC DOCUMENT: ${requestedDocId}`);
    console.log('═══════════════════════════════════════════════════════');
    
    const specificDoc = await prisma.document.findUnique({
      where: { id: requestedDocId },
      include: {
        bordereau: {
          include: {
            client: true
          }
        }
      }
    });

    if (specificDoc) {
      console.log('✅ Document found in database:');
      console.log(`   Name: ${specificDoc.name}`);
      console.log(`   Type: ${specificDoc.type}`);
      console.log(`   Path: ${specificDoc.path || 'No path'}`);
      console.log(`   Bordereau: ${specificDoc.bordereau?.reference}`);
      console.log(`   Client: ${specificDoc.bordereau?.client?.name}`);
      console.log(`   Assigned to: ${specificDoc.assignedToUserId}`);
      
      if (specificDoc.path && !specificDoc.path.includes('placeholder')) {
        const filePath = path.join(process.cwd(), 'uploads', specificDoc.path);
        if (fs.existsSync(filePath)) {
          console.log(`   ✅ PDF file exists: ${filePath}`);
        } else {
          console.log(`   ❌ PDF file NOT found: ${filePath}`);
        }
      } else {
        console.log(`   ❌ No valid PDF path`);
      }
    } else {
      console.log('❌ Document NOT found in database');
      
      // Check if this ID appears in the gestionnaire corbeille data
      console.log('\n🔍 Checking if this ID appears in corbeille data...');
      const allDocs = assignedBordereaux.flatMap(b => b.documents);
      const foundInCorbeille = allDocs.find(d => d.id === requestedDocId);
      
      if (foundInCorbeille) {
        console.log('✅ Found in corbeille data');
      } else {
        console.log('❌ NOT found in corbeille data');
        console.log('💡 This suggests the frontend is using a different ID than what the backend returns');
      }
    }

    console.log('\n💡 RECOMMENDATIONS:');
    console.log('═══════════════════════════════════════════════════════');
    if (documentsWithoutPDF > 0) {
      console.log('1. Create actual PDF files for documents without PDFs');
      console.log('2. Update document paths to point to real files');
      console.log('3. Remove placeholder paths from database');
    }
    if (totalDocuments === 0) {
      console.log('1. Create documents for bordereaux that have none');
      console.log('2. Ensure documents are properly linked to bordereaux');
    }

  } catch (error) {
    console.error('❌ Error checking documents:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGestionnaireDocuments();