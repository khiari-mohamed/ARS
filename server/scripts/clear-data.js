const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearAllData() {
  console.log('🗑️  Starting to clear all data...\n');

  try {
    // Delete in correct order to respect foreign key constraints
    
    console.log('Deleting VirementItem...');
    await prisma.virementItem.deleteMany({});
    
    console.log('Deleting VirementHistorique...');
    await prisma.virementHistorique.deleteMany({});
    
    console.log('Deleting SuiviVirement...');
    await prisma.suiviVirement.deleteMany({});
    
    console.log('Deleting OVDocument...');
    await prisma.oVDocument.deleteMany({});
    
    console.log('Deleting OrdreVirement...');
    await prisma.ordreVirement.deleteMany({});
    
    console.log('Deleting AdherentRibHistory...');
    await prisma.adherentRibHistory.deleteMany({});
    
    console.log('Deleting Adherent...');
    await prisma.adherent.deleteMany({});
    
    console.log('Deleting DonneurOrdre...');
    await prisma.donneurOrdre.deleteMany({});
    
    console.log('Deleting WireTransferHistory...');
    await prisma.wireTransferHistory.deleteMany({});
    
    console.log('Deleting WireTransfer...');
    await prisma.wireTransfer.deleteMany({});
    
    console.log('Deleting WireTransferBatchHistory...');
    await prisma.wireTransferBatchHistory.deleteMany({});
    
    console.log('Deleting WireTransferBatch...');
    await prisma.wireTransferBatch.deleteMany({});
    
    console.log('Deleting Member...');
    await prisma.member.deleteMany({});
    
    console.log('Deleting DonneurDOrdre...');
    await prisma.donneurDOrdre.deleteMany({});
    
    console.log('Deleting Society...');
    await prisma.society.deleteMany({});
    
    console.log('Deleting Virement...');
    await prisma.virement.deleteMany({});
    
    console.log('Deleting BulletinSoinItem...');
    await prisma.bulletinSoinItem.deleteMany({});
    
    console.log('Deleting ExpertiseInfo...');
    await prisma.expertiseInfo.deleteMany({});
    
    console.log('Deleting BSLog...');
    await prisma.bSLog.deleteMany({});
    
    console.log('Deleting BulletinSoin...');
    await prisma.bulletinSoin.deleteMany({});
    
    console.log('Deleting ReclamationHistory...');
    await prisma.reclamationHistory.deleteMany({});
    
    console.log('Deleting Reclamation...');
    await prisma.reclamation.deleteMany({});
    
    console.log('Deleting DocumentAssignmentHistory...');
    await prisma.documentAssignmentHistory.deleteMany({});
    
    console.log('Deleting OCRLog...');
    await prisma.oCRLog.deleteMany({});
    
    console.log('Deleting Document...');
    await prisma.document.deleteMany({});
    
    console.log('Deleting Courrier...');
    await prisma.courrier.deleteMany({});
    
    console.log('Deleting TraitementHistory...');
    await prisma.traitementHistory.deleteMany({});
    
    console.log('Deleting BordereauAuditLog...');
    await prisma.bordereauxAuditLog.deleteMany({});
    
    console.log('Deleting ActionLog...');
    await prisma.actionLog.deleteMany({});
    
    console.log('Deleting AlertLog...');
    await prisma.alertLog.deleteMany({});
    
    console.log('Deleting WorkflowNotification...');
    await prisma.workflowNotification.deleteMany({});
    
    console.log('Deleting Bordereau...');
    await prisma.bordereau.deleteMany({});
    
    console.log('Deleting Prestataire...');
    await prisma.prestataire.deleteMany({});
    
    console.log('Deleting ContractHistory...');
    await prisma.contractHistory.deleteMany({});
    
    console.log('Deleting Contract...');
    await prisma.contract.deleteMany({});
    
    console.log('Deleting SlaConfiguration...');
    await prisma.slaConfiguration.deleteMany({});
    
    console.log('Deleting Client...');
    await prisma.client.deleteMany({});
    
    console.log('Deleting CompagnieAssurance...');
    await prisma.compagnieAssurance.deleteMany({});
    
    console.log('Deleting Notification...');
    await prisma.notification.deleteMany({});
    
    console.log('Deleting WorkflowAssignmentHistory...');
    await prisma.workflowAssignmentHistory.deleteMany({});
    
    console.log('Deleting WorkflowAssignment...');
    await prisma.workflowAssignment.deleteMany({});
    
    console.log('Deleting GecTemplate...');
    await prisma.gecTemplate.deleteMany({});
    
    console.log('Deleting Template...');
    await prisma.template.deleteMany({});
    
    console.log('Deleting ReportExecution...');
    await prisma.reportExecution.deleteMany({});
    
    console.log('Deleting ScheduledReport...');
    await prisma.scheduledReport.deleteMany({});
    
    console.log('Deleting ReportGeneration...');
    await prisma.reportGeneration.deleteMany({});
    
    console.log('Deleting PerformanceAnalysis...');
    await prisma.performanceAnalysis.deleteMany({});
    
    console.log('Deleting AILearning...');
    await prisma.aILearning.deleteMany({});
    
    console.log('Deleting AiOutput...');
    await prisma.aiOutput.deleteMany({});
    
    console.log('Deleting Feedback...');
    await prisma.feedback.deleteMany({});
    
    console.log('Deleting AuditLog...');
    await prisma.auditLog.deleteMany({});
    
    console.log('Deleting SyncLog...');
    await prisma.syncLog.deleteMany({});
    
    console.log('Deleting PasswordResetToken...');
    await prisma.passwordResetToken.deleteMany({});
    
    console.log('Deleting UserLockout...');
    await prisma.userLockout.deleteMany({});
    
    console.log('Deleting TeamStructure...');
    await prisma.teamStructure.deleteMany({});
    
    console.log('Deleting User...');
    await prisma.user.deleteMany({});
    
    console.log('Deleting Department...');
    await prisma.department.deleteMany({});
    
    console.log('Deleting Process...');
    await prisma.process.deleteMany({});
    
    console.log('Deleting EscalationRule...');
    await prisma.escalationRule.deleteMany({});
    
    console.log('Deleting NotificationChannel...');
    await prisma.notificationChannel.deleteMany({});
    
    console.log('Deleting NotificationTemplate...');
    await prisma.notificationTemplate.deleteMany({});
    
    console.log('Deleting SystemConfiguration...');
    await prisma.systemConfiguration.deleteMany({});
    
    console.log('Deleting TeamWorkloadConfig...');
    await prisma.teamWorkloadConfig.deleteMany({});

    console.log('\n✅ All data cleared successfully!');
    console.log('📊 All tables are empty but structure is preserved.');
    
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearAllData()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
