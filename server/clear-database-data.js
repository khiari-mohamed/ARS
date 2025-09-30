const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearAllData() {
  console.log('🗑️ Starting database data cleanup...');
  
  try {
    // Delete in order to respect foreign key constraints
    await prisma.documentAssignmentHistory.deleteMany({});
    await prisma.bSLog.deleteMany({});
    await prisma.bulletinSoinItem.deleteMany({});
    await prisma.expertiseInfo.deleteMany({});
    await prisma.bulletinSoin.deleteMany({});
    await prisma.virementItem.deleteMany({});
    await prisma.virementHistorique.deleteMany({});
    await prisma.ordreVirement.deleteMany({});
    await prisma.virement.deleteMany({});
    await prisma.document.deleteMany({});
    await prisma.courrier.deleteMany({});
    await prisma.reclamationHistory.deleteMany({});
    await prisma.reclamation.deleteMany({});
    await prisma.traitementHistory.deleteMany({});
    await prisma.bordereauxAuditLog.deleteMany({});
    await prisma.actionLog.deleteMany({});
    await prisma.bordereau.deleteMany({});
    await prisma.contractHistory.deleteMany({});
    await prisma.contract.deleteMany({});
    await prisma.adherent.deleteMany({});
    await prisma.client.deleteMany({});
    await prisma.donneurOrdre.deleteMany({});
    await prisma.prestataire.deleteMany({});
    await prisma.wireTransferHistory.deleteMany({});
    await prisma.wireTransfer.deleteMany({});
    await prisma.wireTransferBatchHistory.deleteMany({});
    await prisma.wireTransferBatch.deleteMany({});
    await prisma.donneurDOrdre.deleteMany({});
    await prisma.member.deleteMany({});
    await prisma.society.deleteMany({});
    await prisma.workflowAssignmentHistory.deleteMany({});
    await prisma.workflowAssignment.deleteMany({});
    await prisma.workflowNotification.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.alertLog.deleteMany({});
    await prisma.oCRLog.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.passwordResetToken.deleteMany({});
    await prisma.userLockout.deleteMany({});
    await prisma.feedback.deleteMany({});
    await prisma.aILearning.deleteMany({});
    await prisma.performanceAnalysis.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.process.deleteMany({});
    await prisma.syncLog.deleteMany({});
    await prisma.teamWorkloadConfig.deleteMany({});
    await prisma.template.deleteMany({});
    await prisma.gecTemplate.deleteMany({});
    await prisma.reportExecution.deleteMany({});
    await prisma.scheduledReport.deleteMany({});
    await prisma.reportGeneration.deleteMany({});
    await prisma.escalationRule.deleteMany({});
    await prisma.notificationChannel.deleteMany({});
    await prisma.notificationTemplate.deleteMany({});
    await prisma.suiviVirement.deleteMany({});
    await prisma.slaConfiguration.deleteMany({});
    await prisma.teamStructure.deleteMany({});
    await prisma.department.deleteMany({});
    await prisma.systemConfiguration.deleteMany({});
    await prisma.aiOutput.deleteMany({});

    console.log('✅ All data cleared successfully!');
    console.log('📋 Database schema preserved');
    
  } catch (error) {
    console.error('❌ Error clearing data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearAllData();