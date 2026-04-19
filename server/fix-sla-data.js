/**
 * Script to fix SLA data in database for bordereaux with executed virements
 * 
 * This script:
 * 1. Finds bordereaux with VIREMENT_EXECUTE or PAYE status
 * 2. Checks if they have executed OrdreVirement records
 * 3. Recalculates correct SLA based on virement execution date
 * 4. Updates only bordereaux where SLA is currently wrong
 * 
 * SAFE: Only updates bordereaux with executed virements, leaves others untouched
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function calculateCorrectSLA(bordereau) {
  const startDate = new Date(bordereau.dateReception);
  
  // Find latest executed ordre de virement
  const executedOv = (bordereau.ordresVirement || [])
    .filter(ov => ov.etatVirement === 'EXECUTE')
    .sort((a, b) => {
      const dateA = new Date(b.dateEtatFinal || b.dateTraitement || 0);
      const dateB = new Date(a.dateEtatFinal || a.dateTraitement || 0);
      return dateA.getTime() - dateB.getTime();
    })[0];
  
  // Determine freeze date
  const freezeAt = bordereau.dateExecutionVirement ||
                   executedOv?.dateEtatFinal ||
                   executedOv?.dateTraitement ||
                   (['VIREMENT_EXECUTE', 'PAYE'].includes(bordereau.statut) ? bordereau.dateCloture : null);
  
  if (!freezeAt) {
    return null; // No freeze date found
  }
  
  const freezeDate = new Date(freezeAt);
  const daysElapsed = Math.floor((freezeDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const slaThreshold = bordereau.delaiReglement || 30;
  const percentElapsed = (daysElapsed / slaThreshold) * 100;
  
  return {
    daysElapsed,
    percentElapsed,
    freezeDate,
    slaThreshold
  };
}

function getCurrentWrongSLA(bordereau) {
  const now = new Date();
  const startDate = new Date(bordereau.dateReception);
  const daysElapsed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const slaThreshold = bordereau.delaiReglement || 30;
  const percentElapsed = (daysElapsed / slaThreshold) * 100;
  
  return {
    daysElapsed,
    percentElapsed
  };
}

async function fixSLAData(dryRun = true) {
  log('\n========================================', 'cyan');
  log('🔧 SLA Data Fix Script', 'cyan');
  log('========================================\n', 'cyan');
  
  if (dryRun) {
    log('⚠️  DRY RUN MODE - No changes will be made', 'yellow');
    log('Run with --execute flag to apply changes\n', 'yellow');
  } else {
    log('🚨 EXECUTION MODE - Changes will be applied!', 'red');
    log('Press Ctrl+C within 5 seconds to cancel...\n', 'red');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  try {
    // Step 1: Find bordereaux with executed virements
    log('📊 Step 1: Finding bordereaux with executed virements...', 'blue');
    
    const bordereaux = await prisma.bordereau.findMany({
      where: {
        OR: [
          { statut: 'VIREMENT_EXECUTE' },
          { statut: 'PAYE' }
        ]
      },
      include: {
        ordresVirement: true,
        client: {
          select: { name: true }
        }
      },
      orderBy: {
        dateReception: 'asc'
      }
    });
    
    log(`✅ Found ${bordereaux.length} bordereaux with executed virements\n`, 'green');
    
    if (bordereaux.length === 0) {
      log('ℹ️  No bordereaux to fix. Exiting.', 'cyan');
      return;
    }
    
    // Step 2: Analyze each bordereau
    log('📊 Step 2: Analyzing SLA data...', 'blue');
    
    const toFix = [];
    const alreadyCorrect = [];
    const noFreezeDateFound = [];
    
    for (const bordereau of bordereaux) {
      const correctSLA = calculateCorrectSLA(bordereau);
      
      if (!correctSLA) {
        noFreezeDateFound.push({
          id: bordereau.id,
          reference: bordereau.reference,
          statut: bordereau.statut,
          reason: 'No freeze date found'
        });
        continue;
      }
      
      const currentWrongSLA = getCurrentWrongSLA(bordereau);
      
      // Check if SLA is wrong (difference > 1 day)
      const daysDifference = Math.abs(currentWrongSLA.daysElapsed - correctSLA.daysElapsed);
      
      if (daysDifference > 1) {
        toFix.push({
          bordereau,
          correctSLA,
          currentWrongSLA
        });
      } else {
        alreadyCorrect.push({
          id: bordereau.id,
          reference: bordereau.reference
        });
      }
    }
    
    log(`\n📈 Analysis Results:`, 'cyan');
    log(`   ✅ Already correct: ${alreadyCorrect.length}`, 'green');
    log(`   🔧 Need fixing: ${toFix.length}`, 'yellow');
    log(`   ⚠️  No freeze date: ${noFreezeDateFound.length}\n`, 'red');
    
    // Step 3: Display bordereaux that need fixing
    if (toFix.length > 0) {
      log('🔍 Bordereaux that need fixing:', 'yellow');
      log('─'.repeat(120), 'yellow');
      log(
        `${'Reference'.padEnd(20)} | ${'Client'.padEnd(25)} | ${'Status'.padEnd(20)} | ${'Wrong SLA'.padEnd(15)} | ${'Correct SLA'.padEnd(15)} | ${'Freeze Date'.padEnd(12)}`,
        'yellow'
      );
      log('─'.repeat(120), 'yellow');
      
      toFix.forEach(({ bordereau, correctSLA, currentWrongSLA }) => {
        const wrongStatus = currentWrongSLA.percentElapsed > 100 ? '🔴 OVERDUE' : 
                           currentWrongSLA.percentElapsed > 80 ? '🟡 AT_RISK' : '🟢 ON_TIME';
        const correctStatus = correctSLA.percentElapsed > 100 ? '🔴 OVERDUE' : 
                             correctSLA.percentElapsed > 80 ? '🟡 AT_RISK' : '🟢 ON_TIME';
        
        log(
          `${bordereau.reference.padEnd(20)} | ${(bordereau.client?.name || 'N/A').substring(0, 25).padEnd(25)} | ${bordereau.statut.padEnd(20)} | ${`${currentWrongSLA.daysElapsed}d ${wrongStatus}`.padEnd(15)} | ${`${correctSLA.daysElapsed}d ${correctStatus}`.padEnd(15)} | ${correctSLA.freezeDate.toISOString().split('T')[0].padEnd(12)}`,
          'yellow'
        );
      });
      log('─'.repeat(120) + '\n', 'yellow');
    }
    
    // Step 4: Display bordereaux with no freeze date
    if (noFreezeDateFound.length > 0) {
      log('⚠️  Bordereaux with no freeze date found (will be skipped):', 'red');
      noFreezeDateFound.forEach(item => {
        log(`   - ${item.reference} (${item.statut}): ${item.reason}`, 'red');
      });
      log('');
    }
    
    // Step 5: Apply fixes (if not dry run)
    if (!dryRun && toFix.length > 0) {
      log('🔧 Step 3: Applying fixes...', 'blue');
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const { bordereau, correctSLA } of toFix) {
        try {
          // Note: We don't actually store daysElapsed in the database
          // The fix is in the code (already done), this script just validates
          // But we can update dateExecutionVirement if it's missing
          
          if (!bordereau.dateExecutionVirement && correctSLA.freezeDate) {
            await prisma.bordereau.update({
              where: { id: bordereau.id },
              data: {
                dateExecutionVirement: correctSLA.freezeDate
              }
            });
            
            log(`   ✅ Fixed ${bordereau.reference}: Set dateExecutionVirement to ${correctSLA.freezeDate.toISOString().split('T')[0]}`, 'green');
            successCount++;
          } else {
            log(`   ℹ️  ${bordereau.reference}: dateExecutionVirement already set, no DB update needed`, 'cyan');
            successCount++;
          }
        } catch (error) {
          log(`   ❌ Error fixing ${bordereau.reference}: ${error.message}`, 'red');
          errorCount++;
        }
      }
      
      log(`\n✅ Fix completed:`, 'green');
      log(`   Success: ${successCount}`, 'green');
      log(`   Errors: ${errorCount}`, errorCount > 0 ? 'red' : 'green');
    } else if (dryRun && toFix.length > 0) {
      log('ℹ️  Dry run complete. Run with --execute to apply changes.', 'cyan');
    } else {
      log('✅ All bordereaux already have correct SLA data!', 'green');
    }
    
    // Step 6: Summary
    log('\n========================================', 'cyan');
    log('📊 Summary', 'cyan');
    log('========================================', 'cyan');
    log(`Total bordereaux analyzed: ${bordereaux.length}`, 'cyan');
    log(`Already correct: ${alreadyCorrect.length}`, 'green');
    log(`Fixed (or would fix): ${toFix.length}`, 'yellow');
    log(`Skipped (no freeze date): ${noFreezeDateFound.length}`, 'red');
    log('========================================\n', 'cyan');
    
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');

// Run the script
fixSLAData(dryRun)
  .then(() => {
    log('✅ Script completed successfully!', 'green');
    process.exit(0);
  })
  .catch((error) => {
    log(`❌ Script failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });
