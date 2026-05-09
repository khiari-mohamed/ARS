// Delete test OV for BTK bordereau
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteOV() {
  try {
    // Find OV for BTK bordereau
    const ov = await prisma.ordreVirement.findFirst({
      where: {
        bordereau: {
          reference: 'BTK BR 2026721437'
        }
      }
    });
    
    if (!ov) {
      console.log('❌ No OV found for BTK bordereau');
      return;
    }
    
    console.log(`🗑️ Deleting OV: ${ov.reference}`);
    console.log(`   ID: ${ov.id}`);
    
    // Delete VirementHistorique first
    await prisma.virementHistorique.deleteMany({
      where: { ordreVirementId: ov.id }
    });
    console.log('✅ Deleted virement historique');
    
    // Delete VirementItem
    await prisma.virementItem.deleteMany({
      where: { ordreVirementId: ov.id }
    });
    console.log('✅ Deleted virement items');
    
    // Delete OV documents
    await prisma.oVDocument.deleteMany({
      where: { ordreVirementId: ov.id }
    });
    console.log('✅ Deleted OV documents');
    
    // Delete suivi virements
    await prisma.suiviVirement.deleteMany({
      where: { ordreVirementId: ov.id }
    });
    console.log('✅ Deleted suivi virements');
    
    // Use raw SQL to delete with CASCADE
    await prisma.$executeRaw`DELETE FROM "OrdreVirement" WHERE id = ${ov.id}`;
    console.log('✅ Deleted OV (with cascade)');
    
    // Reset bordereau status to TRAITE
    await prisma.bordereau.update({
      where: { reference: 'BTK BR 2026721437' },
      data: { statut: 'TRAITE' }
    });
    console.log('✅ Reset bordereau status to TRAITE');
    
    console.log('\n🎉 Ready for fresh Excel import!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteOV();
