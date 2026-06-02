import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBordereauContract() {
  console.log('🔍 Checking bordereau contract link...\n');
  
  try {
    const bordereau = await prisma.bordereau.findUnique({
      where: { reference: 'TEST-AMANE-2026-0427-005' },
      include: {
        client: true,
        contract: true
      }
    });
    
    if (!bordereau) {
      console.log('❌ Bordereau not found');
      return;
    }
    
    console.log('📋 Bordereau: TEST-AMANE-2026-0427-005');
    console.log(`   Client: ${bordereau.client.name}`);
    console.log(`   Contract ID: ${bordereau.contractId || '❌ NULL'}`);
    
    if (bordereau.contract) {
      console.log(`   Contract Code Assuré: ${bordereau.contract.codeAssure || '❌ NULL'}`);
      console.log(`   Contract Client Name: ${bordereau.contract.clientName}`);
    } else {
      console.log('   ❌ No contract linked');
    }
    
    console.log('\n✅ Check complete');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBordereauContract();
