// Check specific client's modeRecuperation value
// Run: node check-client-mode.js "CTC"

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkClientMode() {
  const clientName = process.argv[2] || 'CTC';
  
  try {
    console.log(`🔍 Checking modeRecuperation for client: ${clientName}\n`);
    
    const client = await prisma.client.findFirst({
      where: {
        name: {
          contains: clientName,
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        name: true,
        modeRecuperation: true,
        updatedAt: true
      }
    });
    
    if (!client) {
      console.log(`❌ Client "${clientName}" not found`);
      process.exit(1);
    }
    
    console.log('📊 Client Information:');
    console.log('─'.repeat(60));
    console.log(`Name: ${client.name}`);
    console.log(`ID: ${client.id}`);
    console.log(`Mode de récupération: ${client.modeRecuperation || 'NULL'}`);
    console.log(`Last updated: ${client.updatedAt.toLocaleString('fr-FR')}`);
    console.log('─'.repeat(60));
    
    if (client.modeRecuperation === null) {
      console.log('\n⚠️  Mode de récupération is NULL');
      console.log('💡 You need to edit this client and set the mode');
    } else {
      console.log(`\n✅ Mode de récupération is set to: ${client.modeRecuperation}`);
      
      // Map to French label
      const labels = {
        'CHEQUE': 'Chèque',
        'VIREMENT': 'Virement',
        'FEUILLE_CAISSE': 'Feuille de caisse'
      };
      console.log(`📋 Will display as: ${labels[client.modeRecuperation] || client.modeRecuperation}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkClientMode();
