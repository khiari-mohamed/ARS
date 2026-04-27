const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGestionnaireSeniorData() {
  try {
    console.log('\n🔍 ========================================');
    console.log('📊 ANALYSE DES DONNÉES GESTIONNAIRE SENIOR');
    console.log('========================================\n');

    // Find Cyrine Choo (current gestionnaire senior)
    const gestionnaireSenior = await prisma.user.findFirst({
      where: {
        fullName: {
          contains: 'Cyrine',
          mode: 'insensitive'
        },
        role: 'GESTIONNAIRE_SENIOR'
      }
    });

    if (!gestionnaireSenior) {
      console.log('❌ Aucun gestionnaire senior trouvé avec le nom "Cyrine"');
      return;
    }

    console.log('👤 GESTIONNAIRE SENIOR TROUVÉ:');
    console.log(`   Nom: ${gestionnaireSenior.fullName}`);
    console.log(`   Email: ${gestionnaireSenior.email}`);
    console.log(`   ID: ${gestionnaireSenior.id}`);
    console.log(`   Rôle: ${gestionnaireSenior.role}\n`);

    // Find all contracts assigned to this gestionnaire senior
    const contracts = await prisma.contract.findMany({
      where: {
        teamLeaderId: gestionnaireSenior.id
      },
      include: {
        client: true
      }
    });

    console.log(`📋 CONTRATS ASSIGNÉS: ${contracts.length} contrat(s)\n`);

    if (contracts.length === 0) {
      console.log('⚠️  Aucun contrat assigné à ce gestionnaire senior');
      return;
    }

    contracts.forEach((contract, index) => {
      console.log(`   ${index + 1}. ${contract.contractNumber} - ${contract.client?.name || 'N/A'}`);
    });
    console.log('');

    // Get all bordereaux for these contracts
    const bordereaux = await prisma.bordereau.findMany({
      where: {
        contractId: {
          in: contracts.map(c => c.id)
        }
      },
      include: {
        contract: {
          include: {
            client: true
          }
        },
        documents: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📦 BORDEREAUX TOTAUX: ${bordereaux.length} bordereau(x)\n`);

    if (bordereaux.length === 0) {
      console.log('⚠️  Aucun bordereau trouvé pour ces contrats');
      return;
    }

    // Count documents by type
    const documentsByType = {};
    let totalDocuments = 0;

    bordereaux.forEach(bordereau => {
      bordereau.documents.forEach(doc => {
        const typeName = doc.type || 'Type inconnu';
        if (!documentsByType[typeName]) {
          documentsByType[typeName] = 0;
        }
        documentsByType[typeName]++;
        totalDocuments++;
      });
    });

    console.log('📄 RÉSUMÉ DES DOCUMENTS PAR TYPE:');
    console.log(`   Total documents: ${totalDocuments}\n`);
    Object.entries(documentsByType).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
      console.log(`   • ${type}: ${count} document(s)`);
    });
    console.log('\n');

    // Detailed breakdown by bordereau
    console.log('📋 DÉTAIL PAR BORDEREAU:\n');
    console.log('='.repeat(80));

    bordereaux.forEach((bordereau, index) => {
      console.log(`\n${index + 1}. BORDEREAU: ${bordereau.reference}`);
      console.log(`   Client: ${bordereau.contract?.client?.name || 'N/A'}`);
      console.log(`   Contrat: ${bordereau.contract?.contractNumber || 'N/A'}`);
      console.log(`   Statut: ${bordereau.status}`);
      console.log(`   Date création: ${bordereau.createdAt.toLocaleDateString('fr-FR')}`);
      console.log(`   Nombre de documents: ${bordereau.documents.length}`);
      
      if (bordereau.documents.length > 0) {
        console.log(`\n   📄 Documents dans ce bordereau:`);
        
        // Group documents by type
        const docsByType = {};
        bordereau.documents.forEach(doc => {
          const typeName = doc.type || 'Type inconnu';
          if (!docsByType[typeName]) {
            docsByType[typeName] = [];
          }
          docsByType[typeName].push(doc);
        });

        Object.entries(docsByType).forEach(([type, docs]) => {
          console.log(`\n      ${type} (${docs.length}):`);
          docs.forEach((doc, docIndex) => {
            console.log(`         ${docIndex + 1}. ${doc.name || 'Sans nom'}`);
            console.log(`            - ID: ${doc.id}`);
            console.log(`            - Statut: ${doc.status}`);
            console.log(`            - Référence: ${doc.reference || 'N/A'}`);
          });
        });
      }
      console.log('\n' + '-'.repeat(80));
    });

    console.log('\n');
    console.log('✅ ANALYSE TERMINÉE\n');

    // Summary table
    console.log('📊 TABLEAU RÉCAPITULATIF:');
    console.log('┌─────────────────────────────────────┬──────────┐');
    console.log('│ Métrique                            │ Valeur   │');
    console.log('├─────────────────────────────────────┼──────────┤');
    console.log(`│ Gestionnaire Senior                 │ ${gestionnaireSenior.fullName.padEnd(8)} │`);
    console.log(`│ Contrats assignés                   │ ${contracts.length.toString().padEnd(8)} │`);
    console.log(`│ Bordereaux totaux                   │ ${bordereaux.length.toString().padEnd(8)} │`);
    console.log(`│ Documents totaux                    │ ${totalDocuments.toString().padEnd(8)} │`);
    console.log('└─────────────────────────────────────┴──────────┘');
    console.log('');

  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
checkGestionnaireSeniorData();
