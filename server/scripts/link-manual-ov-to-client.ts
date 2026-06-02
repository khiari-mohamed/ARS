import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function linkManualOVToClient() {
  console.log('🔗 Linking manual OV entries to clients...\n');
  
  try {
    // Find AFCAD client
    const afcadClient = await prisma.client.findUnique({
      where: { name: 'AFCAD' }
    });
    
    if (!afcadClient) {
      console.log('❌ AFCAD client not found');
      return;
    }
    
    console.log(`✅ Found AFCAD client: ${afcadClient.id}`);
    console.log(`   Mode Récupération: ${afcadClient.modeRecuperation || 'NULL'}\n`);
    
    // Update OV-2026-0001 to link to AFCAD
    const updatedOV = await prisma.ordreVirement.update({
      where: { reference: 'OV-2026-0001' },
      data: {
        clientId: afcadClient.id
      },
      include: {
        client: true,
        donneurOrdre: true
      }
    });
    
    console.log('✅ Updated OV-2026-0001:');
    console.log(`   Reference: ${updatedOV.reference}`);
    console.log(`   Client ID: ${updatedOV.clientId}`);
    console.log(`   Client Name: ${updatedOV.client?.name || 'NULL'}`);
    console.log(`   Mode Récupération: ${updatedOV.client?.modeRecuperation || 'NULL'}`);
    console.log(`   Donneur Ordre: ${updatedOV.donneurOrdre?.nom || 'NULL'}`);
    
    console.log('\n✅ Manual OV now linked to client! Refresh your dashboard to see Mode Récupération.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

linkManualOVToClient();
