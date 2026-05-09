const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Unified SLA calculation logic
function calculateSLAStatus(dateReception, delaiReglement) {
  if (!dateReception || !delaiReglement) {
    return { status: 'UNKNOWN', percentage: 0, daysElapsed: 0 };
  }

  const now = new Date();
  const receptionDate = new Date(dateReception);
  const daysElapsed = (now - receptionDate) / (1000 * 60 * 60 * 24);
  const percentageElapsed = (daysElapsed / delaiReglement) * 100;

  let status;
  if (percentageElapsed > 100) {
    status = 'OVERDUE'; // 🔴 En retard
  } else if (percentageElapsed > 80) {
    status = 'AT_RISK'; // 🟠 À risque
  } else {
    status = 'ON_TIME'; // 🟢 À temps
  }

  return {
    status,
    percentage: percentageElapsed.toFixed(1),
    daysElapsed: daysElapsed.toFixed(1),
    delaiReglement
  };
}

async function inspectDatabase() {
  console.log('\n🔍 INSPECTION DE LA BASE DE DONNÉES - STATUT SLA\n');
  console.log('='.repeat(80));

  try {
    // 1. Analyse des Bordereaux
    console.log('\n📋 ANALYSE DES BORDEREAUX:\n');
    
    const bordereaux = await prisma.bordereau.findMany({
      include: {
        contract: true,
        client: true
      },
      orderBy: {
        dateReception: 'desc'
      }
    });

    const bordereauStats = {
      ON_TIME: [],
      AT_RISK: [],
      OVERDUE: [],
      UNKNOWN: []
    };

    bordereaux.forEach(b => {
      const delai = b.contract?.delaiReglement || b.delaiReglement || 0;
      const sla = calculateSLAStatus(b.dateReception, delai);
      bordereauStats[sla.status].push({
        reference: b.reference,
        client: b.client?.name || 'N/A',
        dateReception: b.dateReception?.toISOString().split('T')[0],
        delai: delai,
        daysElapsed: sla.daysElapsed,
        percentage: sla.percentage,
        status: b.status
      });
    });

    console.log(`Total Bordereaux: ${bordereaux.length}`);
    console.log(`🟢 À temps (ON_TIME): ${bordereauStats.ON_TIME.length}`);
    console.log(`🟠 À risque (AT_RISK): ${bordereauStats.AT_RISK.length}`);
    console.log(`🔴 En retard (OVERDUE): ${bordereauStats.OVERDUE.length}`);
    console.log(`⚪ Inconnu (UNKNOWN): ${bordereauStats.UNKNOWN.length}`);

    // Afficher quelques exemples de chaque catégorie
    console.log('\n📊 EXEMPLES PAR CATÉGORIE:\n');
    
    ['ON_TIME', 'AT_RISK', 'OVERDUE'].forEach(status => {
      const items = bordereauStats[status].slice(0, 5);
      if (items.length > 0) {
        console.log(`\n${status === 'ON_TIME' ? '🟢' : status === 'AT_RISK' ? '🟠' : '🔴'} ${status} (${bordereauStats[status].length} total):`);
        items.forEach(item => {
          console.log(`  - ${item.reference} | Client: ${item.client} | Reçu: ${item.dateReception} | Délai: ${item.delai}j | Écoulé: ${item.daysElapsed}j (${item.percentage}%) | Statut: ${item.status}`);
        });
      }
    });

    // 2. Analyse des Documents
    console.log('\n\n📄 ANALYSE DES DOCUMENTS:\n');
    
    const documents = await prisma.document.findMany({
      include: {
        bordereau: {
          include: {
            contract: true,
            client: true
          }
        }
      },
      orderBy: {
        uploadedAt: 'desc'
      }
    });

    const documentStats = {
      ON_TIME: [],
      AT_RISK: [],
      OVERDUE: [],
      UNKNOWN: []
    };

    documents.forEach(doc => {
      if (!doc.bordereau) {
        documentStats.UNKNOWN.push({
          filename: doc.filename,
          reason: 'Pas de bordereau associé'
        });
        return;
      }

      const delai = doc.bordereau.contract?.delaiReglement || doc.bordereau.delaiReglement || 0;
      const dateReception = doc.bordereau.dateReception;
      const sla = calculateSLAStatus(dateReception, delai);
      
      documentStats[sla.status].push({
        filename: doc.filename,
        bordereau: doc.bordereau.reference,
        client: doc.bordereau.client?.name || 'N/A',
        dateReception: dateReception?.toISOString().split('T')[0],
        delai: delai,
        daysElapsed: sla.daysElapsed,
        percentage: sla.percentage,
        status: doc.status
      });
    });

    console.log(`Total Documents: ${documents.length}`);
    console.log(`🟢 À temps (ON_TIME): ${documentStats.ON_TIME.length}`);
    console.log(`🟠 À risque (AT_RISK): ${documentStats.AT_RISK.length}`);
    console.log(`🔴 En retard (OVERDUE): ${documentStats.OVERDUE.length}`);
    console.log(`⚪ Inconnu (UNKNOWN): ${documentStats.UNKNOWN.length}`);

    // Afficher quelques exemples de chaque catégorie
    console.log('\n📊 EXEMPLES PAR CATÉGORIE:\n');
    
    ['ON_TIME', 'AT_RISK', 'OVERDUE'].forEach(status => {
      const items = documentStats[status].slice(0, 5);
      if (items.length > 0) {
        console.log(`\n${status === 'ON_TIME' ? '🟢' : status === 'AT_RISK' ? '🟠' : '🔴'} ${status} (${documentStats[status].length} total):`);
        items.forEach(item => {
          console.log(`  - ${item.filename} | Bordereau: ${item.bordereau} | Client: ${item.client} | Reçu: ${item.dateReception} | Délai: ${item.delai}j | Écoulé: ${item.daysElapsed}j (${item.percentage}%) | Statut: ${item.status}`);
        });
      }
    });

    // 3. Résumé final
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 RÉSUMÉ FINAL:\n');
    
    console.log('BORDEREAUX:');
    console.log(`  🟢 À temps: ${bordereauStats.ON_TIME.length} (${((bordereauStats.ON_TIME.length / bordereaux.length) * 100).toFixed(1)}%)`);
    console.log(`  🟠 À risque: ${bordereauStats.AT_RISK.length} (${((bordereauStats.AT_RISK.length / bordereaux.length) * 100).toFixed(1)}%)`);
    console.log(`  🔴 En retard: ${bordereauStats.OVERDUE.length} (${((bordereauStats.OVERDUE.length / bordereaux.length) * 100).toFixed(1)}%)`);
    
    console.log('\nDOCUMENTS:');
    console.log(`  🟢 À temps: ${documentStats.ON_TIME.length} (${((documentStats.ON_TIME.length / documents.length) * 100).toFixed(1)}%)`);
    console.log(`  🟠 À risque: ${documentStats.AT_RISK.length} (${((documentStats.AT_RISK.length / documents.length) * 100).toFixed(1)}%)`);
    console.log(`  🔴 En retard: ${documentStats.OVERDUE.length} (${((documentStats.OVERDUE.length / documents.length) * 100).toFixed(1)}%)`);

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Inspection terminée!\n');

  } catch (error) {
    console.error('❌ Erreur lors de l\'inspection:', error);
  } finally {
    await prisma.$disconnect();
  }
}

inspectDatabase();
