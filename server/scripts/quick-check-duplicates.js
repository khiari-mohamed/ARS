/**
 * 🔍 QUICK CHECK: Find All Duplicate Virements
 * 
 * This script quickly identifies all duplicate virements in the database
 * 
 * Usage: node quick-check-duplicates.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function quickCheckDuplicates() {
  console.log('\n🔍 QUICK DUPLICATE CHECK\n');
  console.log('═'.repeat(60) + '\n');
  
  // Find all OVs with bordereauId
  const allOVs = await prisma.ordreVirement.findMany({
    where: {
      bordereauId: { not: null }
    },
    include: {
      bordereau: {
        include: {
          client: true
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  });
  
  console.log(`📊 Total OVs with bordereau: ${allOVs.length}\n`);
  
  // Group by bordereauId
  const grouped = {};
  allOVs.forEach(ov => {
    if (!grouped[ov.bordereauId]) {
      grouped[ov.bordereauId] = [];
    }
    grouped[ov.bordereauId].push(ov);
  });
  
  // Find duplicates
  const duplicates = Object.entries(grouped).filter(([_, ovs]) => ovs.length > 1);
  
  if (duplicates.length === 0) {
    console.log('✅ NO DUPLICATES FOUND!\n');
    console.log('All bordereaux have exactly one OV.\n');
    return;
  }
  
  console.log(`🚨 FOUND ${duplicates.length} BORDEREAU(X) WITH DUPLICATE OVs!\n`);
  console.log('─'.repeat(60) + '\n');
  
  duplicates.forEach(([bordereauId, ovs], index) => {
    const bordereau = ovs[0].bordereau;
    
    console.log(`[${index + 1}] Bordereau: ${bordereau.reference}`);
    console.log(`    Client: ${bordereau.client.name}`);
    console.log(`    Bordereau ID: ${bordereauId}`);
    console.log(`    Number of OVs: ${ovs.length} 🚨\n`);
    
    ovs.forEach((ov, i) => {
      const timeDiff = i > 0 
        ? ((ov.createdAt.getTime() - ovs[i-1].createdAt.getTime()) / 1000).toFixed(2) 
        : 'N/A';
      
      console.log(`    [${i + 1}] ${ov.reference}`);
      console.log(`        Created: ${ov.createdAt.toLocaleString('fr-FR')}`);
      console.log(`        User: ${ov.utilisateurSante}`);
      console.log(`        Montant: ${ov.montantTotal} TND`);
      console.log(`        État: ${ov.etatVirement}`);
      if (i > 0) {
        console.log(`        ⏱️  Time gap: ${timeDiff}s`);
      }
      console.log('');
    });
    
    console.log('─'.repeat(60) + '\n');
  });
  
  // Summary
  console.log('📊 SUMMARY:\n');
  console.log(`   Total bordereaux checked: ${Object.keys(grouped).length}`);
  console.log(`   Bordereaux with duplicates: ${duplicates.length}`);
  console.log(`   Total duplicate OVs: ${duplicates.reduce((sum, [_, ovs]) => sum + ovs.length, 0)}`);
  console.log(`   Extra OVs created: ${duplicates.reduce((sum, [_, ovs]) => sum + (ovs.length - 1), 0)}\n`);
  
  // Timing analysis
  console.log('⏱️  TIMING ANALYSIS:\n');
  
  const allTimeDiffs = [];
  duplicates.forEach(([_, ovs]) => {
    for (let i = 1; i < ovs.length; i++) {
      const diff = (ovs[i].createdAt.getTime() - ovs[i-1].createdAt.getTime()) / 1000;
      allTimeDiffs.push(diff);
    }
  });
  
  if (allTimeDiffs.length > 0) {
    const avgDiff = allTimeDiffs.reduce((a, b) => a + b, 0) / allTimeDiffs.length;
    const minDiff = Math.min(...allTimeDiffs);
    const maxDiff = Math.max(...allTimeDiffs);
    
    console.log(`   Average time gap: ${avgDiff.toFixed(2)}s`);
    console.log(`   Minimum time gap: ${minDiff.toFixed(2)}s`);
    console.log(`   Maximum time gap: ${maxDiff.toFixed(2)}s\n`);
    
    const veryQuick = allTimeDiffs.filter(d => d < 1).length;
    const quick = allTimeDiffs.filter(d => d >= 1 && d < 5).length;
    const medium = allTimeDiffs.filter(d => d >= 5 && d < 60).length;
    const slow = allTimeDiffs.filter(d => d >= 60).length;
    
    console.log('   Distribution:');
    console.log(`      < 1s (double-click):     ${veryQuick} ${veryQuick > 0 ? '🚨' : ''}`);
    console.log(`      1-5s (quick retry):      ${quick} ${quick > 0 ? '⚠️' : ''}`);
    console.log(`      5-60s (error recovery):  ${medium}`);
    console.log(`      > 60s (intentional):     ${slow}\n`);
  }
  
  // User analysis
  console.log('👤 USER ANALYSIS:\n');
  
  const userStats = {};
  duplicates.forEach(([_, ovs]) => {
    ovs.forEach(ov => {
      if (!userStats[ov.utilisateurSante]) {
        userStats[ov.utilisateurSante] = 0;
      }
      userStats[ov.utilisateurSante]++;
    });
  });
  
  Object.entries(userStats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([user, count]) => {
      console.log(`   ${user}: ${count} duplicate OVs`);
    });
  
  console.log('\n' + '═'.repeat(60) + '\n');
  
  // Recommendations
  console.log('💡 RECOMMENDATIONS:\n');
  
  if (allTimeDiffs.some(d => d < 5)) {
    console.log('   🔴 HIGH PRIORITY: Many duplicates created within 5 seconds');
    console.log('      → Implement frontend button disable');
    console.log('      → Add backend duplicate check (DONE in fix)\n');
  }
  
  if (duplicates.length > 0) {
    console.log('   📋 ACTION ITEMS:');
    console.log('      1. Run full investigation: node investigate-duplicate-virement.js');
    console.log('      2. Contact users to verify if duplicates were intentional');
    console.log('      3. Mark extra OVs as invalid or delete them');
    console.log('      4. Deploy duplicate prevention fix\n');
  }
  
  // SQL to find duplicates
  console.log('📝 SQL QUERY TO FIND DUPLICATES:\n');
  console.log('```sql');
  console.log('SELECT ');
  console.log('  "bordereauId",');
  console.log('  COUNT(*) as ov_count,');
  console.log('  STRING_AGG("reference", \', \') as references');
  console.log('FROM "OrdreVirement"');
  console.log('WHERE "bordereauId" IS NOT NULL');
  console.log('GROUP BY "bordereauId"');
  console.log('HAVING COUNT(*) > 1;');
  console.log('```\n');
}

async function main() {
  try {
    await quickCheckDuplicates();
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
