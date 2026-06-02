import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanAllVirements() {
  console.log('🗑️ Starting complete cleanup of all virements...');
  
  try {
    // Delete in correct order to respect foreign key constraints
    
    console.log('1️⃣ Deleting VirementHistorique...');
    const histCount = await prisma.virementHistorique.deleteMany({});
    console.log(`   ✅ Deleted ${histCount.count} historique records`);
    
    console.log('2️⃣ Deleting VirementItem...');
    const itemCount = await prisma.virementItem.deleteMany({});
    console.log(`   ✅ Deleted ${itemCount.count} virement items`);
    
    console.log('3️⃣ Deleting OVDocument...');
    const docCount = await prisma.oVDocument.deleteMany({});
    console.log(`   ✅ Deleted ${docCount.count} OV documents`);
    
    console.log('4️⃣ Deleting SuiviVirement...');
    const suiviCount = await prisma.suiviVirement.deleteMany({});
    console.log(`   ✅ Deleted ${suiviCount.count} suivi virement records`);
    
    console.log('5️⃣ Deleting OrdreVirement...');
    const ovCount = await prisma.ordreVirement.deleteMany({});
    console.log(`   ✅ Deleted ${ovCount.count} ordre virement records`);
    
    console.log('6️⃣ Deleting Virement (legacy)...');
    const virCount = await prisma.virement.deleteMany({});
    console.log(`   ✅ Deleted ${virCount.count} legacy virement records`);
    
    console.log('7️⃣ Deleting WireTransfer...');
    const wireCount = await prisma.wireTransfer.deleteMany({});
    console.log(`   ✅ Deleted ${wireCount.count} wire transfer records`);
    
    console.log('8️⃣ Deleting WireTransferBatch...');
    const batchCount = await prisma.wireTransferBatch.deleteMany({});
    console.log(`   ✅ Deleted ${batchCount.count} wire transfer batch records`);
    
    console.log('9️⃣ Deleting WireTransferBatchHistory...');
    const batchHistCount = await prisma.wireTransferBatchHistory.deleteMany({});
    console.log(`   ✅ Deleted ${batchHistCount.count} batch history records`);
    
    console.log('\n✅ CLEANUP COMPLETE!');
    console.log('📊 Summary:');
    console.log(`   - VirementHistorique: ${histCount.count}`);
    console.log(`   - VirementItem: ${itemCount.count}`);
    console.log(`   - OVDocument: ${docCount.count}`);
    console.log(`   - SuiviVirement: ${suiviCount.count}`);
    console.log(`   - OrdreVirement: ${ovCount.count}`);
    console.log(`   - Virement (legacy): ${virCount.count}`);
    console.log(`   - WireTransfer: ${wireCount.count}`);
    console.log(`   - WireTransferBatch: ${batchCount.count}`);
    console.log(`   - WireTransferBatchHistory: ${batchHistCount.count}`);
    console.log(`\n🎯 Total records deleted: ${
      histCount.count + 
      itemCount.count + 
      docCount.count + 
      suiviCount.count + 
      ovCount.count + 
      virCount.count + 
      wireCount.count + 
      batchCount.count + 
      batchHistCount.count
    }`);
    
    console.log('\n🚀 You can now start fresh with OV-000001');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanAllVirements()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
