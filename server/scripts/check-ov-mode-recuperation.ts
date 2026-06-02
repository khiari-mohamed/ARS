import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkOVModeRecuperation() {
  console.log('🔍 Checking OV mode de récupération data...\n');
  
  try {
    const ordresVirement = await prisma.ordreVirement.findMany({
      where: {
        reference: {
          in: ['OV-2026-0001', 'OV-2026-0002']
        }
      },
      include: {
        bordereau: {
          include: {
            client: true,
            contract: true
          }
        },
        donneurOrdre: true
      }
    });
    
    console.log(`📊 Found ${ordresVirement.length} OVs:\n`);
    
    ordresVirement.forEach(ov => {
      console.log(`\n📋 ${ov.reference}:`);
      console.log(`   Bordereau ID: ${ov.bordereauId || 'NULL (manual entry)'}`);
      
      if (ov.bordereau) {
        console.log(`   Bordereau Ref: ${ov.bordereau.reference}`);
        console.log(`   Client: ${ov.bordereau.client.name}`);
        console.log(`   Client ID: ${ov.bordereau.client.id}`);
        console.log(`   Mode Récupération: ${ov.bordereau.client.modeRecuperation || '❌ NULL'}`);
        console.log(`   Contract Code: ${ov.bordereau.contract?.codeAssure || '❌ NULL'}`);
      } else {
        console.log(`   ⚠️ No bordereau (manual entry)`);
        console.log(`   Mode Récupération: ❌ Cannot retrieve (no client link)`);
      }
      
      console.log(`   Donneur Ordre: ${ov.donneurOrdre?.nom || '❌ NULL'}`);
      console.log(`   Montant: ${ov.montantTotal} TND`);
    });
    
    console.log('\n\n✅ Check complete');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOVModeRecuperation();
