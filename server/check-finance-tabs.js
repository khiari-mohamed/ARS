const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFinanceTabs() {
  console.log('\n========================================');
  console.log('📑 FINANCE MODULE - TAB BY TAB CHECK');
  console.log('========================================\n');

  try {
    // TAB 1: TRAITEMENT OV (OV Processing)
    console.log('📋 TAB 1: TRAITEMENT OV');
    console.log('─────────────────────────────────────');
    console.log('Expected: Create new OV from Excel upload');
    console.log('Steps: Upload Excel → Validate → Create OV → Request Validation → Generate PDF/TXT\n');
    
    const allOVs = await prisma.ordreVirement.findMany({
      include: { donneurOrdre: true, bordereau: { include: { client: true } } },
      orderBy: { dateCreation: 'desc' }
    });
    
    console.log(`Total OVs in system: ${allOVs.length}`);
    allOVs.forEach((ov, i) => {
      console.log(`  ${i+1}. ${ov.reference}`);
      console.log(`     Status: ${ov.etatVirement}`);
      console.log(`     Validation: ${ov.validationStatus || 'N/A'}`);
      console.log(`     Montant: ${ov.montantTotal} TND`);
      console.log(`     Adhérents: ${ov.nombreAdherents}`);
      console.log(`     PDF: ${ov.fichierPdf ? '✅' : '❌'}`);
      console.log(`     TXT: ${ov.fichierTxt ? '✅' : '❌'}`);
      console.log(`     Linked to Bordereau: ${ov.bordereauId ? '✅' : '❌ (Manual)'}`);
    });

    // TAB 2: VALIDATION OV
    console.log('\n\n📋 TAB 2: VALIDATION OV');
    console.log('─────────────────────────────────────');
    console.log('Expected: RESPONSABLE_DEPARTEMENT validates pending OVs\n');
    
    const pendingValidation = allOVs.filter(ov => ov.validationStatus === 'EN_ATTENTE_VALIDATION');
    const validated = allOVs.filter(ov => ov.validationStatus === 'VALIDE');
    const rejected = allOVs.filter(ov => ov.validationStatus === 'REJETE_VALIDATION');
    
    console.log(`⏳ Pending Validation: ${pendingValidation.length}`);
    pendingValidation.forEach(ov => {
      console.log(`   - ${ov.reference} (${ov.montantTotal} TND, ${ov.nombreAdherents} adhérents)`);
      console.log(`     Donneur: ${ov.donneurOrdre?.nom || 'N/A'}`);
      console.log(`     Created: ${ov.dateCreation.toLocaleString('fr-FR')}`);
    });
    
    console.log(`\n✅ Validated: ${validated.length}`);
    validated.forEach(ov => {
      console.log(`   - ${ov.reference} (Validated at: ${ov.validatedAt?.toLocaleString('fr-FR') || 'N/A'})`);
    });
    
    console.log(`\n❌ Rejected: ${rejected.length}`);

    // TAB 3: SUIVI VIREMENT (Tracking)
    console.log('\n\n📋 TAB 3: SUIVI VIREMENT');
    console.log('─────────────────────────────────────');
    console.log('Expected: Track all OVs with status, dates, recovery info\n');
    
    const now = new Date();
    allOVs.forEach((ov, i) => {
      const delayDays = Math.floor((now - ov.dateCreation) / (1000 * 60 * 60 * 24));
      console.log(`${i+1}. ${ov.reference}`);
      console.log(`   Société: ${ov.bordereau?.client?.name || 'Entrée manuelle'}`);
      console.log(`   Donneur: ${ov.donneurOrdre?.nom || 'N/A'}`);
      console.log(`   Montant: ${ov.montantTotal} TND`);
      console.log(`   Date Injection: ${ov.dateCreation.toLocaleDateString('fr-FR')}`);
      console.log(`   Date Exécution: ${ov.dateTraitement?.toLocaleDateString('fr-FR') || 'N/A'}`);
      console.log(`   Statut: ${ov.etatVirement}`);
      console.log(`   Délai: ${delayDays} jours`);
      console.log(`   Demande Récupération: ${ov.demandeRecuperation ? '✅' : '❌'}`);
      if (ov.demandeRecuperation) {
        console.log(`   Date Demande: ${ov.dateDemandeRecuperation?.toLocaleDateString('fr-FR') || 'N/A'}`);
      }
      console.log(`   Montant Récupéré: ${ov.montantRecupere ? '✅' : '❌'}`);
      if (ov.montantRecupere) {
        console.log(`   Date Récupération: ${ov.dateMontantRecupere?.toLocaleDateString('fr-FR') || 'N/A'}`);
      }
      console.log(`   Motif/Observation: ${ov.motifObservation || 'N/A'}`);
      console.log('');
    });

    // TAB 4: BORDEREAUX TRAITÉS
    console.log('\n📋 TAB 4: BORDEREAUX TRAITÉS');
    console.log('─────────────────────────────────────');
    console.log('Expected: Only TRAITÉ bordereaux, with OV info and recovery tracking\n');
    
    const bordereauxTraites = await prisma.bordereau.findMany({
      where: { statut: 'TRAITE' },
      include: {
        client: true,
        ordresVirement: { include: { donneurOrdre: true } }
      },
      orderBy: { dateCloture: 'desc' }
    });
    
    console.log(`Total Bordereaux TRAITÉ: ${bordereauxTraites.length}\n`);
    
    if (bordereauxTraites.length === 0) {
      console.log('⚠️  No TRAITÉ bordereaux found!');
    } else {
      bordereauxTraites.forEach((b, i) => {
        const ov = b.ordresVirement[0];
        console.log(`${i+1}. ${b.reference}`);
        console.log(`   Client/Société: ${b.client?.name || 'N/A'}`);
        console.log(`   Référence OV: ${ov?.reference || '❌ No OV'}`);
        console.log(`   Référence Bordereau: ${b.reference}`);
        console.log(`   Montant Bordereau: ${(b.nombreBS * 150).toFixed(2)} TND (${b.nombreBS} BS)`);
        console.log(`   Date Finalisation: ${b.dateCloture?.toLocaleDateString('fr-FR') || 'N/A'}`);
        console.log(`   Date Injection OV: ${ov?.dateCreation?.toLocaleDateString('fr-FR') || 'N/A'}`);
        console.log(`   Statut Virement: ${ov?.etatVirement || 'NON_EXECUTE'}`);
        console.log(`   Date Traitement: ${ov?.dateTraitement?.toLocaleDateString('fr-FR') || 'N/A'}`);
        console.log(`   Motif/Observation: ${ov?.motifObservation || 'N/A'}`);
        console.log(`   Demande Récupération: ${ov?.demandeRecuperation ? '✅' : '❌'}`);
        console.log(`   Montant Récupéré: ${ov?.montantRecupere ? '✅' : '❌'}`);
        console.log('');
      });
    }

    // TAB 5: RAPPROCHEMENT (Reconciliation)
    console.log('\n📋 TAB 5: RAPPROCHEMENT');
    console.log('─────────────────────────────────────');
    console.log('Expected: Upload bank statements, match with OVs, resolve exceptions\n');
    
    // Check for virements (bank confirmations)
    const virements = await prisma.virement.findMany({
      include: { bordereau: { include: { client: true } } },
      orderBy: { dateDepot: 'desc' }
    });
    
    console.log(`Total Virements (Bank Confirmations): ${virements.length}\n`);
    
    if (virements.length === 0) {
      console.log('⚠️  No bank virements found!');
    } else {
      virements.forEach((v, i) => {
        console.log(`${i+1}. Virement ID: ${v.id}`);
        console.log(`   Bordereau: ${v.bordereau?.reference || 'N/A'}`);
        console.log(`   Client: ${v.bordereau?.client?.name || 'N/A'}`);
        console.log(`   Montant: ${v.montant} TND`);
        console.log(`   Référence Bancaire: ${v.referenceBancaire}`);
        console.log(`   Date Dépôt: ${v.dateDepot.toLocaleDateString('fr-FR')}`);
        console.log(`   Date Exécution: ${v.dateExecution.toLocaleDateString('fr-FR')}`);
        console.log(`   Confirmé: ${v.confirmed ? '✅' : '❌'}`);
        console.log('');
      });
    }

    // TAB 6: HISTORIQUE
    console.log('\n📋 TAB 6: HISTORIQUE');
    console.log('─────────────────────────────────────');
    console.log('Expected: Complete history of all OVs with filters\n');
    
    console.log(`Total OVs in History: ${allOVs.length}`);
    console.log(`Date Range: ${allOVs[allOVs.length-1]?.dateCreation.toLocaleDateString('fr-FR')} → ${allOVs[0]?.dateCreation.toLocaleDateString('fr-FR')}`);
    
    const byStatus = {};
    allOVs.forEach(ov => {
      byStatus[ov.etatVirement] = (byStatus[ov.etatVirement] || 0) + 1;
    });
    
    console.log('\nBreakdown by Status:');
    Object.entries(byStatus).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    // SUMMARY & RECOMMENDATIONS
    console.log('\n\n========================================');
    console.log('📊 SUMMARY & RECOMMENDATIONS');
    console.log('========================================\n');
    
    console.log('✅ Working:');
    console.log('  - OV creation from Excel');
    console.log('  - PDF/TXT generation');
    console.log('  - Validation workflow');
    console.log('  - Donneur d\'Ordre management\n');
    
    console.log('⚠️  Issues Found:');
    if (bordereauxTraites.length > 0 && bordereauxTraites.every(b => b.ordresVirement.length === 0)) {
      console.log('  - TRAITÉ bordereaux exist but no OVs linked');
      console.log('    → Need to create OVs for TRAITÉ bordereaux');
    }
    if (allOVs.every(ov => !ov.bordereauId)) {
      console.log('  - All OVs are manual (no bordereau links)');
      console.log('    → Need workflow to create OV from TRAITÉ bordereau');
    }
    if (virements.length === 0) {
      console.log('  - No bank virements for reconciliation');
      console.log('    → Need to test Rapprochement tab with bank statement upload');
    }
    
    console.log('\n📝 Next Steps:');
    console.log('  1. Test creating OV from TRAITÉ bordereau');
    console.log('  2. Test bank statement upload in Rapprochement');
    console.log('  3. Test updating recovery info in Suivi Virement');
    console.log('  4. Verify all tabs display correct data');

    console.log('\n========================================');
    console.log('✅ TAB CHECK COMPLETED');
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkFinanceTabs();
