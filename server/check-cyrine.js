const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCyrine() {
  console.log('\n🔍 VÉRIFICATION CYRINE CHOUK\n');
  console.log('='.repeat(80));

  const cyrine = await prisma.user.findFirst({
    where: { fullName: { contains: 'CYRINE' } }
  });

  if (!cyrine) {
    console.log('❌ CYRINE CHOUK not found');
    return;
  }

  console.log(`\n👤 User: ${cyrine.fullName} (${cyrine.role})`);
  console.log(`   ID: ${cyrine.id}`);
  console.log(`   Email: ${cyrine.email}`);

  // Count documents via assignedToUserId
  const docsViaAssigned = await prisma.document.count({
    where: { assignedToUserId: cyrine.id }
  });

  // Count documents via uploadedById
  const docsViaUploader = await prisma.document.count({
    where: { uploadedById: cyrine.id }
  });

  // Check if there's a client relationship
  const clientsManaged = await prisma.client.count({
    where: {
      gestionnaires: {
        some: { id: cyrine.id }
      }
    }
  });

  // Count documents for managed clients
  let docsViaClients = 0;
  if (clientsManaged > 0) {
    const clients = await prisma.client.findMany({
      where: {
        gestionnaires: {
          some: { id: cyrine.id }
        }
      },
      include: {
        bordereaux: {
          include: {
            documents: true
          }
        }
      }
    });

    docsViaClients = clients.reduce((sum, client) => {
      return sum + client.bordereaux.reduce((bSum, b) => bSum + b.documents.length, 0);
    }, 0);
  }

  console.log(`\n📊 COMPTAGE:`);
  console.log(`   Documents (assignedToUserId): ${docsViaAssigned}`);
  console.log(`   Documents (uploadedById): ${docsViaUploader}`);
  console.log(`   Clients gérés: ${clientsManaged}`);
  console.log(`   Documents via clients: ${docsViaClients}`);

  console.log(`\n💡 CONCLUSION:`);
  if (docsViaAssigned === 0 && docsViaClients > 0) {
    console.log(`   ⚠️  CYRINE a ${docsViaClients} documents via ses clients`);
    console.log(`   → Le dashboard senior compte via la relation Client.gestionnaires`);
    console.log(`   → Le Super Admin compte via Document.assignedToUserId`);
    console.log(`   → Ce sont deux logiques différentes!`);
  } else if (docsViaAssigned > 0) {
    console.log(`   ✅ CYRINE a ${docsViaAssigned} documents assignés directement`);
  } else {
    console.log(`   ℹ️  CYRINE n'a aucun document assigné`);
  }

  await prisma.$disconnect();
}

checkCyrine().catch(console.error);
