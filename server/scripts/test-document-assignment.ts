import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDocumentAssignment() {
  console.log('=== TESTING DOCUMENT ASSIGNMENT ===\n');

  try {
    // Get all documents
    const documents = await prisma.document.findMany({
      include: {
        assignedTo: { select: { fullName: true } },
        bordereau: { select: { reference: true } }
      }
    });

    console.log(`📊 Total documents in database: ${documents.length}\n`);

    // Show assignment status
    const assigned = documents.filter(doc => doc.assignedToUserId);
    const unassigned = documents.filter(doc => !doc.assignedToUserId);

    console.log(`👥 Documents assigned to gestionnaires: ${assigned.length}`);
    console.log(`❌ Documents not assigned: ${unassigned.length}\n`);

    if (assigned.length > 0) {
      console.log('📈 ASSIGNED DOCUMENTS:');
      assigned.forEach(doc => {
        console.log(`  - ${doc.name} (${doc.bordereau?.reference}) → ${doc.assignedTo?.fullName}`);
      });
      console.log('');
    }

    if (unassigned.length > 0) {
      console.log('📋 UNASSIGNED DOCUMENTS:');
      unassigned.forEach(doc => {
        console.log(`  - ${doc.name} (${doc.bordereau?.reference}) → Not assigned`);
      });
      console.log('');
    }

    // Get all gestionnaires
    const gestionnaires = await prisma.user.findMany({
      where: { role: 'GESTIONNAIRE' },
      select: { id: true, fullName: true }
    });

    console.log('👤 AVAILABLE GESTIONNAIRES:');
    gestionnaires.forEach(g => {
      const assignedCount = assigned.filter(doc => doc.assignedToUserId === g.id).length;
      console.log(`  - ${g.fullName} (${g.id}): ${assignedCount} documents assigned`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDocumentAssignment();