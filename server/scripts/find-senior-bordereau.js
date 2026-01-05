const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findSeniorBordereau() {
  console.log('\n🔍 FINDING "senior" BORDEREAU\n');

  try {
    const bordereau = await prisma.bordereau.findFirst({
      where: { reference: 'senior' },
      include: {
        client: true,
        assignedToUser: true,
        documents: {
          include: {
            assignedTo: true
          }
        }
      }
    });

    if (!bordereau) {
      console.log('❌ Bordereau "senior" NOT FOUND');
      return;
    }

    console.log('✅ FOUND BORDEREAU:');
    console.log(`  Reference: ${bordereau.reference}`);
    console.log(`  Client: ${bordereau.client?.name}`);
    console.log(`  Status: ${bordereau.statut}`);
    console.log(`  Assigned To User ID: ${bordereau.assignedToUserId || 'NULL'}`);
    console.log(`  Assigned To: ${bordereau.assignedToUser?.fullName || 'NOT ASSIGNED'}`);
    console.log(`  Documents: ${bordereau.documents.length}`);

    console.log('\n📄 DOCUMENTS:');
    bordereau.documents.forEach((doc, i) => {
      console.log(`  ${i + 1}. ${doc.name}`);
      console.log(`     Type: ${doc.type}`);
      console.log(`     Status: ${doc.status || 'NULL'}`);
      console.log(`     Assigned To User ID: ${doc.assignedToUserId || 'NULL'}`);
      console.log(`     Assigned To: ${doc.assignedTo?.fullName || 'NOT ASSIGNED'}`);
    });

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findSeniorBordereau();
