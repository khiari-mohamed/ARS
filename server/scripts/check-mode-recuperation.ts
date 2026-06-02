import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkModeRecuperation() {
  console.log('🔍 Checking Client modeRecuperation field...\n');
  
  try {
    // Get all clients with their modeRecuperation
    const clients = await prisma.client.findMany({
      select: {
        id: true,
        name: true,
        modeRecuperation: true
      },
      orderBy: { name: 'asc' }
    });
    
    console.log(`📊 Found ${clients.length} clients:\n`);
    
    clients.forEach((client, index) => {
      const modeDisplay = client.modeRecuperation || '❌ NULL';
      console.log(`${index + 1}. ${client.name}`);
      console.log(`   ID: ${client.id.substring(0, 8)}`);
      console.log(`   Mode de récupération: ${modeDisplay}\n`);
    });
    
    const withMode = clients.filter(c => c.modeRecuperation);
    const withoutMode = clients.filter(c => !c.modeRecuperation);
    
    console.log('\n📈 Summary:');
    console.log(`   ✅ With modeRecuperation: ${withMode.length}`);
    console.log(`   ❌ Without modeRecuperation (NULL): ${withoutMode.length}`);
    
    if (withoutMode.length > 0) {
      console.log('\n⚠️ Clients without modeRecuperation:');
      withoutMode.forEach(c => console.log(`   - ${c.name}`));
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkModeRecuperation()
  .then(() => {
    console.log('\n✅ Check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Check failed:', error);
    process.exit(1);
  });
