import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSeniorDocuments() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 GESTIONNAIRE_SENIOR DOCUMENT ANALYSIS');
  console.log('='.repeat(80));

  const seniors = await prisma.user.findMany({
    where: {
      role: 'GESTIONNAIRE_SENIOR',
      active: true
    },
    include: {
      assignedDocuments: true // Get ALL documents, not filtered by status
    }
  });

  console.log(`\n📊 Found ${seniors.length} GESTIONNAIRE_SENIOR users\n`);

  for (const senior of seniors) {
    console.log(`\n${senior.fullName}:`);
    console.log(`├─ Total Documents Assigned: ${senior.assignedDocuments.length}`);
    
    if (senior.assignedDocuments.length > 0) {
      // Group by status
      const byStatus: Record<string, number> = {};
      senior.assignedDocuments.forEach(doc => {
        const status = doc.status || 'NULL';
        byStatus[status] = (byStatus[status] || 0) + 1;
      });

      console.log(`├─ By Status:`);
      Object.entries(byStatus).forEach(([status, count]) => {
        console.log(`│  ├─ ${status}: ${count}`);
      });

      // Check active statuses
      const activeDocs = senior.assignedDocuments.filter(doc => 
        ['EN_COURS', 'SCANNE', 'UPLOADED'].includes(doc.status || '')
      );
      console.log(`└─ Active (EN_COURS/SCANNE/UPLOADED): ${activeDocs.length}`);
    } else {
      console.log(`└─ No documents assigned via assignedToUserId`);
    }
  }

  // Check if they have documents via other relationships
  console.log('\n' + '='.repeat(80));
  console.log('🔍 CHECKING OTHER DOCUMENT RELATIONSHIPS');
  console.log('='.repeat(80) + '\n');

  for (const senior of seniors) {
    // Check documents via contracts
    const docsViaContracts = await prisma.document.count({
      where: {
        bordereau: {
          contract: {
            OR: [
              { assignedManagerId: senior.id },
              { teamLeaderId: senior.id }
            ]
          }
        }
      }
    });

    // Check documents via bordereau currentHandler
    const docsViaCurrentHandler = await prisma.document.count({
      where: {
        bordereau: {
          currentHandlerId: senior.id
        }
      }
    });

    if (docsViaContracts > 0 || docsViaCurrentHandler > 0) {
      console.log(`${senior.fullName}:`);
      console.log(`├─ Via Contracts: ${docsViaContracts}`);
      console.log(`└─ Via CurrentHandler: ${docsViaCurrentHandler}`);
    }
  }

  console.log('\n' + '='.repeat(80) + '\n');

  await prisma.$disconnect();
}

checkSeniorDocuments().catch(console.error);
