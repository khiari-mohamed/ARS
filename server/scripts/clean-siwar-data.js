require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanSiwarData() {
  console.log('🧹 Starting cleanup of Siwar Ayari data from LOCAL database...\n');

  try {
    const siwarId = '12eab8ad-a1dc-4008-81eb-fbff6b2f804b';
    const clientIds = ['343c32a7-7bf2-4a1f-a0f2-b5cd5712494c', '193af8db-e0b8-4e39-a676-dc95d68e6ee7'];
    const compagnieId = '162484a6-507e-458e-b4d9-2e6abea90e52';

    // 1. Delete Reclamations
    console.log('📍 Deleting reclamations...');
    const deletedReclamations = await prisma.reclamation.deleteMany({
      where: { clientId: { in: clientIds } }
    });
    console.log(`✅ Deleted ${deletedReclamations.count} reclamations`);

    // 2. Delete Documents
    console.log('📍 Deleting documents...');
    const deletedDocs = await prisma.document.deleteMany({
      where: {
        bordereau: {
          clientId: { in: clientIds }
        }
      }
    });
    console.log(`✅ Deleted ${deletedDocs.count} documents`);

    // 3. Delete Bordereaux
    console.log('📍 Deleting bordereaux...');
    const deletedBordereaux = await prisma.bordereau.deleteMany({
      where: { clientId: { in: clientIds } }
    });
    console.log(`✅ Deleted ${deletedBordereaux.count} bordereaux`);

    // 4. Delete Contract History
    console.log('📍 Deleting contract history...');
    const deletedHistory = await prisma.contractHistory.deleteMany({
      where: {
        contract: {
          clientId: { in: clientIds }
        }
      }
    });
    console.log(`✅ Deleted ${deletedHistory.count} contract history records`);

    // 5. Delete Contracts
    console.log('📍 Deleting contracts...');
    const deletedContracts = await prisma.contract.deleteMany({
      where: { clientId: { in: clientIds } }
    });
    console.log(`✅ Deleted ${deletedContracts.count} contracts`);

    // 6. Delete Clients
    console.log('📍 Deleting clients...');
    const deletedClients = await prisma.client.deleteMany({
      where: { id: { in: clientIds } }
    });
    console.log(`✅ Deleted ${deletedClients.count} clients`);

    // 7. Delete Compagnie Assurance
    console.log('📍 Deleting compagnie assurance...');
    const deletedCompagnie = await prisma.compagnieAssurance.deleteMany({
      where: { id: compagnieId }
    });
    console.log(`✅ Deleted ${deletedCompagnie.count} compagnie assurance`);

    // 8. Skip deleting Siwar User (has foreign key constraints, will be updated on import)
    console.log('📍 Skipping Siwar user deletion (will be updated on import)...');
    console.log(`✅ User will be updated on import`);

    console.log('\n🎉 ========== CLEANUP COMPLETE ==========');
    console.log('✅ All Siwar Ayari data has been removed from local database');
    console.log('✅ You can now import fresh data!\n');

  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanSiwarData()
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
