const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFinanceData() {
  console.log('\n========================================');
  console.log('📊 FINANCE MODULE DATA CHECK');
  console.log('========================================\n');

  try {
    // 1. ORDRES DE VIREMENT
    console.log('💰 ORDRES DE VIREMENT:');
    console.log('─────────────────────────────────────');
    const ordresVirement = await prisma.ordreVirement.findMany({
      include: {
        bordereau: {
          include: { client: true }
        },
        donneurOrdre: true
      },
      orderBy: { dateCreation: 'desc' }
    });

    console.log(`Total OVs: ${ordresVirement.length}\n`);
    
    ordresVirement.forEach((ov, index) => {
      console.log(`${index + 1}. OV: ${ov.reference}`);
      console.log(`   ID: ${ov.id}`);
      console.log(`   Client: ${ov.bordereau?.client?.name || 'Entrée manuelle'}`);
      console.log(`   Donneur d'Ordre: ${ov.donneurOrdre?.nom || 'N/A'}`);
      console.log(`   Montant Total: ${ov.montantTotal} TND`);
      console.log(`   Nombre Adhérents: ${ov.nombreAdherents}`);
      console.log(`   État Virement: ${ov.etatVirement}`);
      console.log(`   Validation Status: ${ov.validationStatus || 'N/A'}`);
      console.log(`   Date Création: ${ov.dateCreation}`);
      console.log(`   Date Traitement: ${ov.dateTraitement || 'N/A'}`);
      console.log(`   Bordereau ID: ${ov.bordereauId || 'N/A'}`);
      console.log(`   Utilisateur Santé: ${ov.utilisateurSante || 'N/A'}`);
      console.log(`   Utilisateur Finance: ${ov.utilisateurFinance || 'N/A'}`);
      console.log(`   Commentaire: ${ov.commentaire || 'N/A'}`);
      console.log(`   Motif/Observation: ${ov.motifObservation || 'N/A'}`);
      console.log(`   Demande Récupération: ${ov.demandeRecuperation ? 'Oui' : 'Non'}`);
      if (ov.demandeRecuperation) {
        console.log(`   Date Demande Récupération: ${ov.dateDemandeRecuperation || 'N/A'}`);
      }
      console.log(`   Montant Récupéré: ${ov.montantRecupere ? 'Oui' : 'Non'}`);
      if (ov.montantRecupere) {
        console.log(`   Date Montant Récupéré: ${ov.dateMontantRecupere || 'N/A'}`);
      }
      console.log(`   Fichier PDF: ${ov.fichierPdf || 'N/A'}`);
      console.log(`   Fichier TXT: ${ov.fichierTxt || 'N/A'}`);
      console.log('');
    });

    // 2. BORDEREAUX (All statuses)
    console.log('\n📋 BORDEREAUX:');
    console.log('─────────────────────────────────────');
    const bordereaux = await prisma.bordereau.findMany({
      include: {
        client: true,
        ordresVirement: true
      },
      orderBy: { dateReception: 'desc' }
    });

    console.log(`Total Bordereaux: ${bordereaux.length}\n`);

    const statusGroups = {};
    bordereaux.forEach(b => {
      if (!statusGroups[b.statut]) statusGroups[b.statut] = [];
      statusGroups[b.statut].push(b);
    });

    Object.keys(statusGroups).forEach(status => {
      console.log(`\n📌 Status: ${status} (${statusGroups[status].length})`);
      statusGroups[status].forEach((b, index) => {
        console.log(`   ${index + 1}. ${b.reference}`);
        console.log(`      ID: ${b.id}`);
        console.log(`      Client: ${b.client?.name || 'N/A'}`);
        console.log(`      Nombre BS: ${b.nombreBS}`);
        console.log(`      Date Réception: ${b.dateReception}`);
        console.log(`      Date Clôture: ${b.dateCloture || 'N/A'}`);
        console.log(`      Délai Règlement: ${b.delaiReglement} jours`);
        console.log(`      Scan Status: ${b.scanStatus || 'N/A'}`);
        console.log(`      Completion Rate: ${b.completionRate}%`);
        console.log(`      Has OV: ${b.ordresVirement.length > 0 ? 'Oui' : 'Non'}`);
        if (b.ordresVirement.length > 0) {
          console.log(`      OV References: ${b.ordresVirement.map(ov => ov.reference).join(', ')}`);
        }
        console.log('');
      });
    });

    // 3. DONNEURS D'ORDRE
    console.log('\n🏦 DONNEURS D\'ORDRE:');
    console.log('─────────────────────────────────────');
    const donneurs = await prisma.donneurOrdre.findMany({
      include: {
        _count: {
          select: { ordresVirement: true }
        }
      }
    });

    console.log(`Total Donneurs: ${donneurs.length}\n`);
    donneurs.forEach((d, index) => {
      console.log(`${index + 1}. ${d.nom}`);
      console.log(`   ID: ${d.id}`);
      console.log(`   RIB: ${d.rib}`);
      console.log(`   Statut: ${d.statut}`);
      console.log(`   Format TXT: ${d.structureTxt || 'N/A'}`);
      console.log(`   OVs liés: ${d._count.ordresVirement}`);
      console.log('');
    });

    // 4. STATISTICS
    console.log('\n📊 STATISTIQUES:');
    console.log('─────────────────────────────────────');
    
    const stats = {
      totalOVs: ordresVirement.length,
      ovByStatus: {},
      ovByValidationStatus: {},
      totalBordereaux: bordereaux.length,
      bordereauxByStatus: {},
      totalMontant: ordresVirement.reduce((sum, ov) => sum + ov.montantTotal, 0),
      ovsWithBordereau: ordresVirement.filter(ov => ov.bordereauId).length,
      ovsWithoutBordereau: ordresVirement.filter(ov => !ov.bordereauId).length,
      bordereauxWithOV: bordereaux.filter(b => b.ordresVirement.length > 0).length,
      bordereauxWithoutOV: bordereaux.filter(b => b.ordresVirement.length === 0).length,
      demandesRecuperation: ordresVirement.filter(ov => ov.demandeRecuperation).length,
      montantsRecuperes: ordresVirement.filter(ov => ov.montantRecupere).length
    };

    ordresVirement.forEach(ov => {
      stats.ovByStatus[ov.etatVirement] = (stats.ovByStatus[ov.etatVirement] || 0) + 1;
      const valStatus = ov.validationStatus || 'N/A';
      stats.ovByValidationStatus[valStatus] = (stats.ovByValidationStatus[valStatus] || 0) + 1;
    });

    bordereaux.forEach(b => {
      stats.bordereauxByStatus[b.statut] = (stats.bordereauxByStatus[b.statut] || 0) + 1;
    });

    console.log(`Total OVs: ${stats.totalOVs}`);
    console.log(`Total Bordereaux: ${stats.totalBordereaux}`);
    console.log(`Total Montant: ${stats.totalMontant.toFixed(2)} TND`);
    console.log(`\nOVs avec Bordereau: ${stats.ovsWithBordereau}`);
    console.log(`OVs sans Bordereau (manuels): ${stats.ovsWithoutBordereau}`);
    console.log(`Bordereaux avec OV: ${stats.bordereauxWithOV}`);
    console.log(`Bordereaux sans OV: ${stats.bordereauxWithoutOV}`);
    console.log(`\nDemandes de Récupération: ${stats.demandesRecuperation}`);
    console.log(`Montants Récupérés: ${stats.montantsRecuperes}`);

    console.log('\nOVs par État:');
    Object.entries(stats.ovByStatus).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    console.log('\nOVs par Statut de Validation:');
    Object.entries(stats.ovByValidationStatus).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    console.log('\nBordereaux par Statut:');
    Object.entries(stats.bordereauxByStatus).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    // 5. RELATIONSHIPS CHECK
    console.log('\n🔗 VÉRIFICATION DES RELATIONS:');
    console.log('─────────────────────────────────────');
    
    const orphanOVs = ordresVirement.filter(ov => ov.bordereauId && !ov.bordereau);
    const orphanBordereaux = bordereaux.filter(b => b.ordresVirement.length > 0 && !b.ordresVirement[0]);
    
    console.log(`OVs orphelins (bordereauId mais pas de bordereau): ${orphanOVs.length}`);
    console.log(`Bordereaux orphelins (OV référencé mais introuvable): ${orphanBordereaux.length}`);

    if (orphanOVs.length > 0) {
      console.log('\n⚠️  OVs orphelins:');
      orphanOVs.forEach(ov => {
        console.log(`   - ${ov.reference} (bordereauId: ${ov.bordereauId})`);
      });
    }

    // 6. VALIDATION STATUS CHECK
    console.log('\n✅ STATUTS DE VALIDATION:');
    console.log('─────────────────────────────────────');
    const pendingValidation = ordresVirement.filter(ov => ov.validationStatus === 'EN_ATTENTE_VALIDATION');
    const validated = ordresVirement.filter(ov => ov.validationStatus === 'VALIDE');
    const rejected = ordresVirement.filter(ov => ov.validationStatus === 'REJETE_VALIDATION');
    
    console.log(`En attente de validation: ${pendingValidation.length}`);
    console.log(`Validés: ${validated.length}`);
    console.log(`Rejetés: ${rejected.length}`);

    if (pendingValidation.length > 0) {
      console.log('\n⏳ OVs en attente de validation:');
      pendingValidation.forEach(ov => {
        console.log(`   - ${ov.reference} (${ov.montantTotal} TND, ${ov.nombreAdherents} adhérents)`);
      });
    }

    console.log('\n========================================');
    console.log('✅ CHECK COMPLETED');
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Error checking finance data:', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkFinanceData();
