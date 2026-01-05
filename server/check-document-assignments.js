const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDocumentAssignments() {
  console.log('=== Checking Document Assignments for Bordereaux ===\n');

  const bordereaux = await prisma.bordereau.findMany({
    where: {
      reference: { in: ['PGH BR 20-2025 DE SIDI OTHMEN', 'bordx_senior_1', 'AIRBUS BR 34-2025'] }
    },
    include: {
      documents: {
        include: {
          assignedTo: { select: { fullName: true, role: true } }
        }
      }
    }
  });

  for (const b of bordereaux) {
    console.log(`\n--- ${b.reference} ---`);
    console.log(`Total documents: ${b.documents.length}`);
    
    const assignments = new Map();
    b.documents.forEach(doc => {
      if (doc.assignedTo) {
        const key = `${doc.assignedTo.fullName} (${doc.assignedTo.role})`;
        assignments.set(key, (assignments.get(key) || 0) + 1);
      }
    });
    
    if (assignments.size > 0) {
      console.log('Document assignments:');
      assignments.forEach((count, user) => {
        console.log(`  ${user}: ${count} documents`);
      });
    } else {
      console.log('No documents assigned');
    }
  }

  await prisma.$disconnect();
}

checkDocumentAssignments().catch(console.error);
