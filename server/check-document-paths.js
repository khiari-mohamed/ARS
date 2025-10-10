const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDocumentPaths() {
  console.log('🔍 Checking document paths in database...\n');
  
  const documents = await prisma.document.findMany({
    where: {
      OR: [
        { name: { contains: 'BS-5766762' } },
        { name: { contains: 'br6' } },
        { name: { contains: 'rapport_financier' } }
      ]
    },
    include: {
      bordereau: {
        select: {
          reference: true
        }
      }
    }
  });
  
  console.log(`📊 Found ${documents.length} documents:\n`);
  
  documents.forEach(doc => {
    console.log(`📄 Document: ${doc.name}`);
    console.log(`   ID: ${doc.id}`);
    console.log(`   Path: ${doc.path}`);
    console.log(`   Bordereau: ${doc.bordereau?.reference || 'N/A'}`);
    console.log(`   Type: ${doc.type}`);
    console.log(`   Status: ${doc.status}`);
    console.log('');
  });
  
  await prisma.$disconnect();
}

checkDocumentPaths().catch(console.error);
