const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function linkOVToBordereaux() {
  console.log('\n========================================');
  console.log('🔗 LINKING OVs TO TRAITÉ BORDEREAUX');
  console.log('========================================\n');

  try {
    // Find TRAITÉ bordereaux without OVs
    const bordereauxTraites = await prisma.bordereau.findMany({
      where: {
        statut: 'TRAITE',
        ordresVirement: { none: {} }
      },
      include: { client: true }
    });

    console.log(`Found ${bordereauxTraites.length} TRAITÉ bordereaux without OVs\n`);

    if (bordereauxTraites.length === 0) {
      console.log('✅ All TRAITÉ bordereaux already have OVs!');
      return;
    }

    // Get first active donneur d'ordre
    const donneur = await prisma.donneurOrdre.findFirst({
      where: { statut: 'ACTIF' }
    });

    if (!donneur) {
      console.log('❌ No active Donneur d\'Ordre found!');
      return;
    }

    console.log(`Using Donneur d'Ordre: ${donneur.nom}\n`);

    // Create OV for each bordereau
    for (const bordereau of bordereauxTraites) {
      const reference = `OV-${bordereau.reference}`;
      const montantTotal = bordereau.nombreBS * 150;

      console.log(`Creating OV for bordereau ${bordereau.reference}...`);

      const ov = await prisma.ordreVirement.create({
        data: {
          reference,
          donneurOrdreId: donneur.id,
          bordereauId: bordereau.id,
          utilisateurSante: 'demo-user',
          montantTotal,
          nombreAdherents: bordereau.nombreBS,
          etatVirement: 'NON_EXECUTE',
          validationStatus: 'EN_ATTENTE_VALIDATION'
        }
      });

      console.log(`✅ Created OV: ${ov.reference}`);
      console.log(`   Bordereau: ${bordereau.reference}`);
      console.log(`   Client: ${bordereau.client?.name || 'N/A'}`);
      console.log(`   Montant: ${montantTotal} TND`);
      console.log(`   Adhérents: ${bordereau.nombreBS}\n`);
    }

    console.log('========================================');
    console.log('✅ LINKING COMPLETED');
    console.log('========================================\n');

    // Show summary
    const allOVs = await prisma.ordreVirement.findMany({
      include: { bordereau: true }
    });

    const linked = allOVs.filter(ov => ov.bordereauId).length;
    const manual = allOVs.filter(ov => !ov.bordereauId).length;

    console.log('📊 SUMMARY:');
    console.log(`Total OVs: ${allOVs.length}`);
    console.log(`Linked to Bordereau: ${linked}`);
    console.log(`Manual entries: ${manual}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

linkOVToBordereaux();
