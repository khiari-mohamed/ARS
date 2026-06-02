import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkClientTestCompagnie() {
  console.log('🔍 Checking CLIENT TEST and its insurance company...\n');
  
  try {
    const client = await prisma.client.findUnique({
      where: { name: 'CLIENT TEST' },
      include: {
        compagnieAssurance: true
      }
    });
    
    if (!client) {
      console.log('❌ CLIENT TEST not found');
      return;
    }
    
    console.log('📋 CLIENT TEST:');
    console.log(`   ID: ${client.id}`);
    console.log(`   Name: ${client.name}`);
    console.log(`   Compagnie Assurance ID: ${client.compagnieAssuranceId || '❌ NULL'}`);
    console.log(`   Compagnie Assurance Name: ${client.compagnieAssurance?.nom || '❌ NULL'}`);
    console.log(`   Mode Récupération: ${client.modeRecuperation || '❌ NULL'}`);
    
    console.log('\n✅ Check complete');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkClientTestCompagnie();
