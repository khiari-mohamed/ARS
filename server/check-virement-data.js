// Check what OV generation creates
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkVirementData() {
  try {
    console.log('🔍 Checking Virement data (created by OV generation)...');
    
    // Check Virement data
    const virementCount = await prisma.virement.count();
    console.log(`📊 Virement records: ${virementCount}`);
    
    if (virementCount > 0) {
      const virements = await prisma.virement.findMany({
        take: 5,
        include: {
          bordereau: {
            select: {
              reference: true,
              client: { select: { name: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      console.log('📋 Sample Virements:');
      virements.forEach(v => {
        console.log(`   - ID: ${v.id.slice(0, 8)}, Amount: ${v.montant}, Confirmed: ${v.confirmed}, Bordereau: ${v.bordereau?.reference}, Client: ${v.bordereau?.client?.name}`);
      });
    }
    
    // Check WireTransfer data
    const wireTransferCount = await prisma.wireTransfer.count();
    console.log(`📊 WireTransfer records: ${wireTransferCount}`);
    
    console.log('\n🔍 The issue:');
    console.log('   - OV generation creates Virement records (linked to Bordereau)');
    console.log('   - OV analytics looks at WireTransfer records (separate system)');
    console.log('   - These are two different OV systems in the database');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkVirementData();