/**
 * selective-cleanup.js
 *
 * KEEPS:  User, Client, Contract, ContractHistory, ContractReassignment,
 *         DonneurOrdre, SageConfigStore
 * DELETES everything else
 *
 * Strategy:
 *   1. Disable FK constraint checks for this session
 *   2. TRUNCATE all target tables in one single statement
 *   3. Re-enable FK constraint checks
 *
 * This is instant regardless of data size — no row scanning, no WAL per row,
 * no FK chain resolution overhead.
 *
 * Usage:
 *   node scripts/selective-cleanup.js
 *   NODE_ENV=production node scripts/selective-cleanup.js
 */

require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env',
});

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TABLES = [
  'SageIntegration', 'SageWebhookLog', 'SageTxtGeneration', 'SageTemplate',
  'VirementHistory', 'VirementHistorique', 'SuiviVirement',
  'OVDocument', 'VirementItem', 'OrdreVirement', 'Virement',
  'TraitementHistory', 'BordereauAuditLog', 'ActionLog',
  'WorkflowNotification', 'Courrier',
  'BSLog', 'ExpertiseInfo', 'BulletinSoinItem', 'BulletinSoin',
  'DocumentAssignmentHistory', 'OCRLog', 'AlertLog', 'Document',
  'ReclamationHistory', 'Reclamation',
  'Bordereau',
  'AdherentRibHistory', 'AdherentHistory', 'Adherent',
  'WorkflowAssignmentHistory', 'WorkflowAssignment',
  'AuditLog', 'Notification', 'Feedback',
  'AILearning', 'AiOutput', 'PerformanceAnalysis', 'SyncLog',
  'ReportExecution', 'ScheduledReport', 'ReportGeneration',
  'SlaConfiguration', 'EscalationRule',
  'NotificationChannel', 'NotificationTemplate',
  'GecTemplate', 'Template',
  'TeamStructure', 'TeamWorkloadConfig', 'SystemConfiguration',
  'PasswordResetToken', 'UserLockout',
  'WireTransferHistory', 'WireTransfer',
  'WireTransferBatchHistory', 'WireTransferBatch',
  'Member', 'DonneurDOrdre', 'Society',
  'Prestataire', 'Process', 'CompagnieAssurance', 'Department',
];

async function main() {
  console.log(`\n🔌 Connected to: ${process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ':****@')}`);
  console.log(`🧹 Selective cleanup — ${TABLES.length} tables\n`);

  // ── Step 1: Null FK refs on preserved tables ──────────────────────────────
  process.stdout.write('  [1/3] Clearing FK references on preserved tables... ');
  await prisma.$executeRawUnsafe(`UPDATE "Client" SET "compagnieAssuranceId" = NULL`);
  await prisma.$executeRawUnsafe(`UPDATE "User"   SET "departmentId" = NULL`);
  console.log('✔');

  // ── Step 2: Disable FK checks + TRUNCATE all at once + re-enable ──────────
  process.stdout.write(`  [2/3] Truncating ${TABLES.length} tables (FK checks disabled)... `);
  const start = Date.now();

  await prisma.$transaction([
    // Disable FK enforcement for this session
    prisma.$executeRawUnsafe(`SET session_replication_role = 'replica'`),
    // Single TRUNCATE — no FK resolution needed, instant
    prisma.$executeRawUnsafe(
      `TRUNCATE TABLE ${TABLES.map(t => `"${t}"`).join(', ')} RESTART IDENTITY`
    ),
    // Re-enable FK enforcement
    prisma.$executeRawUnsafe(`SET session_replication_role = 'origin'`),
  ]);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`✔  (${elapsed}s)`);

  // ── Step 3: Final counts ──────────────────────────────────────────────────
  console.log('  [3/3] Verifying preserved data...\n');
  console.log('📦 PRESERVED:');
  console.log('   • User                 :', await prisma.user.count());
  console.log('   • Client               :', await prisma.client.count());
  console.log('   • Contract             :', await prisma.contract.count());
  console.log('   • ContractHistory      :', await prisma.contractHistory.count());
  console.log('   • ContractReassignment :', await prisma.contractReassignment.count());
  console.log('   • DonneurOrdre         :', await prisma.donneurOrdre.count());
  console.log('   • SageConfigStore      :', await prisma.sageConfigStore.count());
  console.log('\n✅ Done.\n');
}

main()
  .catch(async (e) => {
    // Always re-enable FK checks even on failure
    await prisma.$executeRawUnsafe(`SET session_replication_role = 'origin'`).catch(() => {});
    console.error('\n❌ Error during cleanup:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
