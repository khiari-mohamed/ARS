/**
 * 🔍 DIAGNOSTIC: Check ALL bordereaux assignments
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m',
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

async function checkAllAssignments() {
  try {
    log(colors.cyan + colors.bright, '\n🔍 CHECKING ALL BORDEREAU ASSIGNMENTS\n');
    log(colors.cyan, '='.repeat(100));

    const bordereaux = await prisma.bordereau.findMany({
      where: { archived: false },
      include: {
        contract: {
          include: {
            assignedManager: true,
            teamLeader: true,
          }
        },
        currentHandler: true,
      },
      orderBy: { dateReception: 'desc' },
      take: 50,
    });

    log(colors.bright, `\nFound ${bordereaux.length} bordereaux\n`);

    const summary = {
      contractSenior: 0,
      currentHandlerSenior: 0,
      currentHandlerGestionnaire: 0,
      currentHandlerOther: 0,
      notAssigned: 0,
    };

    bordereaux.forEach(b => {
      console.log(`\n📋 ${b.reference} (${b.statut})`);
      
      // Check contract.assignedManager
      if (b.contract?.assignedManager) {
        console.log(`   contract.assignedManager: ${b.contract.assignedManager.fullName} (${b.contract.assignedManager.role})`);
        if (b.contract.assignedManager.role === 'GESTIONNAIRE_SENIOR') {
          log(colors.green, `   ✅ Should show: 👨💼 ${b.contract.assignedManager.fullName}`);
          summary.contractSenior++;
        }
      } else {
        console.log(`   contract.assignedManager: NULL`);
      }

      // Check currentHandler
      if (b.currentHandler) {
        console.log(`   currentHandler: ${b.currentHandler.fullName} (${b.currentHandler.role})`);
        if (b.currentHandler.role === 'GESTIONNAIRE_SENIOR') {
          log(colors.green, `   ✅ Should show: 👨💼 ${b.currentHandler.fullName}`);
          summary.currentHandlerSenior++;
        } else if (b.currentHandler.role === 'GESTIONNAIRE') {
          log(colors.green, `   ✅ Should show: 👤 ${b.currentHandler.fullName}`);
          summary.currentHandlerGestionnaire++;
        } else {
          log(colors.yellow, `   ⚠️  Should show: Non assigné (role: ${b.currentHandler.role})`);
          summary.currentHandlerOther++;
        }
      } else {
        console.log(`   currentHandler: NULL`);
      }

      // Final verdict
      if (!b.contract?.assignedManager && !b.currentHandler) {
        log(colors.red, `   ❌ Should show: Non assigné`);
        summary.notAssigned++;
      } else if (!b.contract?.assignedManager && b.currentHandler && 
                 b.currentHandler.role !== 'GESTIONNAIRE' && 
                 b.currentHandler.role !== 'GESTIONNAIRE_SENIOR') {
        log(colors.red, `   ❌ Should show: Non assigné (currentHandler is ${b.currentHandler.role})`);
      }
    });

    log(colors.cyan, '\n' + '='.repeat(100));
    log(colors.bright, '\n📊 SUMMARY:\n');
    console.log(`   Contract Senior (👨💼):           ${summary.contractSenior}`);
    console.log(`   CurrentHandler Senior (👨💼):     ${summary.currentHandlerSenior}`);
    console.log(`   CurrentHandler Gestionnaire (👤): ${summary.currentHandlerGestionnaire}`);
    console.log(`   CurrentHandler Other (hidden):    ${summary.currentHandlerOther}`);
    console.log(`   Not Assigned:                     ${summary.notAssigned}`);
    console.log(`   Total:                            ${bordereaux.length}\n`);

    // Find specific examples
    log(colors.yellow + colors.bright, '\n🔍 SPECIFIC EXAMPLES:\n');
    
    const withContractSenior = bordereaux.find(b => b.contract?.assignedManager?.role === 'GESTIONNAIRE_SENIOR');
    if (withContractSenior) {
      console.log(`   Contract Senior example: ${withContractSenior.reference} → ${withContractSenior.contract.assignedManager.fullName}`);
    }

    const withCurrentGest = bordereaux.find(b => b.currentHandler?.role === 'GESTIONNAIRE');
    if (withCurrentGest) {
      console.log(`   Gestionnaire example: ${withCurrentGest.reference} → ${withCurrentGest.currentHandler.fullName}`);
    }

    const withOtherRole = bordereaux.find(b => b.currentHandler && b.currentHandler.role !== 'GESTIONNAIRE' && b.currentHandler.role !== 'GESTIONNAIRE_SENIOR');
    if (withOtherRole) {
      console.log(`   Other role example: ${withOtherRole.reference} → ${withOtherRole.currentHandler.fullName} (${withOtherRole.currentHandler.role})`);
    }

  } catch (error) {
    log(colors.red, '❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllAssignments();
