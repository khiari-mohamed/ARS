import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function linkManualOVToContract() {
  console.log('🔗 Linking manual OV to contract...\n');
  
  try {
    // Find AFCAD client's contract
    const afcadContract = await prisma.contract.findFirst({
      where: {
        client: {
          name: 'AFCAD'
        }
      },
      include: {
        client: true
      }
    });
    
    if (!afcadContract) {
      console.log('❌ No contract found for AFCAD');
      return;
    }
    
    console.log(`✅ Found AFCAD contract: ${afcadContract.id}`);
    console.log(`   Code Assuré: ${afcadContract.codeAssure || 'NULL'}`);
    console.log(`   Client: ${afcadContract.client.name}\n`);
    
    // Update OV-2026-0001 to link to contract
    const updatedOV = await prisma.ordreVirement.update({
      where: { reference: 'OV-2026-0001' },
      data: {
        contractId: afcadContract.id
      },
      include: {
        client: true,
        contract: true,
        donneurOrdre: true
      }
    });
    
    console.log('✅ Updated OV-2026-0001:');
    console.log(`   Reference: ${updatedOV.reference}`);
    console.log(`   Client: ${updatedOV.client?.name || 'NULL'}`);
    console.log(`   Contract ID: ${updatedOV.contractId}`);
    console.log(`   Contract Code Assuré: ${updatedOV.contract?.codeAssure || 'NULL'}`);
    console.log(`   Mode Récupération: ${updatedOV.client?.modeRecuperation || 'NULL'}`);
    
    console.log('\n✅ Manual OV now linked to contract! Refresh your dashboard.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

linkManualOVToContract();
