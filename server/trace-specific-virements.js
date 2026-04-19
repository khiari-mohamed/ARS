/**
 * 🔍 QUICK INVESTIGATION: VIR-20260413-0001 & VIR-20260413-0002
 * 
 * Purpose: Determine if duplicate creation is code fault or human error
 * 
 * Usage: node trace-specific-virements.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function traceSpecificVirements() {
  console.log('\n' + '═'.repeat(100));
  console.log('🔍 INVESTIGATION: VIR-20260413-0001 & VIR-20260413-0002');
  console.log('═'.repeat(100) + '\n');

  // Fetch the two specific virements
  const virements = await prisma.ordreVirement.findMany({
    where: {
      reference: {
        in: ['VIR-20260413-0001', 'VIR-20260413-0002']
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

  if (virements.length === 0) {
    console.log('❌ No virements found with these references!\n');
    console.log('Possible reasons:');
    console.log('   1. References are incorrect');
    console.log('   2. Virements were deleted');
    console.log('   3. Date format is different (check actual format in DB)\n');
    return;
  }

  console.log(`✅ Found ${virements.length} virement(s)\n`);
  console.log('─'.repeat(100) + '\n');

  // ═══════════════════════════════════════════════════════════════════════════
  // CRITICAL INFORMATION
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('📋 CRITICAL INFORMATION:\n');

  virements.forEach((v, idx) => {
    console.log(`[${idx + 1}] ${v.reference}`);
    console.log(`    ┌─ ID: ${v.id}`);
    console.log(`    ├─ Created: ${v.createdAt.toLocaleString('fr-FR', { 
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3
    })}`);
    console.log(`    ├─ Created By: ${v.utilisateurSante}`);
    console.log(`    ├─ Bordereau: ${v.bordereauId || '❌ NONE (Manual OV)'}`);
    console.log(`    ├─ Client: ${v.bordereau?.client?.name || v.clientName || 'N/A'}`);
    console.log(`    ├─ Montant: ${v.montantTotal} TND`);
    console.log(`    ├─ Adhérents: ${v.nombreAdherents}`);
    console.log(`    ├─ État: ${v.etatVirement}`);
    console.log(`    └─ Items: ${v.items.length} virement items\n`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TIMING ANALYSIS - THE SMOKING GUN
  // ═══════════════════════════════════════════════════════════════════════════

  if (virements.length === 2) {
    console.log('─'.repeat(100) + '\n');
    console.log('⏱️  TIMING ANALYSIS (The Smoking Gun):\n');

    const v1 = virements[0];
    const v2 = virements[1];
    const timeDiffMs = v2.createdAt.getTime() - v1.createdAt.getTime();
    const timeDiffSec = (timeDiffMs / 1000).toFixed(3);

    console.log(`${v1.reference}: ${v1.createdAt.toISOString()}`);
    console.log(`${v2.reference}: ${v2.createdAt.toISOString()}`);
    console.log(`\n⏰ Time Difference: ${timeDiffSec} seconds (${timeDiffMs}ms)\n`);

    // Verdict based on timing
    if (timeDiffMs < 500) {
      console.log('🚨 VERDICT: CODE FAULT (Race Condition)');
      console.log('   Evidence: Created within 500ms - impossible for human action');
      console.log('   Cause: Two simultaneous requests processed at same time');
      console.log('   Solution: Transaction-based duplicate prevention (ALREADY IMPLEMENTED)\n');
    } else if (timeDiffMs < 2000) {
      console.log('🚨 VERDICT: LIKELY CODE FAULT (Double-Click)');
      console.log('   Evidence: Created within 2 seconds - typical double-click behavior');
      console.log('   Cause: User clicked button twice, both requests processed');
      console.log('   Solution: Frontend button disable + backend duplicate check (ALREADY IMPLEMENTED)\n');
    } else if (timeDiffMs < 10000) {
      console.log('⚠️  VERDICT: POSSIBLE USER ERROR (Quick Retry)');
      console.log('   Evidence: Created within 10 seconds - user might have retried');
      console.log('   Cause: User thought first attempt failed, clicked again');
      console.log('   Solution: Better loading indicators + duplicate prevention (ALREADY IMPLEMENTED)\n');
    } else if (timeDiffMs < 60000) {
      console.log('⚠️  VERDICT: LIKELY USER ERROR (Excel Drop & Retry)');
      console.log('   Evidence: Created within 1 minute - typical retry after error');
      console.log('   Cause: User encountered error (Excel drop), retried creation');
      console.log('   Solution: Duplicate prevention + better error messages (ALREADY IMPLEMENTED)\n');
    } else {
      console.log('✅ VERDICT: INTENTIONAL SEPARATE CREATIONS');
      console.log('   Evidence: Significant time gap - likely two separate operations');
      console.log('   Cause: User intentionally created two different OVs');
      console.log('   Action: Verify with user if both were needed\n');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // USER ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('─'.repeat(100) + '\n');
  console.log('👤 USER ANALYSIS:\n');

  const creators = [...new Set(virements.map(v => v.utilisateurSante))];
  
  if (creators.length === 1) {
    console.log(`✅ Same User: ${creators[0]}`);
    console.log('   This indicates user error (double-click, retry, etc.)\n');
    
    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: creators[0] },
      select: { id: true, fullName: true, email: true, role: true }
    });
    
    if (user) {
      console.log(`   User Details:`);
      console.log(`      Name: ${user.fullName}`);
      console.log(`      Email: ${user.email}`);
      console.log(`      Role: ${user.role}\n`);
    }
  } else {
    console.log(`⚠️  Multiple Users: ${creators.join(', ')}`);
    console.log('   This is VERY SUSPICIOUS - suggests system issue!\n');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BORDEREAU ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('─'.repeat(100) + '\n');
  console.log('📦 BORDEREAU ANALYSIS:\n');

  const bordereauIds = [...new Set(virements.map(v => v.bordereauId).filter(Boolean))];

  if (bordereauIds.length === 0) {
    console.log('❌ No bordereau linked - these are MANUAL OVs\n');
  } else if (bordereauIds.length === 1) {
    console.log('🚨 SAME BORDEREAU - DEFINITE DUPLICATE!\n');
    console.log(`   Bordereau ID: ${bordereauIds[0]}`);
    
    const bordereau = await prisma.bordereau.findUnique({
      where: { id: bordereauIds[0] },
      include: { client: true }
    });
    
    if (bordereau) {
      console.log(`   Reference: ${bordereau.reference}`);
      console.log(`   Client: ${bordereau.client.name}`);
      console.log(`   Status: ${bordereau.statut}\n`);
    }
    
    console.log('   ⚠️  CRITICAL: Two OVs should NEVER share the same bordereau!\n');
  } else {
    console.log('✅ Different bordereaux - these are separate OVs\n');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA COMPARISON
  // ═══════════════════════════════════════════════════════════════════════════

  if (virements.length === 2) {
    console.log('─'.repeat(100) + '\n');
    console.log('📊 DATA COMPARISON:\n');

    const v1 = virements[0];
    const v2 = virements[1];

    const fields = [
      ['Bordereau ID', v1.bordereauId, v2.bordereauId],
      ['Donneur Ordre', v1.donneurOrdreId, v2.donneurOrdreId],
      ['Montant', v1.montantTotal, v2.montantTotal],
      ['Nb Adhérents', v1.nombreAdherents, v2.nombreAdherents],
      ['Utilisateur', v1.utilisateurSante, v2.utilisateurSante],
      ['Items Count', v1.items.length, v2.items.length],
      ['État', v1.etatVirement, v2.etatVirement]
    ];

    let matches = 0;
    fields.forEach(([field, val1, val2]) => {
      const match = JSON.stringify(val1) === JSON.stringify(val2);
      if (match) matches++;
      console.log(`   ${field}:`);
      console.log(`      ${v1.reference}: ${val1}`);
      console.log(`      ${v2.reference}: ${val2}`);
      console.log(`      ${match ? '✅ IDENTICAL' : '❌ DIFFERENT'}\n`);
    });

    const similarity = ((matches / fields.length) * 100).toFixed(0);
    console.log(`   Similarity Score: ${similarity}% (${matches}/${fields.length} fields match)\n`);

    if (similarity >= 80) {
      console.log('   🚨 HIGH SIMILARITY - These are DUPLICATES!\n');
    } else {
      console.log('   ✅ LOW SIMILARITY - These might be different OVs\n');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUDIT TRAIL
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('─'.repeat(100) + '\n');
  console.log('📜 AUDIT TRAIL:\n');

  for (const v of virements) {
    console.log(`${v.reference} - History:\n`);
    
    if (v.historique.length === 0) {
      console.log('   ⚠️  No history records\n');
    } else {
      v.historique.forEach(h => {
        console.log(`   ${h.dateAction.toLocaleString('fr-FR')} - ${h.action}`);
        console.log(`      ${h.ancienEtat || 'N/A'} → ${h.nouvelEtat}`);
        if (h.commentaire) console.log(`      Comment: ${h.commentaire}`);
        console.log('');
      });
    }
  }

  // Check audit logs
  const userIds = [...new Set(virements.map(v => v.utilisateurSante))];
  
  for (const userId of userIds) {
    const logs = await prisma.auditLog.findMany({
      where: {
        userId,
        timestamp: {
          gte: new Date(virements[0].createdAt.getTime() - 60000), // 1 min before
          lte: new Date(virements[virements.length - 1].createdAt.getTime() + 60000) // 1 min after
        }
      },
      orderBy: { timestamp: 'asc' }
    });

    if (logs.length > 0) {
      console.log(`Audit Logs for ${userId} (±1 minute):\n`);
      logs.forEach(log => {
        console.log(`   ${log.timestamp.toLocaleString('fr-FR')} - ${log.action}`);
        if (log.details) {
          const details = typeof log.details === 'string' ? log.details : JSON.stringify(log.details);
          console.log(`      ${details}`);
        }
        console.log('');
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FINAL VERDICT
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('─'.repeat(100) + '\n');
  console.log('⚖️  FINAL VERDICT:\n');

  if (virements.length === 2) {
    const v1 = virements[0];
    const v2 = virements[1];
    const timeDiffMs = v2.createdAt.getTime() - v1.createdAt.getTime();
    const sameUser = v1.utilisateurSante === v2.utilisateurSante;
    const sameBordereau = v1.bordereauId && v1.bordereauId === v2.bordereauId;

    console.log('Evidence Summary:');
    console.log(`   • Time Gap: ${(timeDiffMs / 1000).toFixed(3)}s`);
    console.log(`   • Same User: ${sameUser ? '✅ Yes' : '❌ No'}`);
    console.log(`   • Same Bordereau: ${sameBordereau ? '🚨 Yes (DUPLICATE!)' : '✅ No'}`);
    console.log('');

    if (sameBordereau) {
      console.log('🚨 CONCLUSION: DEFINITE DUPLICATE - CODE FAULT\n');
      console.log('Reason: Two OVs linked to same bordereau is NEVER valid\n');
      console.log('Root Cause:');
      if (timeDiffMs < 2000) {
        console.log('   • Race condition or double-click');
        console.log('   • Backend did not check for existing OV before creation\n');
      } else {
        console.log('   • User retried after error (Excel drop, timeout, etc.)');
        console.log('   • Backend did not check for existing OV before creation\n');
      }
      console.log('✅ FIX IMPLEMENTED: Duplicate prevention check added to backend\n');
    } else if (sameUser && timeDiffMs < 10000) {
      console.log('⚠️  CONCLUSION: LIKELY USER ERROR\n');
      console.log('Reason: Same user, short time gap, but different bordereaux\n');
      console.log('Possible Causes:');
      console.log('   • User clicked button twice');
      console.log('   • User thought first attempt failed');
      console.log('   • Excel file was dropped, user retried\n');
      console.log('✅ FIX IMPLEMENTED: Duplicate prevention + better UX\n');
    } else {
      console.log('✅ CONCLUSION: LIKELY INTENTIONAL\n');
      console.log('Reason: Significant time gap or different users\n');
      console.log('Action: Verify with user if both OVs were needed\n');
    }
  }

  console.log('═'.repeat(100) + '\n');
}

async function main() {
  try {
    await traceSpecificVirements();
  } catch (error) {
    console.error('\n❌ Investigation failed:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();
