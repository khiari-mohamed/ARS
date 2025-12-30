const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectVirementAmounts() {
  console.log('🔍 Inspecting VirementItem amounts...\n');

  const items = await prisma.virementItem.findMany({
    include: {
      adherent: true,
      ordreVirement: true
    },
    orderBy: { id: 'asc' }
  });

  console.log(`Found ${items.length} VirementItem records\n`);
  console.log('═'.repeat(100));

  let totalSum = 0;
  let totalSumMillimes = 0;

  items.forEach((item, index) => {
    const montantDinars = item.montant;
    const montantMillimes = Math.round(montantDinars * 1000);
    
    totalSum += montantDinars;
    totalSumMillimes += montantMillimes;

    console.log(`${index + 1}. ${item.adherent?.nom || 'N/A'} ${item.adherent?.prenom || ''}`);
    console.log(`   Matricule: ${item.adherent?.matricule || 'N/A'}`);
    console.log(`   DB Amount: ${montantDinars} (stored value)`);
    console.log(`   → In Millimes: ${montantMillimes} (after *1000)`);
    console.log(`   → In TND: ${(montantMillimes / 1000).toFixed(3)} TND`);
    console.log(`   Expected in TXT: ${montantMillimes.toString().padStart(15, '0')}`);
    console.log('');
  });

  console.log('═'.repeat(100));
  console.log('\n📊 SUMMARY:');
  console.log(`Total DB Sum: ${totalSum.toFixed(3)}`);
  console.log(`Total in Millimes: ${totalSumMillimes} (${(totalSumMillimes / 1000).toFixed(3)} TND)`);
  console.log(`Expected Header: ${totalSumMillimes.toString().padStart(15, '0')}`);
  
  console.log('\n💡 ANALYSIS:');
  if (totalSum > 10000) {
    console.log('⚠️  WARNING: Amounts seem too large!');
    console.log('   If these should be in dinars (e.g., 111.838 TND), they are 10x too large.');
    console.log('   Suggested fix: Divide all amounts by 10');
  } else if (totalSum < 100) {
    console.log('⚠️  WARNING: Amounts seem too small!');
    console.log('   If these should be in dinars (e.g., 111.838 TND), they are 10x too small.');
    console.log('   Suggested fix: Multiply all amounts by 10');
  } else {
    console.log('✅ Amounts look reasonable for dinars (100-10000 TND range)');
  }

  await prisma.$disconnect();
}

inspectVirementAmounts().catch(console.error);
