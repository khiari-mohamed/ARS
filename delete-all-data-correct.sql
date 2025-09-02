-- Delete all data from ARS database - correct table names
-- Run this in pgAdmin Query Tool

-- Delete in order to avoid foreign key issues
DELETE FROM "ActionLog";
DELETE FROM "WireTransferHistory";
DELETE FROM "WireTransferBatchHistory";
DELETE FROM "WireTransfer";
DELETE FROM "WireTransferBatch";
DELETE FROM "WorkflowAssignmentHistory";
DELETE FROM "WorkflowAssignment";
DELETE FROM "BordereauAuditLog";
DELETE FROM "BSLog";
DELETE FROM "BulletinSoinItem";
DELETE FROM "BulletinSoin";
DELETE FROM "ExpertiseInfo";
DELETE FROM "ReclamationHistory";
DELETE FROM "_ClientReclamations";
DELETE FROM "_UserBordereaux";
DELETE FROM "TraitementHistory";
DELETE FROM "Reclamation";
DELETE FROM "ContractHistory";
DELETE FROM "Contract";
DELETE FROM "AlertLog";
DELETE FROM "OCRLog";
DELETE FROM "SyncLog";
DELETE FROM "Courrier";
DELETE FROM "Document";
DELETE FROM "Bordereau";
DELETE FROM "Virement";
DELETE FROM "Feedback";
DELETE FROM "AuditLog";
DELETE FROM "PasswordResetToken";
DELETE FROM "UserLockout";
DELETE FROM "_ClientGestionnaires";
DELETE FROM "Client";
DELETE FROM "User";
DELETE FROM "Member";
DELETE FROM "Society";
DELETE FROM "Prestataire";
DELETE FROM "DonneurDOrdre";
DELETE FROM "Process";
DELETE FROM "Template";
DELETE FROM "NotificationTemplate";
DELETE FROM "NotificationChannel";
DELETE FROM "EscalationRule";
DELETE FROM "GecTemplate";
DELETE FROM "ReportGeneration";
DELETE FROM "ReportExecution";
DELETE FROM "ScheduledReport";
DELETE FROM "Notification";

SELECT 'All data deleted successfully!' as status;