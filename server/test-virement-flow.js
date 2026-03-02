const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testVirementFlow() {
  console.log('🧪 TEST: Virement Flow - Checking delaiReglement visibility\n');

  try {
    // 1. Find TRAITE bordereaux without virements
    const traitesBordereaux = await prisma.bordereau.findMany({
      where: {
        statut: 'TRAITE',
        ordresVirement: { none: {} }
      },
      include: { client: true },
      take: 3
    });

    if (traitesBordereaux.length === 0) {
      console.log('❌ No TRAITE bordereaux found without virements');
      return;
    }

    console.log(`✅ Found ${traitesBordereaux.length} TRAITE bordereaux\n`);

    // 2. Get active donneur d'ordre
    const donneur = await prisma.donneurOrdre.findFirst({
      where: { statut: 'ACTIF' }
    });

    if (!donneur) {
      console.log('❌ No active donneur d\'ordre found');
      return;
    }

    // 3. Create OrdreVirement for each bordereau
    for (const bordereau of traitesBordereaux) {
      console.log(`\n📋 Bordereau: ${bordereau.reference}`);
      console.log(`   Client: ${bordereau.client.name}`);
      console.log(`   Statut AVANT: ${bordereau.statut}`);
      console.log(`   delaiReglement: ${bordereau.delaiReglement} jours`);

      // Create OV
      const ov = await prisma.ordreVirement.create({
        data: {
          reference: `TEST-OV-${bordereau.reference}`,
          donneurOrdreId: donneur.id,
          bordereauId: bordereau.id,
          utilisateurSante: 'SYSTEM',
          montantTotal: bordereau.nombreBS * 150,
          nombreAdherents: bordereau.nombreBS,
          etatVirement: 'NON_EXECUTE'
        }
      });

      console.log(`   ✅ OV créé: ${ov.reference} (${ov.etatVirement})`);

      // Simulate: EN_COURS_EXECUTION
      await prisma.ordreVirement.update({
        where: { id: ov.id },
        data: { 
          etatVirement: 'EN_COURS_EXECUTION',
          dateTraitement: new Date()
        }
      });
      console.log(`   ⏳ OV mis à jour: EN_COURS_EXECUTION`);

      // Simulate: EXECUTE
      await prisma.ordreVirement.update({
        where: { id: ov.id },
        data: { 
          etatVirement: 'EXECUTE',
          dateEtatFinal: new Date()
        }
      });
      console.log(`   ✅ OV mis à jour: EXECUTE`);

      // Update bordereau to VIREMENT_EXECUTE
      await prisma.bordereau.update({
        where: { id: bordereau.id },
        data: { statut: 'VIREMENT_EXECUTE' }
      });

      // Check final state
      const updated = await prisma.bordereau.findUnique({
        where: { id: bordereau.id },
        include: { ordresVirement: true }
      });

      console.log(`\n   📊 RÉSULTAT FINAL:`);
      console.log(`   Statut APRÈS: ${updated.statut}`);
      console.log(`   delaiReglement: ${updated.delaiReglement} jours`);
      console.log(`   OV count: ${updated.ordresVirement.length}`);
      console.log(`   OV status: ${updated.ordresVirement[0]?.etatVirement}`);
      
      // TEST: Check if delaiReglement still appears
      if (updated.statut === 'VIREMENT_EXECUTE' && updated.delaiReglement) {
        console.log(`   ⚠️  ISSUE: delaiReglement STILL VISIBLE (${updated.delaiReglement}j) even with VIREMENT_EXECUTE`);
      } else {
        console.log(`   ✅ OK: delaiReglement handling correct`);
      }
    }

    console.log('\n\n🎯 TEST SUMMARY:');
    console.log('Check frontend UI to see if "Délai règlement" still appears for VIREMENT_EXECUTE bordereaux');
    console.log('Expected: Should NOT show "en attente" for bordereaux with executed virements');
    
    console.log('\n\n📋 BORDEREAUX TO CHECK IN UI:');
    console.log('=' .repeat(60));
    for (const b of traitesBordereaux) {
      console.log(`✅ ${b.reference} - Client: ${b.client.name}`);
    }
    console.log('=' .repeat(60));
    console.log('\n👉 Go to frontend and search for these bordereaux');
    console.log('👉 Check if "Délai règlement" or "en attente" still appears');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testVirementFlow();
