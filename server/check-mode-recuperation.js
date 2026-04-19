const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkModeRecuperation() {
  console.log('🔍 Checking Mode de Récupération for all clients...\n');
  console.log('='.repeat(80));

  try {
    const clients = await prisma.client.findMany({
      where: {
        status: { not: 'deleted' }
      },
      select: {
        id: true,
        name: true,
        modeRecuperation: true,
        status: true,
        compagnieAssurance: {
          select: {
            nom: true
          }
        },
        chargeCompte: {
          select: {
            fullName: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    const withMode = clients.filter(c => c.modeRecuperation);
    const withoutMode = clients.filter(c => !c.modeRecuperation);

    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total Clients: ${clients.length}`);
    console.log(`   ✅ With Mode de Récupération: ${withMode.length}`);
    console.log(`   ❌ Without Mode de Récupération: ${withoutMode.length}`);
    console.log('='.repeat(80));

    // Clients WITH Mode de Récupération
    if (withMode.length > 0) {
      console.log(`\n✅ CLIENTS WITH MODE DE RÉCUPÉRATION (${withMode.length}):\n`);
      console.log('┌─────┬──────────────────────────────────┬─────────────────────┬──────────────────────────┬────────────────────┐');
      console.log('│ No. │ Client Name                      │ Mode Récupération   │ Compagnie Assurance      │ Chef d\'Équipe      │');
      console.log('├─────┼──────────────────────────────────┼─────────────────────┼──────────────────────────┼────────────────────┤');
      
      withMode.forEach((client, index) => {
        const num = String(index + 1).padEnd(3);
        const name = client.name.substring(0, 32).padEnd(32);
        const mode = (client.modeRecuperation || '').padEnd(19);
        const compagnie = (client.compagnieAssurance?.nom || 'N/A').substring(0, 24).padEnd(24);
        const chef = (client.chargeCompte?.fullName || 'Non assigné').substring(0, 18).padEnd(18);
        
        console.log(`│ ${num} │ ${name} │ ${mode} │ ${compagnie} │ ${chef} │`);
      });
      
      console.log('└─────┴──────────────────────────────────┴─────────────────────┴──────────────────────────┴────────────────────┘');
    }

    // Clients WITHOUT Mode de Récupération
    if (withoutMode.length > 0) {
      console.log(`\n❌ CLIENTS WITHOUT MODE DE RÉCUPÉRATION (${withoutMode.length}):\n`);
      console.log('┌─────┬──────────────────────────────────┬──────────────────────────┬────────────────────┬──────────────────────────────────────┐');
      console.log('│ No. │ Client Name                      │ Compagnie Assurance      │ Chef d\'Équipe      │ Client ID                            │');
      console.log('├─────┼──────────────────────────────────┼──────────────────────────┼────────────────────┼──────────────────────────────────────┤');
      
      withoutMode.forEach((client, index) => {
        const num = String(index + 1).padEnd(3);
        const name = client.name.substring(0, 32).padEnd(32);
        const compagnie = (client.compagnieAssurance?.nom || 'N/A').substring(0, 24).padEnd(24);
        const chef = (client.chargeCompte?.fullName || 'Non assigné').substring(0, 18).padEnd(18);
        const id = client.id.padEnd(36);
        
        console.log(`│ ${num} │ ${name} │ ${compagnie} │ ${chef} │ ${id} │`);
      });
      
      console.log('└─────┴──────────────────────────────────┴──────────────────────────┴────────────────────┴──────────────────────────────────────┘');
    }

    // Mode de Récupération breakdown
    console.log('\n📈 MODE DE RÉCUPÉRATION BREAKDOWN:\n');
    const modeStats = {
      VIREMENT: withMode.filter(c => c.modeRecuperation === 'VIREMENT').length,
      CHEQUE: withMode.filter(c => c.modeRecuperation === 'CHEQUE').length,
      FEUILLE_CAISSE: withMode.filter(c => c.modeRecuperation === 'FEUILLE_CAISSE').length,
      NULL: withoutMode.length
    };

    console.log(`   🏦 VIREMENT:        ${modeStats.VIREMENT} clients`);
    console.log(`   💳 CHEQUE:          ${modeStats.CHEQUE} clients`);
    console.log(`   📋 FEUILLE_CAISSE:  ${modeStats.FEUILLE_CAISSE} clients`);
    console.log(`   ❌ NULL/EMPTY:      ${modeStats.NULL} clients`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ Check complete!\n');

    // Action items
    if (withoutMode.length > 0) {
      console.log('⚠️  ACTION REQUIRED:');
      console.log(`   ${withoutMode.length} client(s) need Mode de Récupération to be set.`);
      console.log('   Please update them from the UI to test the fix.\n');
    } else {
      console.log('✅ All clients have Mode de Récupération set!\n');
    }

  } catch (error) {
    console.error('❌ Error checking mode de récupération:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkModeRecuperation();
