-- selective-cleanup.sql
--
-- KEEPS:  User, Client, Contract, ContractHistory, ContractReassignment,
--         DonneurOrdre, SageConfigStore
-- DELETES everything else
--
-- Usage:
--   psql postgresql://postgres:PASSWORD@HOST:5432/ars_db -f scripts/selective-cleanup.sql

BEGIN;

-- Null out FK references on preserved tables
UPDATE "Client" SET "compagnieAssuranceId" = NULL;
UPDATE "User"   SET "departmentId" = NULL;

-- Disable FK trigger checks for this session — prevents cascade to preserved tables
SET session_replication_role = 'replica';

TRUNCATE TABLE
  -- Implicit Prisma junction tables
  "_UserBordereaux",
  "_ClientReclamations",
  "_ClientGestionnaires",
  -- Sage / Finance
  "SageIntegration",
  "SageWebhookLog",
  "SageTxtGeneration",
  "SageTemplate",
  "VirementHistory",
  "VirementHistorique",
  "SuiviVirement",
  "OVDocument",
  "VirementItem",
  "OrdreVirement",
  "Virement",
  -- Bordereau pipeline
  "TraitementHistory",
  "BordereauAuditLog",
  "ActionLog",
  "WorkflowNotification",
  "Courrier",
  -- BulletinSoin tree
  "BSLog",
  "ExpertiseInfo",
  "BulletinSoinItem",
  "BulletinSoin",
  -- Document tree
  "DocumentAssignmentHistory",
  "OCRLog",
  "AlertLog",
  "Document",
  -- Reclamation tree
  "ReclamationHistory",
  "Reclamation",
  -- Bordereau
  "Bordereau",
  -- Adherent tree
  "AdherentRibHistory",
  "AdherentHistory",
  "Adherent",
  -- Workflow / misc
  "WorkflowAssignmentHistory",
  "WorkflowAssignment",
  "AuditLog",
  "Notification",
  "Feedback",
  "AILearning",
  "AiOutput",
  "PerformanceAnalysis",
  "SyncLog",
  "ReportExecution",
  "ScheduledReport",
  "ReportGeneration",
  "SlaConfiguration",
  "EscalationRule",
  "NotificationChannel",
  "NotificationTemplate",
  "GecTemplate",
  "Template",
  "TeamStructure",
  "TeamWorkloadConfig",
  "SystemConfiguration",
  "PasswordResetToken",
  "UserLockout",
  -- Secondary wire-transfer module
  "WireTransferHistory",
  "WireTransfer",
  "WireTransferBatchHistory",
  "WireTransferBatch",
  "Member",
  "DonneurDOrdre",
  "Society",
  -- Lookup tables
  "Prestataire",
  "Process",
  "CompagnieAssurance",
  "Department"
RESTART IDENTITY;

-- Re-enable FK trigger checks
SET session_replication_role = 'origin';

COMMIT;

-- Verify preserved data
SELECT 'User'                AS "table", COUNT(*) AS rows FROM "User"
UNION ALL SELECT 'Client',               COUNT(*) FROM "Client"
UNION ALL SELECT 'Contract',             COUNT(*) FROM "Contract"
UNION ALL SELECT 'ContractHistory',      COUNT(*) FROM "ContractHistory"
UNION ALL SELECT 'ContractReassignment', COUNT(*) FROM "ContractReassignment"
UNION ALL SELECT 'DonneurOrdre',         COUNT(*) FROM "DonneurOrdre"
UNION ALL SELECT 'SageConfigStore',      COUNT(*) FROM "SageConfigStore";
