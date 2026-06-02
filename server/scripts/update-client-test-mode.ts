import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateClientTestMode() {
  console.log('🔧 Updating CLIENT TEST mode de récupération...\n');
  
  try {
    const client = await prisma.client.update({
      where: {
        name: 'CLIENT TEST'
      },
      data: {
        modeRecuperation: 'VIREMENT' // Set default value
      }
    });
    
    console.log('✅ CLIENT TEST updated:');
    console.log(`   ID: ${client.id}`);
    console.log(`   Name: ${client.name}`);
    console.log(`   Mode Récupération: ${client.modeRecuperation}`);
    
    console.log('\n✅ Update complete! Refresh your dashboard to see the change.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateClientTestMode();
