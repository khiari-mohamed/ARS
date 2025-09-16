const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyAllTables() {
  console.log('🔍 Checking all database tables...\n');

  const tables = [
    'user', 'process', 'auditLog', 'aiOutput', 'aILearning', 'performanceAnalysis',
    'feedback', 'passwordResetToken', 'userLockout', 'traitementHistory',
    'bordereau', 'prestataire', 'bordereauxAuditLog', 'reclamation', 'reclamationHistory',
    'client', 'contract', 'contractHistory', 'document', 'courrier', 'virement',
    'oCRLog', 'alertLog', 'syncLog', 'bulletinSoin', 'bulletinSoinItem', 'expertiseInfo',
    'bSLog', 'adherent', 'donneurOrdre', 'ordreVirement', 'virementItem', 'virementHistorique',
    'teamWorkloadConfig', 'society', 'member', 'donneurDOrdre', 'wireTransferBatch',
    'wireTransfer', 'wireTransferBatchHistory', 'wireTransferHistory', 'workflowAssignment',
    'template', 'gecTemplate', 'workflowAssignmentHistory', 'actionLog', 'notification',
    'scheduledReport', 'reportExecution', 'reportGeneration', 'escalationRule',
    'notificationChannel', 'notificationTemplate', 'suiviVirement', 'workflowNotification',
    'slaConfiguration', 'department', 'teamStructure', 'systemConfiguration'
  ];

  const results = {
    withData: [],
    empty: [],
    errors: []
  };

  for (const table of tables) {
    try {
      const count = await prisma[table].count();
      if (count > 0) {
        results.withData.push({ table, count });
      } else {
        results.empty.push(table);
      }
    } catch (error) {
      results.errors.push({ table, error: error.message });
    }
  }

  console.log('✅ Tables WITH data:');
  console.log('====================');
  results.withData.forEach(({ table, count }) => {
    console.log(`${table}: ${count} records`);
  });

  console.log('\n❌ Tables WITHOUT data:');
  console.log('========================');
  results.empty.forEach(table => {
    console.log(`${table}: 0 records`);
  });

  if (results.errors.length > 0) {
    console.log('\n⚠️ Tables with errors:');
    console.log('=======================');
    results.errors.forEach(({ table, error }) => {
      console.log(`${table}: ${error}`);
    });
  }

  console.log(`\n📊 Summary:`);
  console.log(`- Tables with data: ${results.withData.length}`);
  console.log(`- Empty tables: ${results.empty.length}`);
  console.log(`- Error tables: ${results.errors.length}`);
  console.log(`- Total tables checked: ${tables.length}`);

  return results;
}

verifyAllTables()
  .catch((e) => {
    console.error('❌ Verification failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());