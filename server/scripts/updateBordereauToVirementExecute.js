const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateBordereauStatus() {
  try {
    const reference = 'BDX-2025-00044';
    
    console.log(`🔄 Updating ${reference} to VIREMENT_EXECUTE...\n`);

    const updated = await prisma.bordereau.update({
      where: { reference },
      data: { statut: 'VIREMENT_EXECUTE' },
      include: {
        client: { select: { name: true } }
      }
    });

    console.log('✅ Updated successfully!');
    console.log(`   Reference: ${updated.reference}`);
    console.log(`   Client: ${updated.client?.name}`);
    console.log(`   New Status: ${updated.statut}`);
    console.log(`   BS: ${updated.nombreBS}`);
    console.log('\n✅ Now check the "Traités" box in Chef d\'Équipe interface!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateBordereauStatus();
