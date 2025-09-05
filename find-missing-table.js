const { PrismaClient } = require('@prisma/client');

async function findMissingTable() {
  const prisma = new PrismaClient();
  
  // Expected tables from schema
  const expectedTables = [
    'ActionLog', 'AlertLog', 'AuditLog', 'BSLog', 'Bordereau', 'BordereauAuditLog',
    'BulletinSoin', 'BulletinSoinItem', 'Client', 'Contract', 'ContractHistory',
    'Courrier', 'Document', 'DonneurDOrdre', 'EscalationRule', 'ExpertiseInfo',
    'Feedback', 'GecTemplate', 'Member', 'Notification', 'NotificationChannel',
    'NotificationTemplate', 'OCRLog', 'PasswordResetToken', 'Prestataire', 'Process',
    'Reclamation', 'ReclamationHistory', 'ReportExecution', 'ReportGeneration',
    'ScheduledReport', 'Society', 'SyncLog', 'Template', 'TraitementHistory',
    'User', 'UserLockout', 'Virement', 'WireTransfer', 'WireTransferBatch',
    'WireTransferBatchHistory', 'WireTransferHistory', 'WorkflowAssignment',
    'WorkflowAssignmentHistory'
  ];
  
  try {
    // Get actual tables
    const actualTables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name != '_prisma_migrations'
      ORDER BY table_name
    `;
    
    const actualTableNames = actualTables.map(t => t.table_name);
    
    console.log(`Expected: ${expectedTables.length} tables`);
    console.log(`Actual: ${actualTableNames.length} tables\n`);
    
    // Find missing tables
    const missing = expectedTables.filter(table => !actualTableNames.includes(table));
    const extra = actualTableNames.filter(table => !expectedTables.includes(table));
    
    if (missing.length > 0) {
      console.log('❌ MISSING TABLES:');
      missing.forEach(table => console.log(`   - ${table}`));
    }
    
    if (extra.length > 0) {
      console.log('\n➕ EXTRA TABLES:');
      extra.forEach(table => console.log(`   + ${table}`));
    }
    
    if (missing.length === 0 && extra.length === 0) {
      console.log('✅ All tables match!');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findMissingTable();