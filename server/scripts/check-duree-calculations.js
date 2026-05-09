const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDureeCalculations() {
  console.log('🔍 Checking Délai, Durée Traitement, and Durée Règlement calculations...\n');

  // UI data to verify
  const uiData = [
    { ref: 'OA-BULLETIN-2026-98259', client: 'OMV ACTIFS', dateReception: '26/02/2026', docs: 56, delai: '9j', dureeTraitement: '-2j', dureeReglement: '-2j' },
    { ref: 'ALT-BULLETIN-2026-75925', client: 'AIR LIQUIDE TUNISIE RETRAITES', dateReception: '02/02/2026', docs: 20, delai: '9j', dureeTraitement: '22j', dureeReglement: '22j' },
    { ref: 'K&S-BULLETIN-2026-71476', client: 'KROMBERG & SHUBERT', dateReception: '02/02/2026', docs: 32, delai: '14j', dureeTraitement: '22j', dureeReglement: '22j' },
    { ref: 'DTT-BULLETIN-2026-74641', client: 'DXC TECHNOLOGY TUNISIA', dateReception: '02/02/2026', docs: 25, delai: '9j', dureeTraitement: '22j', dureeReglement: '22j' },
    { ref: 'ALT-BULLETIN-2026-82182', client: 'AIR LIQUIDE TUNISIE SERVICES ACTIFS', dateReception: '02/02/2026', docs: 6, delai: '9j', dureeTraitement: '22j', dureeReglement: '22j' },
    { ref: 'A-BULLETIN-2026-50256', client: 'OMV ACTIFS', dateReception: '02/02/2026', docs: 0, delai: '9j', dureeTraitement: '22j', dureeReglement: '22j' },
    { ref: 'ALT-BULLETIN-2026-03132', client: 'AIR LIQUIDE TUNISIE SERVICES RETRAITES', dateReception: '30/01/2026', docs: 21, delai: '9j', dureeTraitement: '390j', dureeReglement: '390j' },
    { ref: 'ALT-BULLETIN-2026-76652', client: 'AIR LIQUIDE TUNISIE SERVICES RETRAITES', dateReception: '30/01/2026', docs: 4, delai: '9j', dureeTraitement: '20508j', dureeReglement: '20508j' },
    { ref: 'DS-BULLETIN-2026-20637', client: 'CCA', dateReception: '30/01/2026', docs: 49, delai: '9j', dureeTraitement: '31j', dureeReglement: '31j' },
    { ref: 'FT-BULLETIN-2026-23793', client: 'FNZ TUNISIE', dateReception: '30/01/2026', docs: 21, delai: '9j', dureeTraitement: '25j', dureeReglement: '25j' }
  ];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const uiRow of uiData) {
    const bordereau = await prisma.bordereau.findUnique({
      where: { reference: uiRow.ref },
      include: {
        client: true,
        chargeCompte: true
      }
    });

    if (!bordereau) {
      console.log(`❌ NOT FOUND: ${uiRow.ref}\n`);
      continue;
    }

    const dateReception = new Date(bordereau.dateReception);
    dateReception.setHours(0, 0, 0, 0);

    // Calculate Durée Traitement (days since reception)
    const dureeTraitementCalculated = Math.floor((today - dateReception) / (1000 * 60 * 60 * 24));
    
    // Calculate Durée Règlement (days since reception, same as Durée Traitement for "En attente" status)
    const dureeReglementCalculated = Math.floor((today - dateReception) / (1000 * 60 * 60 * 24));

    // Extract UI values
    const uiDelai = parseInt(uiRow.delai);
    const uiDureeTraitement = parseInt(uiRow.dureeTraitement);
    const uiDureeReglement = parseInt(uiRow.dureeReglement);

    console.log(`📋 ${uiRow.ref}`);
    console.log(`   Client: ${bordereau.client.name}`);
    console.log(`   Date Réception DB: ${dateReception.toLocaleDateString('fr-FR')}`);
    console.log(`   Date Réception UI: ${uiRow.dateReception}`);
    console.log(`   Today: ${today.toLocaleDateString('fr-FR')}`);
    console.log(`\n   ⏱️  DÉLAI:`);
    console.log(`      DB: ${bordereau.delaiReglement}j`);
    console.log(`      UI: ${uiDelai}j`);
    console.log(`      ${bordereau.delaiReglement === uiDelai ? '✅ MATCH' : '❌ MISMATCH'}`);
    
    console.log(`\n   ⏱️  DURÉE TRAITEMENT:`);
    console.log(`      Calculated: ${dureeTraitementCalculated}j`);
    console.log(`      UI: ${uiDureeTraitement}j`);
    console.log(`      ${dureeTraitementCalculated === uiDureeTraitement ? '✅ MATCH' : '❌ MISMATCH'}`);
    
    console.log(`\n   ⏱️  DURÉE RÈGLEMENT:`);
    console.log(`      Calculated: ${dureeReglementCalculated}j`);
    console.log(`      UI: ${uiDureeReglement}j`);
    console.log(`      ${dureeReglementCalculated === uiDureeReglement ? '✅ MATCH' : '❌ MISMATCH'}`);
    
    console.log(`\n   📊 Status: ${bordereau.statut}`);
    console.log(`   👤 Affecté: ${bordereau.chargeCompte ? bordereau.chargeCompte.fullName : 'NON ASSIGNÉ'}`);
    console.log('\n' + '='.repeat(80) + '\n');
  }

  // Check "En retard" count
  const enRetardCount = await prisma.bordereau.count({
    where: {
      OR: [
        {
          dateReception: {
            lt: new Date(today.getTime() - (9 * 24 * 60 * 60 * 1000)) // More than 9 days ago
          },
          delaiReglement: 9
        },
        {
          dateReception: {
            lt: new Date(today.getTime() - (14 * 24 * 60 * 60 * 1000)) // More than 14 days ago
          },
          delaiReglement: 14
        }
      ],
      statut: {
        notIn: ['PAYE', 'CLOTURE']
      }
    }
  });

  console.log(`\n📊 SUMMARY:`);
  console.log(`   Total Bordereaux: 217`);
  console.log(`   En retard (UI): 212`);
  console.log(`   En retard (Calculated): ${enRetardCount}`);

  await prisma.$disconnect();
}

checkDureeCalculations().catch(console.error);
