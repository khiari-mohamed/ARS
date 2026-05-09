const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnoseAndFixDureeCalculations() {
  console.log('🔍 COMPREHENSIVE DIAGNOSIS: Durée Traitement & Durée Règlement\n');
  console.log('='.repeat(80));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // UI data to verify
  const problematicRefs = [
    'ALT-BULLETIN-2026-03132',  // Shows 390j
    'ALT-BULLETIN-2026-76652',  // Shows 20508j
    'DS-BULLETIN-2026-20637',   // Shows 31j
  ];

  console.log('\n📋 CHECKING PROBLEMATIC BORDEREAUX:\n');

  for (const ref of problematicRefs) {
    const bordereau = await prisma.bordereau.findUnique({
      where: { reference: ref },
      include: {
        client: true,
        ordresVirement: {
          select: { dateTraitement: true, dateEtatFinal: true, etatVirement: true },
          orderBy: { dateEtatFinal: 'desc' },
          take: 1
        }
      }
    });

    if (!bordereau) {
      console.log(`❌ NOT FOUND: ${ref}\n`);
      continue;
    }

    console.log(`\n📋 ${ref}`);
    console.log(`   Client: ${bordereau.client.name}`);
    console.log(`   Status: ${bordereau.statut}`);
    console.log(`   Délai: ${bordereau.delaiReglement}j`);
    
    // Check critical dates
    console.log(`\n   📅 DATES IN DATABASE:`);
    console.log(`      dateReception:    ${bordereau.dateReception ? bordereau.dateReception.toISOString() : 'NULL'}`);
    console.log(`      dateReceptionBO:  ${bordereau.dateReceptionBO ? bordereau.dateReceptionBO.toISOString() : '❌ NULL'}`);
    console.log(`      dateCloture:      ${bordereau.dateCloture ? bordereau.dateCloture.toISOString() : 'NULL'}`);
    console.log(`      dateExecutionVir: ${bordereau.dateExecutionVirement ? bordereau.dateExecutionVirement.toISOString() : 'NULL'}`);
    
    if (bordereau.ordresVirement && bordereau.ordresVirement.length > 0) {
      const ov = bordereau.ordresVirement[0];
      console.log(`      OV dateTraitement: ${ov.dateTraitement ? ov.dateTraitement.toISOString() : 'NULL'}`);
      console.log(`      OV dateEtatFinal:  ${ov.dateEtatFinal ? ov.dateEtatFinal.toISOString() : 'NULL'}`);
      console.log(`      OV etatVirement:   ${ov.etatVirement}`);
    }

    // Calculate what SHOULD be displayed
    console.log(`\n   🧮 CALCULATIONS:`);
    
    // Durée Traitement
    if (bordereau.dateReceptionBO) {
      const dateBO = new Date(bordereau.dateReceptionBO);
      dateBO.setHours(0, 0, 0, 0);
      
      const dureeTraitement = Math.floor((today - dateBO) / (1000 * 60 * 60 * 24));
      const status = dureeTraitement <= bordereau.delaiReglement ? '✅ GREEN' : '❌ RED';
      console.log(`      Durée Traitement: ${dureeTraitement}j ${status}`);
    } else {
      console.log(`      Durée Traitement: ❌ CANNOT CALCULATE (dateReceptionBO is NULL)`);
    }

    // Durée Règlement
    const dateExecutionVirement = bordereau.ordresVirement?.[0]?.dateEtatFinal || 
                                   bordereau.ordresVirement?.[0]?.dateTraitement || 
                                   bordereau.dateExecutionVirement;
    
    if (bordereau.dateReceptionBO && dateExecutionVirement) {
      const dateBO = new Date(bordereau.dateReceptionBO);
      dateBO.setHours(0, 0, 0, 0);
      const dateReglement = new Date(dateExecutionVirement);
      dateReglement.setHours(0, 0, 0, 0);
      
      const dureeReglement = Math.floor((dateReglement - dateBO) / (1000 * 60 * 60 * 24));
      const status = dureeReglement <= bordereau.delaiReglement ? '✅ GREEN' : '❌ RED';
      console.log(`      Durée Règlement:  ${dureeReglement}j ${status}`);
    } else if (!bordereau.dateReceptionBO) {
      console.log(`      Durée Règlement:  ❌ CANNOT CALCULATE (dateReceptionBO is NULL)`);
    } else {
      console.log(`      Durée Règlement:  ⏳ En attente (no virement execution date)`);
    }

    console.log('\n' + '-'.repeat(80));
  }

  // Check how many bordereaux have NULL dateReceptionBO
  console.log('\n\n📊 GLOBAL STATISTICS:\n');
  
  const totalBordereaux = await prisma.bordereau.count();
  const withDateReceptionBO = await prisma.bordereau.count({
    where: { dateReceptionBO: { not: null } }
  });
  const withoutDateReceptionBO = totalBordereaux - withDateReceptionBO;

  console.log(`   Total Bordereaux: ${totalBordereaux}`);
  console.log(`   With dateReceptionBO: ${withDateReceptionBO} (${Math.round(withDateReceptionBO/totalBordereaux*100)}%)`);
  console.log(`   WITHOUT dateReceptionBO: ${withoutDateReceptionBO} (${Math.round(withoutDateReceptionBO/totalBordereaux*100)}%) ❌`);

  // FIX: Set dateReceptionBO = dateReception for all bordereaux where it's NULL
  if (withoutDateReceptionBO > 0) {
    console.log(`\n\n🔧 FIXING ${withoutDateReceptionBO} BORDEREAUX...\n`);
    
    const bordereauxToFix = await prisma.bordereau.findMany({
      where: { dateReceptionBO: null },
      select: { id: true, reference: true, dateReception: true }
    });

    let fixed = 0;
    for (const b of bordereauxToFix) {
      try {
        await prisma.bordereau.update({
          where: { id: b.id },
          data: { dateReceptionBO: b.dateReception }
        });
        fixed++;
        if (fixed <= 5) {
          console.log(`   ✅ Fixed ${b.reference}: dateReceptionBO = ${b.dateReception.toISOString()}`);
        }
      } catch (error) {
        console.log(`   ❌ Failed to fix ${b.reference}: ${error.message}`);
      }
    }

    console.log(`\n   ✅ Fixed ${fixed} out of ${bordereauxToFix.length} bordereaux`);
  }

  // Check "En retard" count
  console.log('\n\n📊 EN RETARD CALCULATION:\n');
  
  const allBordereaux = await prisma.bordereau.findMany({
    where: { archived: false },
    select: {
      id: true,
      reference: true,
      dateReceptionBO: true,
      dateReception: true,
      delaiReglement: true,
      statut: true
    }
  });

  let enRetardCount = 0;
  for (const b of allBordereaux) {
    const dateBO = b.dateReceptionBO ? new Date(b.dateReceptionBO) : new Date(b.dateReception);
    dateBO.setHours(0, 0, 0, 0);
    
    const dureeTraitement = Math.floor((today - dateBO) / (1000 * 60 * 60 * 24));
    
    if (dureeTraitement > b.delaiReglement && !['CLOTURE', 'PAYE'].includes(b.statut)) {
      enRetardCount++;
    }
  }

  console.log(`   Total Bordereaux (not archived): ${allBordereaux.length}`);
  console.log(`   En retard: ${enRetardCount}`);
  console.log(`   UI shows: 212`);
  console.log(`   ${enRetardCount === 212 ? '✅ MATCH' : '❌ MISMATCH'}`);

  await prisma.$disconnect();
}

diagnoseAndFixDureeCalculations().catch(console.error);
