// Debug Virement fields to see what data we actually have
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugVirementFields() {
  try {
    console.log('🔍 Debugging Virement fields...');
    
    const virements = await prisma.virement.findMany({
      include: {
        bordereau: {
          select: {
            reference: true,
            client: { select: { name: true } }
          }
        }
      }
    });
    
    console.log(`📊 Found ${virements.length} Virement records:`);
    
    virements.forEach((v, index) => {
      console.log(`\n--- Virement ${index + 1} ---`);
      console.log(`ID: ${v.id}`);
      console.log(`Montant: ${v.montant}`);
      console.log(`Confirmed: ${v.confirmed}`);
      console.log(`DateDepot: ${v.dateDepot}`);
      console.log(`DateExecution: ${v.dateExecution}`);
      console.log(`CreatedAt: ${v.createdAt}`);
      console.log(`UpdatedAt: ${v.updatedAt}`);
      console.log(`BordereauId: ${v.bordereauId}`);
      console.log(`Bordereau Reference: ${v.bordereau?.reference}`);
      console.log(`Client Name: ${v.bordereau?.client?.name}`);
      console.log(`ReferenceBancaire: ${v.referenceBancaire}`);
      console.log(`Priority: ${v.priority}`);
    });
    
    // Test the analytics query
    console.log('\n🧪 Testing analytics query...');
    const count = await prisma.virement.count();
    console.log(`Total count: ${count}`);
    
    const confirmedCount = await prisma.virement.count({
      where: { confirmed: true }
    });
    console.log(`Confirmed count: ${confirmedCount}`);
    
    const unconfirmedCount = await prisma.virement.count({
      where: { confirmed: false }
    });
    console.log(`Unconfirmed count: ${unconfirmedCount}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugVirementFields();