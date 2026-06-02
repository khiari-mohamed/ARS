import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateClientModeRecuperation() {
  console.log('🔄 Updating Client modeRecuperation field...');
  
  try {
    // Get all clients
    const clients = await prisma.client.findMany({
      select: {
        id: true,
        name: true,
        modeRecuperation: true
      }
    });
    
    console.log(`📊 Found ${clients.length} clients`);
    
    // Update clients with NULL modeRecuperation
    const clientsToUpdate = clients.filter(c => !c.modeRecuperation);
    
    console.log(`🔧 Updating ${clientsToUpdate.length} clients with default mode de récupération...`);
    
    for (const client of clientsToUpdate) {
      await prisma.client.update({
        where: { id: client.id },
        data: {
          modeRecuperation: 'VIREMENT' // Default value: VIREMENT, CHEQUE, ESPECES, etc.
        }
      });
      console.log(`✅ Updated ${client.name} → VIREMENT`);
    }
    
    console.log('\n✅ Update complete!');
    console.log(`📊 Summary:`);
    console.log(`   Total clients: ${clients.length}`);
    console.log(`   Updated: ${clientsToUpdate.length}`);
    console.log(`   Already had value: ${clients.length - clientsToUpdate.length}`);
    
  } catch (error) {
    console.error('❌ Error updating clients:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateClientModeRecuperation()
  .then(() => {
    console.log('\n🎉 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
