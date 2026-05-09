// Delete OV by reference
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteOVByReference() {
  try {
    console.log(`🔍 Looking for OVs linked to bordereau: BTK BR 2026721437`);
    
    const ovs = await prisma.ordreVirement.findMany({
      where: {
        bordereau: {
          reference: 'BTK BR 2026721437'
        }
      }
    });
    
    if (ovs.length === 0) {
      console.log('❌ No OVs found for this bordereau');
      return;
    }
    
    console.log(`🗑️ Found ${ovs.length} OV(s) to delete:`);
    ovs.forEach(ov => console.log(`   - ${ov.reference} (${ov.id})`));
    
    for (const ov of ovs) {
      console.log(`\nDeleting ${ov.reference}...`);
      
      await prisma.$transaction([
        prisma.virementHistorique.deleteMany({ where: { ordreVirementId: ov.id } }),
        prisma.virementItem.deleteMany({ where: { ordreVirementId: ov.id } }),
        prisma.oVDocument.deleteMany({ where: { ordreVirementId: ov.id } }),
        prisma.suiviVirement.deleteMany({ where: { ordreVirementId: ov.id } }),
        prisma.ordreVirement.delete({ where: { id: ov.id } })
      ]);
      
      console.log(`✅ Deleted ${ov.reference}`);
    }
    
    // Reset bordereau
    await prisma.bordereau.update({
      where: { reference: 'BTK BR 2026721437' },
      data: { statut: 'TRAITE' }
    });
    console.log('\n✅ Bordereau reset to TRAITE');
    
    console.log('\n🎉 Ready for fresh test!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

deleteOVByReference();
