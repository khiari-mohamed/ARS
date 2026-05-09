const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSLADocuments() {
  try {
    // Get one bordereau with BulletinSoin
    const bordereau = await prisma.bordereau.findFirst({
      where: { reference: 'notffff' },
      include: {
        documents: true,
        BulletinSoin: true,
        _count: {
          select: {
            documents: true,
            BulletinSoin: true
          }
        }
      }
    });

    console.log('=== BORDEREAU DATA ===');
    console.log('Reference:', bordereau?.reference);
    console.log('Type:', bordereau?.type);
    console.log('nombreBS:', bordereau?.nombreBS);
    console.log('Document count (_count):', bordereau?._count?.documents);
    console.log('BulletinSoin count (_count):', bordereau?._count?.BulletinSoin);
    console.log('Documents array length:', bordereau?.documents?.length);
    console.log('BulletinSoin array length:', bordereau?.BulletinSoin?.length);
    console.log('\n=== DOCUMENTS ===');
    console.log(JSON.stringify(bordereau?.documents, null, 2));
    console.log('\n=== BULLETIN SOIN ===');
    console.log(JSON.stringify(bordereau?.BulletinSoin, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSLADocuments();
