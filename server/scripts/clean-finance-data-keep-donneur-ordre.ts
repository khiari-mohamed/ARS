import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanFinanceDataKeepDonneurOrdre() {
  console.log('🗑️  Starting finance cleanup (keeping DonneurOrdre records)...');

  try {
    // Delete in order to satisfy foreign key constraints
    console.log('1️⃣  Deleting VirementHistory records...');
    const deletedVirementHistory = await prisma.virementHistory.deleteMany({});
    console.log(`   ✅ Deleted ${deletedVirementHistory.count} VirementHistory records`);

    console.log('2️⃣  Deleting VirementHistorique records...');
    const deletedVirementHistorique = await prisma.virementHistorique.deleteMany({});
    console.log(`   ✅ Deleted ${deletedVirementHistorique.count} VirementHistorique records`);

    console.log('3️⃣  Deleting VirementItem records...');
    const deletedVirementItems = await prisma.virementItem.deleteMany({});
    console.log(`   ✅ Deleted ${deletedVirementItems.count} VirementItem records`);

    console.log('4️⃣  Deleting OVDocument records...');
    const deletedOvDocuments = await prisma.oVDocument.deleteMany({});
    console.log(`   ✅ Deleted ${deletedOvDocuments.count} OVDocument records`);

    console.log('5️⃣  Deleting SuiviVirement records...');
    const deletedSuiviVirements = await prisma.suiviVirement.deleteMany({});
    console.log(`   ✅ Deleted ${deletedSuiviVirements.count} SuiviVirement records`);

    console.log('6️⃣  Deleting SageTxtGeneration records...');
    const deletedSageTxt = await prisma.sageTxtGeneration.deleteMany({});
    console.log(`   ✅ Deleted ${deletedSageTxt.count} SageTxtGeneration records`);

    console.log('7️⃣  Deleting SageIntegration records...');
    const deletedSageIntegration = await prisma.sageIntegration.deleteMany({});
    console.log(`   ✅ Deleted ${deletedSageIntegration.count} SageIntegration records`);

    console.log('8️⃣  Deleting OrdreVirement records...');
    const deletedOrdreVirements = await prisma.ordreVirement.deleteMany({});
    console.log(`   ✅ Deleted ${deletedOrdreVirements.count} OrdreVirement records`);

    console.log('9️⃣  Deleting AdherentRibHistory records...');
    const deletedAdherentRibHistory = await prisma.adherentRibHistory.deleteMany({});
    console.log(`   ✅ Deleted ${deletedAdherentRibHistory.count} AdherentRibHistory records`);

    console.log('🔟  Deleting AdherentHistory records...');
    const deletedAdherentHistory = await prisma.adherentHistory.deleteMany({});
    console.log(`   ✅ Deleted ${deletedAdherentHistory.count} AdherentHistory records`);

    console.log('1️⃣1️⃣  Deleting Adherent records...');
    const deletedAdherents = await prisma.adherent.deleteMany({});
    console.log(`   ✅ Deleted ${deletedAdherents.count} Adherent records`);

    console.log('1️⃣2️⃣  Deleting legacy Virement records...');
    const deletedLegacyVirements = await prisma.virement.deleteMany({});
    console.log(`   ✅ Deleted ${deletedLegacyVirements.count} legacy Virement records`);

    console.log('\n✅ Finance cleanup complete. DonneurOrdre records were preserved.');
    console.log('📊 Summary:');
    console.log(`   - VirementHistory: ${deletedVirementHistory.count}`);
    console.log(`   - VirementHistorique: ${deletedVirementHistorique.count}`);
    console.log(`   - VirementItem: ${deletedVirementItems.count}`);
    console.log(`   - OVDocument: ${deletedOvDocuments.count}`);
    console.log(`   - SuiviVirement: ${deletedSuiviVirements.count}`);
    console.log(`   - SageTxtGeneration: ${deletedSageTxt.count}`);
    console.log(`   - SageIntegration: ${deletedSageIntegration.count}`);
    console.log(`   - OrdreVirement: ${deletedOrdreVirements.count}`);
    console.log(`   - AdherentRibHistory: ${deletedAdherentRibHistory.count}`);
    console.log(`   - AdherentHistory: ${deletedAdherentHistory.count}`);
    console.log(`   - Adherent: ${deletedAdherents.count}`);
    console.log(`   - Virement (legacy): ${deletedLegacyVirements.count}`);
  } catch (error) {
    console.error('❌ Error during finance cleanup:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

cleanFinanceDataKeepDonneurOrdre()
  .then(() => {
    console.log('\n🎉 Script finished.');
    process.exit();
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
