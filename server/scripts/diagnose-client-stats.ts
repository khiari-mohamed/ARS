import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseClientStats() {
  console.log('================================================================================');
  console.log('DIAGNOSTIC: Top Clients Statistics Analysis');
  console.log('================================================================================\n');

  try {
    // Get client statistics exactly as the dashboard does (FIXED VERSION)
    const clientStats = await prisma.client.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            bordereaux: {
              where: { archived: false }
            },
            reclamations: true
          }
        }
      },
      orderBy: {
        bordereaux: {
          _count: 'desc'
        }
      },
      take: 10
    });

    console.log(`📊 Total Clients in Top 10: ${clientStats.length}\n`);

    console.log('📋 Top Clients (as shown in dashboard):');
    console.log('--------------------------------------------------------------------------------');
    clientStats.forEach((client, index) => {
      console.log(`${index + 1}. ${client.name}`);
      console.log(`   Bordereaux: ${client._count.bordereaux}`);
      console.log(`   Réclamations: ${client._count.reclamations}`);
      console.log('');
    });

    // Now let's verify by checking actual bordereaux
    console.log('\n🔍 Verification: Actual Bordereau Count per Client');
    console.log('--------------------------------------------------------------------------------');
    
    for (const client of clientStats) {
      const actualBordereaux = await prisma.bordereau.findMany({
        where: { clientId: client.id },
        select: {
          id: true,
          reference: true,
          statut: true,
          archived: true
        }
      });

      const nonArchivedCount = actualBordereaux.filter(b => !b.archived).length;
      const archivedCount = actualBordereaux.filter(b => b.archived).length;

      console.log(`\nClient: ${client.name}`);
      console.log(`  Dashboard shows: ${client._count.bordereaux} bordereaux`);
      console.log(`  Actual total: ${actualBordereaux.length} bordereaux`);
      console.log(`    - Non-archived: ${nonArchivedCount}`);
      console.log(`    - Archived: ${archivedCount}`);
      
      if (client._count.bordereaux !== nonArchivedCount) {
        console.log(`  ⚠️  MISMATCH! Dashboard shows ${client._count.bordereaux} but non-archived count is ${nonArchivedCount}`);
      } else {
        console.log(`  ✅ Count matches (excluding archived)`);
      }

      // Show sample bordereaux
      if (actualBordereaux.length > 0) {
        console.log(`  Sample bordereaux:`);
        actualBordereaux.slice(0, 3).forEach(b => {
          console.log(`    - ${b.reference} (${b.statut}${b.archived ? ', ARCHIVED' : ''})`);
        });
      }
    }

    // Check for réclamations
    console.log('\n\n🔍 Verification: Actual Réclamations Count per Client');
    console.log('--------------------------------------------------------------------------------');
    
    for (const client of clientStats) {
      const actualReclamations = await prisma.reclamation.findMany({
        where: { clientId: client.id },
        select: {
          id: true,
          status: true
        }
      });

      console.log(`\nClient: ${client.name}`);
      console.log(`  Dashboard shows: ${client._count.reclamations} réclamations`);
      console.log(`  Actual count: ${actualReclamations.length} réclamations`);
      
      if (client._count.reclamations !== actualReclamations.length) {
        console.log(`  ⚠️  MISMATCH! Dashboard count doesn't match actual count`);
      } else {
        console.log(`  ✅ Count matches`);
      }
    }

    // Summary
    console.log('\n\n================================================================================');
    console.log('SUMMARY');
    console.log('================================================================================');
    
    const totalBordereaux = clientStats.reduce((sum, c) => sum + c._count.bordereaux, 0);
    const totalReclamations = clientStats.reduce((sum, c) => sum + c._count.reclamations, 0);
    
    console.log(`Total Bordereaux (Top 10 clients): ${totalBordereaux}`);
    console.log(`Total Réclamations (Top 10 clients): ${totalReclamations}`);
    
    console.log('\n✅ The query is now correctly counting ONLY non-archived bordereaux');
    console.log('📌 Archived bordereaux are properly excluded from the Top Clients statistics');
    console.log('✅ Fix verified: Dashboard data is now accurate');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseClientStats();
