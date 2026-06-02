import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkOVClientNames() {
  console.log('🔍 Checking OV clientName fields...\n');
  
  try {
    const ordresVirement = await prisma.ordreVirement.findMany({
      where: {
        reference: {
          in: ['OV-2026-0001', 'OV-2026-0002']
        }
      },
      select: {
        reference: true,
        clientName: true,
        bordereauId: true
      }
    });
    
    console.log(`📊 Found ${ordresVirement.length} OVs:\n`);
    
    ordresVirement.forEach(ov => {
      console.log(`📋 ${ov.reference}:`);
      console.log(`   clientName field: ${ov.clientName || '❌ NULL'}`);
      console.log(`   bordereauId: ${ov.bordereauId || 'NULL (manual entry)'}`);
      console.log('');
    });
    
    console.log('✅ Check complete');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOVClientNames();
