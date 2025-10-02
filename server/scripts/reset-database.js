const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetDatabase() {
  try {
    console.log('🗑️ Resetting database - deleting all data...\n');

    // Delete in correct order to avoid foreign key constraints
    const tables = [
      'DocumentAssignmentHistory',
      'WorkflowNotification', 
      'ActionLog',
      'AlertLog',
      'AuditLog',
      'TraitementHistory',
      'ReclamationHistory',
      'Reclamation',
      'VirementItem',
      'VirementHistorique',
      'OrdreVirement',
      'SuiviVirement',
      'Virement',
      'BulletinSoinItem',
      'ExpertiseInfo',
      'BSLog',
      'BulletinSoin',
      'OCRLog',
      'Document',
      'Courrier',
      'Bordereau',
      'ContractHistory',
      'Contract',
      'Adherent',
      'Client',
      'DonneurOrdre',
      'Notification',
      'WorkflowAssignment',
      'WorkflowAssignmentHistory',
      'GecTemplate',
      'Template',
      'ScheduledReport',
      'ReportExecution',
      'ReportGeneration',
      'EscalationRule',
      'NotificationChannel',
      'NotificationTemplate',
      'SlaConfiguration',
      'Department',
      'TeamStructure',
      'SystemConfiguration',
      'TeamWorkloadConfig',
      'Society',
      'Member',
      'DonneurDOrdre',
      'WireTransferBatch',
      'WireTransfer',
      'WireTransferBatchHistory',
      'WireTransferHistory',
      'SyncLog',
      'UserLockout',
      'PasswordResetToken',
      'Feedback',
      'AiOutput',
      'AILearning',
      'PerformanceAnalysis',
      'Process',
      'Prestataire',
      'BordereauAuditLog',
      'User'
    ];

    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
        console.log(`✅ Cleared table: ${table}`);
      } catch (error) {
        console.log(`⚠️ Could not clear ${table}: ${error.message}`);
      }
    }

    console.log('\n🔄 Resetting sequences...');
    
    // Reset any sequences if needed (PostgreSQL)
    try {
      await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"User"', 'id'), 1, false)`;
    } catch (error) {
      // Ignore sequence reset errors
    }

    console.log('\n✅ Database reset completed!');
    console.log('📋 Schema preserved, all data deleted');
    console.log('\n🎯 Next steps:');
    console.log('1. Create users (super admin, chef d\'équipe, gestionnaires)');
    console.log('2. Create clients');
    console.log('3. Create contracts with teamLeaderId assigned');
    console.log('4. Create bordereaux linked to contracts');
    console.log('5. Test access control');

  } catch (error) {
    console.error('❌ Error resetting database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetDatabase();