// Script to verify OV data integrity in database
// Run: node check-ov-data.js VIR-20260325-0002

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOVData(reference) {
  try {
    console.log(`\n🔍 Checking OV: ${reference}\n`);

    const ov = await prisma.ordreVirement.findFirst({
      where: { reference },
      include: {
        donneurOrdre: true,
        bordereau: {
          include: {
            client: true,
            contract: true
          }
        },
        items: {
          take: 5,
          include: {
            adherent: {
              include: { client: true }
            }
          }
        }
      }
    });

    if (!ov) {
      console.error('❌ OV not found');
      process.exit(1);
    }

    // Check OV basic info
    console.log('📄 ORDRE DE VIREMENT:');
    console.log(`   Reference: ${ov.reference || '❌ MISSING'}`);
    console.log(`   Montant Total: ${ov.montantTotal || '❌ MISSING'} TND`);
    console.log(`   Date Creation: ${ov.dateCreation || '❌ MISSING'}`);
    console.log(`   Items Count: ${ov.items?.length || 0}`);

    // Check Bordereau info
    console.log('\n📋 BORDEREAU:');
    if (ov.bordereau) {
      console.log(`   ✅ Reference: ${ov.bordereau.reference}`);
      console.log(`   ✅ Client: ${ov.bordereau.client?.name || '❌ MISSING'}`);
      console.log(`   ✅ Contract Code: ${ov.bordereau.contract?.codeAssure || '❌ MISSING'}`);
      console.log(`   Date Reception: ${ov.bordereau.dateReception}`);
    } else {
      console.log('   ❌ NO BORDEREAU LINKED');
    }

    // Check User info
    console.log('\n👤 USER (Saisie par):');
    if (ov.utilisateurSante) {
      const user = await prisma.user.findUnique({
        where: { id: ov.utilisateurSante },
        select: { fullName: true, email: true }
      });
      if (user) {
        console.log(`   ✅ Full Name: ${user.fullName || '❌ MISSING'}`);
        console.log(`   ✅ Email: ${user.email || '❌ MISSING'}`);
      } else {
        console.log('   ❌ USER NOT FOUND');
      }
    } else {
      console.log('   ❌ NO USER ID');
    }

    // Check Donneur d'Ordre
    console.log('\n🏦 DONNEUR D\'ORDRE:');
    if (ov.donneurOrdre) {
      console.log(`   ✅ Nom: ${ov.donneurOrdre.nom}`);
      console.log(`   ✅ RIB: ${ov.donneurOrdre.rib}`);
      console.log(`   ✅ Banque: ${ov.donneurOrdre.banque || '❌ MISSING'}`);
      console.log(`   ✅ Agence: ${ov.donneurOrdre.agence || '❌ MISSING'}`);
    } else {
      console.log('   ❌ NO DONNEUR D\'ORDRE');
    }

    // Check sample items
    console.log('\n💰 VIREMENT ITEMS (first 5):');
    if (ov.items && ov.items.length > 0) {
      ov.items.forEach((item, idx) => {
        console.log(`\n   Item ${idx + 1}:`);
        console.log(`      Matricule: ${item.adherent?.matricule || '❌ MISSING'}`);
        console.log(`      Nom: ${item.adherent?.nom || '❌ MISSING'}`);
        console.log(`      Prenom: ${item.adherent?.prenom || '❌ MISSING'}`);
        console.log(`      RIB: ${item.adherent?.rib || '❌ MISSING'}`);
        console.log(`      Montant: ${item.montant} TND`);
        console.log(`      Client: ${item.adherent?.client?.name || '❌ MISSING'}`);
      });
    } else {
      console.log('   ❌ NO ITEMS');
    }

    // Summary
    console.log('\n\n📊 VALIDATION SUMMARY:');
    const issues = [];
    
    if (!ov.reference) issues.push('Missing OV reference');
    if (!ov.montantTotal) issues.push('Missing montant total');
    if (!ov.bordereau) issues.push('No bordereau linked');
    if (ov.bordereau && !ov.bordereau.reference) issues.push('Missing bordereau reference');
    if (ov.bordereau && !ov.bordereau.client?.name) issues.push('Missing client name');
    if (ov.bordereau && !ov.bordereau.contract?.codeAssure) issues.push('Missing contract code');
    if (!ov.utilisateurSante) issues.push('Missing user ID');
    if (!ov.donneurOrdre) issues.push('Missing donneur d\'ordre');
    if (!ov.items || ov.items.length === 0) issues.push('No virement items');

    if (issues.length === 0) {
      console.log('   ✅ ALL DATA COMPLETE - PDF will generate correctly');
    } else {
      console.log('   ⚠️  ISSUES FOUND:');
      issues.forEach(issue => console.log(`      - ${issue}`));
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

const reference = process.argv[2];

if (!reference) {
  console.error('❌ Usage: node check-ov-data.js <OV_REFERENCE>');
  console.error('   Example: node check-ov-data.js VIR-20260325-0002');
  process.exit(1);
}

checkOVData(reference);
