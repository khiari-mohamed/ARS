const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBordereaux() {
  try {
    const references = [
      'SPECNA BR 23-2025',
      'ALT SFAX ACTIFS BR 27-2025',
      'ALTS ACTIFS BR 29-2025',
      'MECAPROTEC BR 35-2025',
      'MECACHROME BR 15-2025'
    ];

    for (const ref of references) {
      console.log('\n========================================');
      console.log(`BORDEREAU: ${ref}`);
      console.log('========================================');
      
      const bordereau = await prisma.bordereau.findFirst({
        where: { reference: ref },
        include: {
          client: true,
          documents: {
            select: {
              id: true,
              name: true,
              type: true,
              status: true
            }
          },
          _count: {
            select: {
              documents: true
            }
          }
        }
      });

      if (!bordereau) {
        console.log('❌ Bordereau not found');
        continue;
      }

      console.log('\n📋 BORDEREAU INFO:');
      console.log('  Reference:', bordereau.reference);
      console.log('  Client:', bordereau.client?.name);
      console.log('  Bordereau Type:', bordereau.type);
      console.log('  nombreBS field:', bordereau.nombreBS);
      console.log('  Total Documents (_count):', bordereau._count.documents);
      console.log('  Documents array length:', bordereau.documents.length);

      // Count by type
      const typeCount = {};
      bordereau.documents.forEach(doc => {
        typeCount[doc.type] = (typeCount[doc.type] || 0) + 1;
      });

      console.log('\n📊 DOCUMENTS BY TYPE:');
      Object.entries(typeCount).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });

      console.log('\n📄 ALL DOCUMENTS:');
      bordereau.documents.forEach((doc, idx) => {
        console.log(`  ${idx + 1}. ${doc.name}`);
        console.log(`     Type: ${doc.type}`);
        console.log(`     Status: ${doc.status}`);
        console.log(`     ID: ${doc.id}`);
      });
    }

    console.log('\n========================================');
    console.log('DOCUMENT TYPE ENUM VALUES:');
    console.log('========================================');
    
    // Get all unique document types from database
    const allDocs = await prisma.document.findMany({
      select: { type: true },
      distinct: ['type']
    });
    
    console.log('Unique types in database:');
    allDocs.forEach(doc => {
      console.log(`  - ${doc.type}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBordereaux();
