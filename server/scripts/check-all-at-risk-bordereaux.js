const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllAtRiskBordereaux() {
  try {
    const now = new Date();
    
    console.log('========================================');
    console.log('CHECKING ALL AT-RISK BORDEREAUX');
    console.log('========================================\n');
    
    // Get all bordereaux
    const bordereaux = await prisma.bordereau.findMany({
      where: {
        archived: false,
      },
      include: {
        contract: true,
        client: true,
        documents: {
          select: {
            type: true
          }
        },
        _count: {
          select: {
            documents: true
          }
        }
      }
    });

    console.log(`Total bordereaux in database: ${bordereaux.length}\n`);

    // Filter at-risk bordereaux (SLA > 80%)
    const atRiskBordereaux = [];
    
    for (const bordereau of bordereaux) {
      const slaThreshold = bordereau.delaiReglement || bordereau.contract?.delaiReglement || bordereau.client?.reglementDelay || 30;
      const validDate = bordereau.dateReception || bordereau.createdAt;
      const daysElapsed = validDate
        ? Math.floor((now.getTime() - new Date(validDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      
      const percentElapsed = (daysElapsed / slaThreshold) * 100;
      
      // At risk if > 80%
      if (percentElapsed > 80) {
        // Count documents by type
        const documentsByType = {};
        bordereau.documents.forEach(doc => {
          documentsByType[doc.type] = (documentsByType[doc.type] || 0) + 1;
        });
        
        atRiskBordereaux.push({
          reference: bordereau.reference,
          client: bordereau.client?.name,
          slaThreshold,
          daysElapsed,
          percentElapsed: Math.round(percentElapsed),
          totalDocuments: bordereau._count.documents,
          documentsByType,
          alertLevel: percentElapsed > 100 ? 'critical' : 'warning'
        });
      }
    }

    console.log(`\n📊 AT-RISK BORDEREAUX SUMMARY:`);
    console.log(`Total at-risk: ${atRiskBordereaux.length}`);
    console.log(`Critical (>100%): ${atRiskBordereaux.filter(b => b.alertLevel === 'critical').length}`);
    console.log(`Warning (80-100%): ${atRiskBordereaux.filter(b => b.alertLevel === 'warning').length}`);

    // Collect all unique document types across all at-risk bordereaux
    const allDocumentTypes = new Set();
    const documentTypeStats = {};
    
    atRiskBordereaux.forEach(bordereau => {
      Object.keys(bordereau.documentsByType).forEach(type => {
        allDocumentTypes.add(type);
        documentTypeStats[type] = (documentTypeStats[type] || 0) + bordereau.documentsByType[type];
      });
    });

    console.log(`\n📋 UNIQUE DOCUMENT TYPES IN AT-RISK BORDEREAUX:`);
    console.log(`Total unique types: ${allDocumentTypes.size}`);
    Array.from(allDocumentTypes).sort().forEach(type => {
      console.log(`  - ${type}: ${documentTypeStats[type]} documents across all at-risk bordereaux`);
    });

    // Show distribution of document types per bordereau
    console.log(`\n📈 DOCUMENT TYPE DISTRIBUTION:`);
    const typeDistribution = {
      'Single type': 0,
      'Multiple types': 0
    };
    
    atRiskBordereaux.forEach(bordereau => {
      const typeCount = Object.keys(bordereau.documentsByType).length;
      if (typeCount === 1) {
        typeDistribution['Single type']++;
      } else if (typeCount > 1) {
        typeDistribution['Multiple types']++;
      }
    });
    
    console.log(`  Bordereaux with single document type: ${typeDistribution['Single type']}`);
    console.log(`  Bordereaux with multiple document types: ${typeDistribution['Multiple types']}`);

    // Show examples of bordereaux with multiple types
    console.log(`\n📄 EXAMPLES OF BORDEREAUX WITH MULTIPLE DOCUMENT TYPES:`);
    const multiTypeExamples = atRiskBordereaux
      .filter(b => Object.keys(b.documentsByType).length > 1)
      .slice(0, 10);
    
    multiTypeExamples.forEach((bordereau, idx) => {
      console.log(`\n${idx + 1}. ${bordereau.reference} (${bordereau.client})`);
      console.log(`   Total documents: ${bordereau.totalDocuments}`);
      console.log(`   SLA: ${bordereau.percentElapsed}% (${bordereau.daysElapsed}/${bordereau.slaThreshold} days)`);
      console.log(`   Document types:`);
      Object.entries(bordereau.documentsByType).forEach(([type, count]) => {
        console.log(`     - ${type}: ${count}`);
      });
    });

    // Show bordereaux with no documents
    console.log(`\n⚠️  BORDEREAUX WITH NO DOCUMENTS:`);
    const noDocsBordereaux = atRiskBordereaux.filter(b => b.totalDocuments === 0);
    console.log(`  Count: ${noDocsBordereaux.length}`);
    if (noDocsBordereaux.length > 0) {
      noDocsBordereaux.slice(0, 5).forEach(b => {
        console.log(`    - ${b.reference} (${b.client})`);
      });
      if (noDocsBordereaux.length > 5) {
        console.log(`    ... and ${noDocsBordereaux.length - 5} more`);
      }
    }

    // Final verification
    console.log(`\n✅ VERIFICATION:`);
    console.log(`Expected count in UI: ${atRiskBordereaux.length}`);
    console.log(`Document types that should appear in UI:`);
    Array.from(allDocumentTypes).sort().forEach(type => {
      console.log(`  ✓ ${type}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllAtRiskBordereaux();
