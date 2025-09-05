-- ARS Database Table Count Script
-- Run this in pgAdmin to verify all tables are created

SELECT 
    'Total Tables: ' || COUNT(*) as summary
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name != '_prisma_migrations';

SELECT 
    ROW_NUMBER() OVER (ORDER BY table_name) as "#",
    table_name as "Table Name"
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name != '_prisma_migrations'
ORDER BY table_name;

-- Expected: 42 tables total
-- ActionLog, AlertLog, AuditLog, BSLog, Bordereau, BordereauAuditLog, 
-- BulletinSoin, BulletinSoinItem, Client, Contract, ContractHistory, 
-- Courrier, Document, DonneurDOrdre, EscalationRule, ExpertiseInfo, 
-- Feedback, GecTemplate, Member, Notification, NotificationChannel, 
-- NotificationTemplate, OCRLog, PasswordResetToken, Prestataire, Process, 
-- Reclamation, ReclamationHistory, ReportExecution, ReportGeneration, 
-- ScheduledReport, Society, SyncLog, Template, TraitementHistory, 
-- User, UserLockout, Virement, WireTransfer, WireTransferBatch, 
-- WireTransferBatchHistory, WireTransferHistory, WorkflowAssignment, 
-- WorkflowAssignmentHistory