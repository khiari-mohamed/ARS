/**
 * 🔍 INVESTIGATION SCRIPT: Duplicate Virement Analysis
 * 
 * Purpose: Trace and analyze the exact circumstances of duplicate virement creation
 * to determine if it's a system bug or user error (double creation, Excel drop, etc.)
 * 
 * Usage: node investigate-duplicate-virement.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION - UPDATE THESE WITH THE ACTUAL DUPLICATE REFERENCES
// ═══════════════════════════════════════════════════════════════════════════

const DUPLICATE_REFERENCES = [
  'VIR-20260413-0001',
  'VIR-20260413-0002'
];

// Or search by date range
const SEARCH_BY_DATE = true;
const DATE_FROM = '2026-04-13T00:00:00.000Z';
const DATE_TO = '2026-04-13T23:59:59.999Z';

// ═══════════════════════════════════════════════════════════════════════════
// INVESTIGATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

async function investigateDuplicates() {
  console.log('\n' + '═'.repeat(80));
  console.log('🔍 DUPLICATE VIREMENT INVESTIGATION REPORT');
  console.log('═'.repeat(80) + '\n');
  
  let ordresVirement = [];
  
  // Find the virements to investigate
  if (SEARCH_BY_DATE) {
    console.log(`📅 Searching for virements created between:`);
    console.log(`   From: ${new Date(DATE_FROM).toLocaleString('fr-FR')}`);
    console.log(`   To:   ${new Date(DATE_TO).toLocaleString('fr-FR')}\n`);
    
    ordresVirement = await prisma.ordreVirement.findMany({
      where: {
        createdAt: {
          gte: new Date(DATE_FROM),
          lte: new Date(DATE_TO)
        }
      },
      include: {
        bordereau: {
          include: {
            client: true
          }
        },
        donneurOrdre: true,
        items: {
          include: {
            adherent: {
              include: {
                client: true
              }
            }
          }
        },
        historique: {
          orderBy: { dateAction: 'asc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  } else {
    console.log(`🔎 Searching for specific references: ${DUPLICATE_REFERENCES.join(', ')}\n`);
    
    ordresVirement = await prisma.ordreVirement.findMany({
      where: {
        reference: { in: DUPLICATE_REFERENCES }
      },
      include: {
        bordereau: {
          include: {
            client: true
          }
        },
        donneurOrdre: true,
        items: {
          include: {
            adherent: {
              include: {
                client: true
              }
            }
          }
        },
        historique: {
          orderBy: { dateAction: 'asc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  }
  
  if (ordresVirement.length === 0) {
    console.log('❌ No virements found matching the criteria.\n');
    return;
  }
  
  console.log(`✅ Found ${ordresVirement.length} virement(s) to analyze\n`);
  console.log('─'.repeat(80) + '\n');
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1: BASIC INFORMATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log('📋 STEP 1: BASIC INFORMATION\n');
  
  ordresVirement.forEach((ov, index) => {
    console.log(`[${index + 1}] ${ov.reference}`);
    console.log(`    ID: ${ov.id}`);
    console.log(`    Created: ${ov.createdAt.toLocaleString('fr-FR')}`);
    console.log(`    Bordereau: ${ov.bordereauId || 'NONE (Manual OV)'}`);
    console.log(`    Client: ${ov.bordereau?.client?.name || ov.clientName || 'N/A'}`);
    console.log(`    Donneur Ordre: ${ov.donneurOrdre?.nom || 'N/A'}`);
    console.log(`    Montant: ${ov.montantTotal} TND`);
    console.log(`    Adhérents: ${ov.nombreAdherents}`);
    console.log(`    État: ${ov.etatVirement}`);
    console.log(`    Utilisateur Santé: ${ov.utilisateurSante}`);
    console.log(`    Utilisateur Finance: ${ov.utilisateurFinance || 'N/A'}`);
    console.log('');
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2: DUPLICATE DETECTION
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log('─'.repeat(80) + '\n');
  console.log('🔍 STEP 2: DUPLICATE DETECTION ANALYSIS\n');
  
  // Group by bordereauId
  const byBordereau = {};
  ordresVirement.forEach(ov => {
    const key = ov.bordereauId || 'NO_BORDEREAU';
    if (!byBordereau[key]) byBordereau[key] = [];
    byBordereau[key].push(ov);
  });
  
  let duplicatesFound = false;
  
  Object.entries(byBordereau).forEach(([bordereauId, ovs]) => {
    if (ovs.length > 1) {
      duplicatesFound = true;
      console.log(`🚨 DUPLICATE DETECTED!`);
      console.log(`   Bordereau ID: ${bordereauId}`);
      console.log(`   Number of OVs: ${ovs.length}`);
      console.log(`   References: ${ovs.map(ov => ov.reference).join(', ')}`);
      console.log(`   Time Gap: ${calculateTimeGap(ovs[0].createdAt, ovs[ovs.length - 1].createdAt)}`);
      console.log('');
    }
  });
  
  if (!duplicatesFound) {
    console.log('✅ No duplicates detected (each OV has unique bordereau or is manual)\n');
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3: TIMING ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log('─'.repeat(80) + '\n');
  console.log('⏱️  STEP 3: TIMING ANALYSIS\n');
  
  for (let i = 0; i < ordresVirement.length - 1; i++) {
    const ov1 = ordresVirement[i];
    const ov2 = ordresVirement[i + 1];
    const timeDiff = ov2.createdAt.getTime() - ov1.createdAt.getTime();
    
    console.log(`Between ${ov1.reference} and ${ov2.reference}:`);
    console.log(`   Time difference: ${formatTimeDifference(timeDiff)}`);
    
    if (timeDiff < 1000) {
      console.log(`   ⚠️  SUSPICIOUS: Created within 1 second (possible double-click or race condition)`);
    } else if (timeDiff < 5000) {
      console.log(`   ⚠️  SUSPICIOUS: Created within 5 seconds (possible accidental double submission)`);
    } else if (timeDiff < 60000) {
      console.log(`   ⚠️  POSSIBLE: Created within 1 minute (user might have retried)`);
    } else {
      console.log(`   ✅ LIKELY INTENTIONAL: Significant time gap suggests separate actions`);
    }
    console.log('');
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 4: USER BEHAVIOR ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log('─'.repeat(80) + '\n');
  console.log('👤 STEP 4: USER BEHAVIOR ANALYSIS\n');
  
  // Check if same user created all
  const creators = [...new Set(ordresVirement.map(ov => ov.utilisateurSante))];
  
  console.log(`Number of different creators: ${creators.length}`);
  console.log(`Creator(s): ${creators.join(', ')}\n`);
  
  if (creators.length === 1) {
    console.log(`✅ All virements created by same user: ${creators[0]}`);
    console.log(`   This suggests user error (double-click, Excel drop & retry, etc.)\n`);
  } else {
    console.log(`⚠️  Multiple users created these virements`);
    console.log(`   This is unusual and might indicate a system issue\n`);
  }
  
  // Check user's activity around that time
  console.log('📊 User Activity Timeline:\n');
  
  for (const creator of creators) {
    const userActivity = await prisma.ordreVirement.findMany({
      where: {
        utilisateurSante: creator,
        createdAt: {
          gte: new Date(ordresVirement[0].createdAt.getTime() - 3600000), // 1 hour before
          lte: new Date(ordresVirement[ordresVirement.length - 1].createdAt.getTime() + 3600000) // 1 hour after
        }
      },
      select: {
        id: true,
        reference: true,
        createdAt: true,
        bordereauId: true
      },
      orderBy: { createdAt: 'asc' }
    });
    
    console.log(`   User: ${creator}`);
    console.log(`   Total OVs created in ±1 hour window: ${userActivity.length}`);
    userActivity.forEach(ov => {
      const isDuplicate = DUPLICATE_REFERENCES.includes(ov.reference) || 
                         ordresVirement.some(o => o.reference === ov.reference);
      console.log(`      ${ov.createdAt.toLocaleTimeString('fr-FR')} - ${ov.reference} ${isDuplicate ? '🚨 DUPLICATE' : ''}`);
    });
    console.log('');
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 5: DATA COMPARISON
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log('─'.repeat(80) + '\n');
  console.log('📊 STEP 5: DATA COMPARISON (Are they identical?)\n');
  
  if (ordresVirement.length >= 2) {
    for (let i = 0; i < ordresVirement.length - 1; i++) {
      const ov1 = ordresVirement[i];
      const ov2 = ordresVirement[i + 1];
      
      console.log(`Comparing ${ov1.reference} vs ${ov2.reference}:\n`);
      
      const comparison = {
        'Bordereau ID': [ov1.bordereauId, ov2.bordereauId],
        'Donneur Ordre': [ov1.donneurOrdreId, ov2.donneurOrdreId],
        'Montant Total': [ov1.montantTotal, ov2.montantTotal],
        'Nombre Adhérents': [ov1.nombreAdherents, ov2.nombreAdherents],
        'Utilisateur Santé': [ov1.utilisateurSante, ov2.utilisateurSante],
        'Items Count': [ov1.items.length, ov2.items.length]
      };
      
      let identicalFields = 0;
      let totalFields = 0;
      
      Object.entries(comparison).forEach(([field, [val1, val2]]) => {
        totalFields++;
        const match = JSON.stringify(val1) === JSON.stringify(val2);
        if (match) identicalFields++;
        
        console.log(`   ${field}:`);
        console.log(`      OV1: ${val1}`);
        console.log(`      OV2: ${val2}`);
        console.log(`      ${match ? '✅ IDENTICAL' : '❌ DIFFERENT'}`);
        console.log('');
      });
      
      const similarity = (identicalFields / totalFields * 100).toFixed(1);
      console.log(`   Similarity: ${similarity}% (${identicalFields}/${totalFields} fields match)\n`);
      
      if (similarity >= 80) {
        console.log(`   🚨 HIGH SIMILARITY: These appear to be duplicates!\n`);
      } else {
        console.log(`   ✅ LOW SIMILARITY: These appear to be different virements\n`);
      }
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 6: HISTORY & AUDIT TRAIL
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log('─'.repeat(80) + '\n');
  console.log('📜 STEP 6: HISTORY & AUDIT TRAIL\n');
  
  ordresVirement.forEach((ov, index) => {
    console.log(`[${index + 1}] ${ov.reference} - History:\n`);
    
    if (ov.historique.length === 0) {
      console.log('   ⚠️  No history records found\n');
    } else {
      ov.historique.forEach(h => {
        console.log(`   ${h.dateAction.toLocaleString('fr-FR')} - ${h.action}`);
        console.log(`      User: ${h.utilisateurId}`);
        console.log(`      ${h.ancienEtat || 'N/A'} → ${h.nouvelEtat}`);
        if (h.commentaire) console.log(`      Comment: ${h.commentaire}`);
        console.log('');
      });
    }
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 7: AUDIT LOG ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log('─'.repeat(80) + '\n');
  console.log('🔍 STEP 7: AUDIT LOG ANALYSIS\n');
  
  const userIds = [...new Set(ordresVirement.map(ov => ov.utilisateurSante))];
  
  for (const userId of userIds) {
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        userId: userId,
        timestamp: {
          gte: new Date(ordresVirement[0].createdAt.getTime() - 300000), // 5 min before
          lte: new Date(ordresVirement[ordresVirement.length - 1].createdAt.getTime() + 300000) // 5 min after
        }
      },
      orderBy: { timestamp: 'asc' }
    });
    
    console.log(`User ${userId} - Audit Logs (±5 minutes):\n`);
    
    if (auditLogs.length === 0) {
      console.log('   ⚠️  No audit logs found\n');
    } else {
      auditLogs.forEach(log => {
        console.log(`   ${log.timestamp.toLocaleString('fr-FR')} - ${log.action}`);
        if (log.details) {
          console.log(`      Details: ${JSON.stringify(log.details, null, 2)}`);
        }
        console.log('');
      });
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 8: BORDEREAU ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log('─'.repeat(80) + '\n');
  console.log('📦 STEP 8: BORDEREAU ANALYSIS\n');
  
  const bordereauIds = [...new Set(ordresVirement.map(ov => ov.bordereauId).filter(Boolean))];
  
  for (const bordereauId of bordereauIds) {
    const bordereau = await prisma.bordereau.findUnique({
      where: { id: bordereauId },
      include: {
        client: true,
        documents: true
      }
    });
    
    if (!bordereau) {
      console.log(`   ⚠️  Bordereau ${bordereauId} not found\n`);
      continue;
    }
    
    console.log(`Bordereau: ${bordereau.reference}`);
    console.log(`   ID: ${bordereauId}`);
    console.log(`   Client: ${bordereau.client.name}`);
    console.log(`   Status: ${bordereau.statut}`);
    console.log(`   Created: ${bordereau.dateReception.toLocaleString('fr-FR')}`);
    console.log(`   Documents: ${bordereau.documents.length}`);
    
    // Count how many OVs reference this bordereau
    const ovCount = ordresVirement.filter(ov => ov.bordereauId === bordereauId).length;
    console.log(`   OVs linked: ${ovCount}`);
    
    if (ovCount > 1) {
      console.log(`   🚨 DUPLICATE: Multiple OVs linked to same bordereau!`);
    }
    console.log('');
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 9: CONCLUSION & VERDICT
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log('─'.repeat(80) + '\n');
  console.log('⚖️  STEP 9: CONCLUSION & VERDICT\n');
  
  const verdict = analyzeAndConclude(ordresVirement);
  
  console.log(verdict);
  console.log('');
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 10: RECOMMENDATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log('─'.repeat(80) + '\n');
  console.log('💡 STEP 10: RECOMMENDATIONS\n');
  
  if (duplicatesFound) {
    console.log('🔧 Immediate Actions:\n');
    console.log('   1. Review with the gestionnaire who created these OVs');
    console.log('   2. Check if one should be deleted or marked as invalid');
    console.log('   3. Verify no payments were made twice\n');
    
    console.log('🛡️  Prevention Measures:\n');
    console.log('   1. Implement duplicate check before OV creation (DONE in fix)');
    console.log('   2. Add frontend button disable during creation');
    console.log('   3. Add database unique constraint on bordereauId');
    console.log('   4. Train users on proper workflow\n');
  } else {
    console.log('✅ No duplicates detected in this analysis\n');
  }
  
  console.log('═'.repeat(80) + '\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function calculateTimeGap(date1, date2) {
  const diff = Math.abs(date2.getTime() - date1.getTime());
  return formatTimeDifference(diff);
}

function formatTimeDifference(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(2)}min`;
  return `${(ms / 3600000).toFixed(2)}h`;
}

function analyzeAndConclude(ordresVirement) {
  let conclusion = '';
  
  // Check for duplicates
  const byBordereau = {};
  ordresVirement.forEach(ov => {
    const key = ov.bordereauId || 'NO_BORDEREAU';
    if (!byBordereau[key]) byBordereau[key] = [];
    byBordereau[key].push(ov);
  });
  
  const hasDuplicates = Object.values(byBordereau).some(ovs => ovs.length > 1);
  
  if (!hasDuplicates) {
    conclusion += '✅ VERDICT: NO DUPLICATES DETECTED\n\n';
    conclusion += 'Each OV has a unique bordereau or is a manual entry.\n';
    conclusion += 'This appears to be normal operation.\n';
    return conclusion;
  }
  
  // Analyze timing
  const timeDiffs = [];
  for (let i = 0; i < ordresVirement.length - 1; i++) {
    timeDiffs.push(ordresVirement[i + 1].createdAt.getTime() - ordresVirement[i].createdAt.getTime());
  }
  const avgTimeDiff = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
  
  // Analyze users
  const creators = [...new Set(ordresVirement.map(ov => ov.utilisateurSante))];
  const sameUser = creators.length === 1;
  
  // Make verdict
  conclusion += '🚨 VERDICT: DUPLICATES DETECTED\n\n';
  
  if (avgTimeDiff < 5000 && sameUser) {
    conclusion += '📊 MOST LIKELY CAUSE: User Error (Double-Click / Accidental Retry)\n\n';
    conclusion += 'Evidence:\n';
    conclusion += `   • Same user created all OVs (${creators[0]})\n`;
    conclusion += `   • Very short time gap (avg ${formatTimeDifference(avgTimeDiff)})\n`;
    conclusion += `   • Suggests accidental double submission\n\n`;
    conclusion += '💡 Recommendation: User training + implement frontend button disable\n';
  } else if (avgTimeDiff < 60000 && sameUser) {
    conclusion += '📊 LIKELY CAUSE: User Retry (Excel Drop / Error Recovery)\n\n';
    conclusion += 'Evidence:\n';
    conclusion += `   • Same user created all OVs (${creators[0]})\n`;
    conclusion += `   • Short time gap (avg ${formatTimeDifference(avgTimeDiff)})\n`;
    conclusion += `   • User likely encountered error and retried\n\n`;
    conclusion += '💡 Recommendation: Improve error messages + add duplicate prevention\n';
  } else if (!sameUser) {
    conclusion += '📊 POSSIBLE CAUSE: System Issue (Race Condition)\n\n';
    conclusion += 'Evidence:\n';
    conclusion += `   • Multiple users involved: ${creators.join(', ')}\n`;
    conclusion += `   • This is unusual and suggests system-level issue\n\n`;
    conclusion += '💡 Recommendation: Implement transaction-based duplicate prevention (DONE in fix)\n';
  } else {
    conclusion += '📊 LIKELY CAUSE: Intentional Separate Creations\n\n';
    conclusion += 'Evidence:\n';
    conclusion += `   • Significant time gap (avg ${formatTimeDifference(avgTimeDiff)})\n`;
    conclusion += `   • May be legitimate separate operations\n\n`;
    conclusion += '💡 Recommendation: Verify with user if both were intentional\n';
  }
  
  return conclusion;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  try {
    await investigateDuplicates();
  } catch (error) {
    console.error('❌ Investigation failed:', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();
