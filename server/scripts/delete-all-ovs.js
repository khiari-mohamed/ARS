const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteAllOVs() {
  console.log('🗑️ Deleting all Ordre de Virements and related data...');
  
  try {
    // Delete in correct order to avoid FK constraints
    
    // 1. Delete OVDocuments
    const deletedDocs = await prisma.oVDocument.deleteMany({});
    console.log(`✅ Deleted ${deletedDocs.count} OVDocuments`);
    
    // 2. Delete VirementItems
    const deletedItems = await prisma.virementItem.deleteMany({});
    console.log(`✅ Deleted ${deletedItems.count} VirementItems`);
    
    // 3. Delete Virements (if exists)
    try {
      const deletedVirements = await prisma.virement.deleteMany({});
      console.log(`✅ Deleted ${deletedVirements.count} Virements`);
    } catch (e) {
      console.log('⚠️ No Virements table or already empty');
    }
    
    // 4. Finally delete OrdreVirements
    const deletedOVs = await prisma.ordreVirement.deleteMany({});
    console.log(`✅ Deleted ${deletedOVs.count} OrdreVirements`);
    
    console.log('\n✅ All OVs deleted! You can now create a new OV with updated adherent data.');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllOVs();
