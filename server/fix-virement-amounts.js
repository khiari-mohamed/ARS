const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixVirementAmounts() {
  console.log('🔧 Fixing VirementItem amounts (divide by 10)...\n');
  
  try {
    const items = await prisma.virementItem.findMany({
      include: { adherent: true }
    });
    
    console.log(`Found ${items.length} VirementItems\n`);
    
    let fixed = 0;
    
    for (const item of items) {
      const oldAmount = item.montant;
      const newAmount = oldAmount / 10;
      
      await prisma.virementItem.update({
        where: { id: item.id },
        data: { montant: newAmount }
      });
      
      console.log(`✅ ${item.adherent?.matricule || 'Unknown'}: ${oldAmount} → ${newAmount} TND`);
      fixed++;
    }
    
    console.log(`\n📊 Fixed ${fixed} amounts`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixVirementAmounts();
