-- CreateEnum
CREATE TYPE "EtatVirement" AS ENUM ('NON_EXECUTE', 'EN_COURS_EXECUTION', 'EXECUTE_PARTIELLEMENT', 'REJETE', 'BLOQUE', 'EXECUTE', 'EN_COURS_VALIDATION', 'VIREMENT_NON_VALIDE', 'VIREMENT_DEPOSE');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('UPLOADED', 'EN_COURS', 'SCANNE', 'TRAITE', 'REJETE', 'RETOUR_ADMIN', 'RETOURNER_AU_SCAN');

-- CreateEnum
CREATE TYPE "Statut" AS ENUM ('EN_ATTENTE', 'A_SCANNER', 'SCAN_EN_COURS', 'SCANNE', 'A_AFFECTER', 'ASSIGNE', 'EN_COURS', 'TRAITE', 'PRET_VIREMENT', 'VIREMENT_EN_COURS', 'VIREMENT_EXECUTE', 'VIREMENT_REJETE', 'CLOTURE', 'PAYE', 'EN_DIFFICULTE', 'PARTIEL', 'MIS_EN_INSTANCE', 'REJETE', 'RETOURNE');

-- CreateEnum
CREATE TYPE "CourrierType" AS ENUM ('REGLEMENT', 'RELANCE', 'RECLAMATION', 'AUTRE');

-- CreateEnum
CREATE TYPE "CourrierStatus" AS ENUM ('DRAFT', 'SENT', 'FAILED', 'PENDING_RESPONSE', 'RESPONDED');

-- CreateEnum
CREATE TYPE "WireTransferBatchStatus" AS ENUM ('CREATED', 'VALIDATED', 'REJECTED', 'ARCHIVED', 'PROCESSED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('BULLETIN_SOIN', 'COMPLEMENT_INFORMATION', 'ADHESION', 'RECLAMATION', 'CONTRAT_AVENANT', 'DEMANDE_RESILIATION', 'CONVENTION_TIERS_PAYANT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "department" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "capacity" INTEGER NOT NULL DEFAULT 20,
    "departmentId" TEXT,
    "serviceType" TEXT,
    "teamLeaderId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Process" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Process_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiOutput" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "inputData" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "userId" TEXT NOT NULL,
    "confidence" DECIMAL(5,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiOutput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AILearning" (
    "id" TEXT NOT NULL,
    "analysisType" TEXT NOT NULL,
    "inputPattern" TEXT NOT NULL,
    "expectedOutput" TEXT NOT NULL,
    "actualOutput" TEXT NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "feedback" INTEGER,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AILearning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceAnalysis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "analysisDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rootCauses" TEXT,
    "bottlenecks" TEXT,
    "trainingNeeds" TEXT,
    "recommendations" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PerformanceAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "page" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLockout" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLockout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TraitementHistory" (
    "id" TEXT NOT NULL,
    "bordereauId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TraitementHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bordereau" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "contractId" TEXT,
    "type" "DocumentType" NOT NULL DEFAULT 'BULLETIN_SOIN',
    "dateReception" TIMESTAMP(3) NOT NULL,
    "dateDebutScan" TIMESTAMP(3),
    "dateFinScan" TIMESTAMP(3),
    "dateReceptionSante" TIMESTAMP(3),
    "dateCloture" TIMESTAMP(3),
    "dateDepotVirement" TIMESTAMP(3),
    "dateExecutionVirement" TIMESTAMP(3),
    "delaiReglement" INTEGER NOT NULL,
    "statut" "Statut" NOT NULL DEFAULT 'EN_ATTENTE',
    "nombreBS" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "currentHandlerId" TEXT,
    "teamId" TEXT,
    "assignedToUserId" TEXT,
    "prestataireId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "chargeCompteId" TEXT,
    "dateLimiteTraitement" TIMESTAMP(3),
    "dateReceptionBO" TIMESTAMP(3),
    "dateReceptionEquipeSante" TIMESTAMP(3),
    "dateReelleCloture" TIMESTAMP(3),
    "nombreJourTraitement" INTEGER,
    "scanStatus" TEXT NOT NULL DEFAULT 'NON_SCANNE',
    "completionRate" INTEGER NOT NULL DEFAULT 0,
    "documentStatus" TEXT DEFAULT 'NORMAL',

    CONSTRAINT "Bordereau_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prestataire" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Prestataire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BordereauAuditLog" (
    "id" TEXT NOT NULL,
    "bordereauId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "userId" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BordereauAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reclamation" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "documentId" TEXT,
    "bordereauId" TEXT,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "assignedToId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "evidencePath" TEXT,
    "contractId" TEXT,
    "department" TEXT,
    "processId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "typologie" TEXT,
    "conformite" TEXT,
    "conformiteUpdatedBy" TEXT,
    "conformiteUpdatedAt" TIMESTAMP(3),

    CONSTRAINT "Reclamation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReclamationHistory" (
    "id" TEXT NOT NULL,
    "reclamationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aiSuggestions" JSONB,
    "isRecurrent" BOOLEAN DEFAULT false,

    CONSTRAINT "ReclamationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reglementDelay" INTEGER NOT NULL,
    "reclamationDelay" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "slaConfig" JSONB,
    "address" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "chargeCompteId" TEXT,
    "contractDocumentPath" TEXT,
    "compagnieAssuranceId" TEXT,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompagnieAssurance" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "adresse" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'ACTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompagnieAssurance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "assignedManagerId" TEXT,
    "teamLeaderId" TEXT,
    "clientId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "codeAssure" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delaiReclamation" INTEGER NOT NULL,
    "delaiReglement" INTEGER NOT NULL,
    "documentPath" TEXT NOT NULL,
    "escalationThreshold" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "signature" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "thresholds" JSONB,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractHistory" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "modifiedById" TEXT NOT NULL,
    "modifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changes" JSONB NOT NULL,

    CONSTRAINT "ContractHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL DEFAULT 'BULLETIN_SOIN',
    "path" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedById" TEXT NOT NULL,
    "bordereauId" TEXT,
    "ocrResult" JSONB,
    "ocrText" TEXT,
    "status" "DocumentStatus",
    "hash" TEXT,
    "barcodeValues" TEXT[],
    "batchId" TEXT,
    "colorMode" TEXT,
    "imprinterIds" TEXT[],
    "ingestStatus" TEXT,
    "ingestTimestamp" TIMESTAMP(3),
    "operatorId" TEXT,
    "pageCount" INTEGER,
    "resolution" INTEGER,
    "scannerModel" TEXT,
    "assignedToUserId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "assignedByUserId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "slaApplicable" BOOLEAN NOT NULL DEFAULT true,
    "statusModifiedByGestionnaire" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Courrier" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" "CourrierType" NOT NULL,
    "templateUsed" TEXT NOT NULL,
    "status" "CourrierStatus" NOT NULL,
    "sentAt" TIMESTAMP(3),
    "responseAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bordereauId" TEXT,
    "uploadedById" TEXT NOT NULL,

    CONSTRAINT "Courrier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Virement" (
    "id" TEXT NOT NULL,
    "bordereauId" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "referenceBancaire" TEXT NOT NULL,
    "dateDepot" TIMESTAMP(3) NOT NULL,
    "dateExecution" TIMESTAMP(3) NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmedById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "priority" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Virement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OCRLog" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "processedById" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "ocrAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OCRLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertLog" (
    "id" TEXT NOT NULL,
    "bordereauId" TEXT,
    "documentId" TEXT,
    "userId" TEXT,
    "alertType" TEXT NOT NULL,
    "alertLevel" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "notifiedRoles" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "AlertLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "imported" INTEGER NOT NULL,
    "errors" INTEGER NOT NULL,
    "details" TEXT,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulletinSoin" (
    "id" TEXT NOT NULL,
    "bordereauId" TEXT NOT NULL,
    "numBs" TEXT NOT NULL,
    "etat" TEXT NOT NULL,
    "ownerId" TEXT,
    "processedAt" TIMESTAMP(3),
    "codeAssure" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateCreation" TIMESTAMP(3) NOT NULL,
    "dateMaladie" TIMESTAMP(3) NOT NULL,
    "lien" TEXT NOT NULL,
    "nomAssure" TEXT NOT NULL,
    "nomBeneficiaire" TEXT NOT NULL,
    "nomBordereau" TEXT NOT NULL,
    "nomPrestation" TEXT NOT NULL,
    "nomSociete" TEXT NOT NULL,
    "observationGlobal" TEXT NOT NULL,
    "ocrText" TEXT,
    "totalPec" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "acte" TEXT,
    "dateSoin" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "matricule" TEXT,
    "montant" DOUBLE PRECISION,
    "dueDate" TIMESTAMP(3),
    "processedById" TEXT,
    "virementId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "BulletinSoin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulletinSoinItem" (
    "id" TEXT NOT NULL,
    "bulletinSoinId" TEXT NOT NULL,
    "nomProduit" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "commentaire" TEXT NOT NULL,
    "nomChapitre" TEXT NOT NULL,
    "nomPrestataire" TEXT NOT NULL,
    "datePrestation" TIMESTAMP(3) NOT NULL,
    "typeHonoraire" TEXT NOT NULL,
    "depense" DOUBLE PRECISION NOT NULL,
    "pec" DOUBLE PRECISION NOT NULL,
    "participationAdherent" DOUBLE PRECISION NOT NULL,
    "message" TEXT NOT NULL,
    "codeMessage" TEXT NOT NULL,
    "acuiteDroite" DOUBLE PRECISION NOT NULL,
    "acuiteGauche" DOUBLE PRECISION NOT NULL,
    "nombreCle" TEXT NOT NULL,
    "nbJourDepassement" INTEGER NOT NULL,

    CONSTRAINT "BulletinSoinItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpertiseInfo" (
    "id" TEXT NOT NULL,
    "bulletinSoinId" TEXT NOT NULL,
    "isFavorable" TEXT NOT NULL,
    "matriculeAdherent" TEXT NOT NULL,
    "numBS" TEXT NOT NULL,
    "contrat" TEXT NOT NULL,
    "cin" TEXT NOT NULL,
    "vlodsphere" DOUBLE PRECISION,
    "vpogsphere" DOUBLE PRECISION,
    "prixMonture" DOUBLE PRECISION,
    "codification" TEXT,
    "natureActe" TEXT,
    "societe" TEXT,
    "dents" TEXT,

    CONSTRAINT "ExpertiseInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BSLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bsId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BSLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Adherent" (
    "id" TEXT NOT NULL,
    "matricule" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "rib" TEXT NOT NULL,
    "codeAssure" TEXT,
    "numeroContrat" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'ACTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Adherent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdherentRibHistory" (
    "id" TEXT NOT NULL,
    "adherentId" TEXT NOT NULL,
    "oldRib" TEXT NOT NULL,
    "newRib" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdherentRibHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonneurOrdre" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "rib" TEXT NOT NULL,
    "banque" TEXT NOT NULL,
    "agence" TEXT,
    "address" TEXT,
    "structureTxt" TEXT NOT NULL,
    "formatTxtType" TEXT NOT NULL DEFAULT 'STRUCTURE_1',
    "signaturePath" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'ACTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DonneurOrdre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdreVirement" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "donneurOrdreId" TEXT NOT NULL,
    "bordereauId" TEXT,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateTraitement" TIMESTAMP(3),
    "utilisateurSante" TEXT NOT NULL,
    "utilisateurFinance" TEXT,
    "etatVirement" "EtatVirement" NOT NULL DEFAULT 'NON_EXECUTE',
    "dateEtatFinal" TIMESTAMP(3),
    "commentaire" TEXT,
    "montantTotal" DOUBLE PRECISION NOT NULL,
    "nombreAdherents" INTEGER NOT NULL,
    "fichierPdf" TEXT,
    "fichierTxt" TEXT,
    "uploadedPdfPath" TEXT,
    "demandeRecuperation" BOOLEAN NOT NULL DEFAULT false,
    "dateDemandeRecuperation" TIMESTAMP(3),
    "montantRecupere" BOOLEAN NOT NULL DEFAULT false,
    "dateMontantRecupere" TIMESTAMP(3),
    "motifObservation" TEXT,
    "validationStatus" TEXT NOT NULL DEFAULT 'EN_ATTENTE_VALIDATION',
    "validatedBy" TEXT,
    "validatedAt" TIMESTAMP(3),
    "validationComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrdreVirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VirementItem" (
    "id" TEXT NOT NULL,
    "ordreVirementId" TEXT NOT NULL,
    "adherentId" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'VALIDE',
    "erreur" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VirementItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VirementHistorique" (
    "id" TEXT NOT NULL,
    "ordreVirementId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "ancienEtat" TEXT,
    "nouvelEtat" TEXT,
    "utilisateurId" TEXT,
    "commentaire" TEXT,
    "dateAction" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VirementHistorique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamWorkloadConfig" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "maxLoad" INTEGER NOT NULL,
    "autoReassignEnabled" BOOLEAN NOT NULL DEFAULT true,
    "overflowAction" TEXT NOT NULL DEFAULT 'ROUND_ROBIN',
    "alertThreshold" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamWorkloadConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Society" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Society_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rib" TEXT NOT NULL,
    "cin" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonneurDOrdre" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rib" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DonneurDOrdre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WireTransferBatch" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "donneurId" TEXT NOT NULL,
    "status" "WireTransferBatchStatus" NOT NULL DEFAULT 'CREATED',
    "fileName" TEXT,
    "fileType" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WireTransferBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WireTransfer" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "donneurId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reference" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WireTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WireTransferBatchHistory" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "status" "WireTransferBatchStatus" NOT NULL,
    "changedBy" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WireTransferBatchHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WireTransferHistory" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "changedBy" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WireTransferHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowAssignment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,

    CONSTRAINT "WorkflowAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "variables" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GecTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'EMAIL',
    "category" TEXT NOT NULL DEFAULT 'General',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GecTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowAssignmentHistory" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "updatedByUserId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prevStatus" TEXT,
    "newStatus" TEXT,
    "prevNotes" TEXT,
    "newNotes" TEXT,
    "slaMet" BOOLEAN,

    CONSTRAINT "WorkflowAssignmentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionLog" (
    "id" TEXT NOT NULL,
    "bordereauId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSONB,

    CONSTRAINT "ActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledReport" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'dashboard',
    "dataSource" TEXT NOT NULL DEFAULT 'bordereaux',
    "frequency" TEXT NOT NULL DEFAULT 'daily',
    "executionTime" TEXT NOT NULL DEFAULT '08:00',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "format" TEXT NOT NULL DEFAULT 'pdf',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "recipients" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportExecution" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'running',
    "fileSize" INTEGER,
    "error" TEXT,

    CONSTRAINT "ReportExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportGeneration" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "parameters" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'generating',
    "filename" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ReportGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscalationRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "conditions" JSONB,
    "escalationPath" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscalationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationChannel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "rateLimits" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "variables" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuiviVirement" (
    "id" TEXT NOT NULL,
    "numeroBordereau" TEXT NOT NULL,
    "societe" TEXT NOT NULL,
    "dateInjection" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "utilisateurSante" TEXT NOT NULL,
    "dateTraitement" TIMESTAMP(3),
    "utilisateurFinance" TEXT,
    "etatVirement" TEXT NOT NULL DEFAULT 'NON_EXECUTE',
    "dateEtatFinal" TIMESTAMP(3),
    "commentaire" TEXT,
    "ordreVirementId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuiviVirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowNotification" (
    "id" TEXT NOT NULL,
    "fromService" TEXT NOT NULL,
    "toService" TEXT NOT NULL,
    "bordereauId" TEXT,
    "documentId" TEXT,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlaConfiguration" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "moduleType" TEXT NOT NULL,
    "seuils" JSONB NOT NULL,
    "alertes" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlaConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamStructure" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "parentTeamId" TEXT,
    "leaderId" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfiguration" (
    "id" TEXT NOT NULL,
    "configKey" TEXT NOT NULL,
    "configValue" JSONB NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentAssignmentHistory" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "assignedToUserId" TEXT,
    "assignedByUserId" TEXT NOT NULL,
    "fromUserId" TEXT,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentAssignmentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OVDocument" (
    "id" TEXT NOT NULL,
    "ordreVirementId" TEXT NOT NULL,
    "bordereauId" TEXT,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'BORDEREAU_PDF',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedById" TEXT NOT NULL,

    CONSTRAINT "OVDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_UserBordereaux" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserBordereaux_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ClientReclamations" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ClientReclamations_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ClientGestionnaires" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ClientGestionnaires_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "AiOutput_endpoint_idx" ON "AiOutput"("endpoint");

-- CreateIndex
CREATE INDEX "AiOutput_userId_idx" ON "AiOutput"("userId");

-- CreateIndex
CREATE INDEX "AiOutput_createdAt_idx" ON "AiOutput"("createdAt");

-- CreateIndex
CREATE INDEX "AiOutput_confidence_idx" ON "AiOutput"("confidence");

-- CreateIndex
CREATE INDEX "AiOutput_endpoint_confidence_idx" ON "AiOutput"("endpoint", "confidence");

-- CreateIndex
CREATE INDEX "AILearning_analysisType_createdAt_idx" ON "AILearning"("analysisType", "createdAt");

-- CreateIndex
CREATE INDEX "PerformanceAnalysis_userId_analysisDate_idx" ON "PerformanceAnalysis"("userId", "analysisDate");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "UserLockout_email_key" ON "UserLockout"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Bordereau_reference_key" ON "Bordereau"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Client_name_key" ON "Client"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CompagnieAssurance_nom_key" ON "CompagnieAssurance"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "CompagnieAssurance_code_key" ON "CompagnieAssurance"("code");

-- CreateIndex
CREATE INDEX "Contract_codeAssure_idx" ON "Contract"("codeAssure");

-- CreateIndex
CREATE UNIQUE INDEX "Document_hash_key" ON "Document"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "Virement_bordereauId_key" ON "Virement"("bordereauId");

-- CreateIndex
CREATE INDEX "Adherent_rib_idx" ON "Adherent"("rib");

-- CreateIndex
CREATE INDEX "Adherent_codeAssure_idx" ON "Adherent"("codeAssure");

-- CreateIndex
CREATE INDEX "Adherent_matricule_clientId_idx" ON "Adherent"("matricule", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Adherent_matricule_clientId_key" ON "Adherent"("matricule", "clientId");

-- CreateIndex
CREATE INDEX "AdherentRibHistory_adherentId_idx" ON "AdherentRibHistory"("adherentId");

-- CreateIndex
CREATE INDEX "AdherentRibHistory_updatedAt_idx" ON "AdherentRibHistory"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrdreVirement_reference_key" ON "OrdreVirement"("reference");

-- CreateIndex
CREATE INDEX "OrdreVirement_etatVirement_idx" ON "OrdreVirement"("etatVirement");

-- CreateIndex
CREATE INDEX "OrdreVirement_validationStatus_idx" ON "OrdreVirement"("validationStatus");

-- CreateIndex
CREATE INDEX "OrdreVirement_demandeRecuperation_montantRecupere_idx" ON "OrdreVirement"("demandeRecuperation", "montantRecupere");

-- CreateIndex
CREATE UNIQUE INDEX "Society_name_key" ON "Society"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Society_code_key" ON "Society"("code");

-- CreateIndex
CREATE INDEX "ActionLog_bordereauId_idx" ON "ActionLog"("bordereauId");

-- CreateIndex
CREATE INDEX "ActionLog_timestamp_idx" ON "ActionLog"("timestamp");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_read_idx" ON "Notification"("read");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "EscalationRule_alertType_idx" ON "EscalationRule"("alertType");

-- CreateIndex
CREATE INDEX "EscalationRule_active_idx" ON "EscalationRule"("active");

-- CreateIndex
CREATE INDEX "NotificationChannel_type_idx" ON "NotificationChannel"("type");

-- CreateIndex
CREATE INDEX "NotificationChannel_active_idx" ON "NotificationChannel"("active");

-- CreateIndex
CREATE INDEX "NotificationTemplate_channel_idx" ON "NotificationTemplate"("channel");

-- CreateIndex
CREATE INDEX "NotificationTemplate_active_idx" ON "NotificationTemplate"("active");

-- CreateIndex
CREATE INDEX "SuiviVirement_numeroBordereau_idx" ON "SuiviVirement"("numeroBordereau");

-- CreateIndex
CREATE INDEX "SuiviVirement_etatVirement_idx" ON "SuiviVirement"("etatVirement");

-- CreateIndex
CREATE INDEX "WorkflowNotification_status_idx" ON "WorkflowNotification"("status");

-- CreateIndex
CREATE INDEX "WorkflowNotification_type_idx" ON "WorkflowNotification"("type");

-- CreateIndex
CREATE INDEX "SlaConfiguration_clientId_idx" ON "SlaConfiguration"("clientId");

-- CreateIndex
CREATE INDEX "SlaConfiguration_moduleType_idx" ON "SlaConfiguration"("moduleType");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE INDEX "Department_serviceType_idx" ON "Department"("serviceType");

-- CreateIndex
CREATE INDEX "Department_active_idx" ON "Department"("active");

-- CreateIndex
CREATE INDEX "TeamStructure_serviceType_idx" ON "TeamStructure"("serviceType");

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfiguration_configKey_key" ON "SystemConfiguration"("configKey");

-- CreateIndex
CREATE INDEX "SystemConfiguration_configKey_idx" ON "SystemConfiguration"("configKey");

-- CreateIndex
CREATE INDEX "DocumentAssignmentHistory_documentId_idx" ON "DocumentAssignmentHistory"("documentId");

-- CreateIndex
CREATE INDEX "DocumentAssignmentHistory_assignedToUserId_idx" ON "DocumentAssignmentHistory"("assignedToUserId");

-- CreateIndex
CREATE INDEX "DocumentAssignmentHistory_createdAt_idx" ON "DocumentAssignmentHistory"("createdAt");

-- CreateIndex
CREATE INDEX "OVDocument_ordreVirementId_idx" ON "OVDocument"("ordreVirementId");

-- CreateIndex
CREATE INDEX "OVDocument_bordereauId_idx" ON "OVDocument"("bordereauId");

-- CreateIndex
CREATE INDEX "_UserBordereaux_B_index" ON "_UserBordereaux"("B");

-- CreateIndex
CREATE INDEX "_ClientReclamations_B_index" ON "_ClientReclamations"("B");

-- CreateIndex
CREATE INDEX "_ClientGestionnaires_B_index" ON "_ClientGestionnaires"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teamLeaderId_fkey" FOREIGN KEY ("teamLeaderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AILearning" ADD CONSTRAINT "AILearning_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceAnalysis" ADD CONSTRAINT "PerformanceAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraitementHistory" ADD CONSTRAINT "TraitementHistory_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraitementHistory" ADD CONSTRAINT "TraitementHistory_bordereauId_fkey" FOREIGN KEY ("bordereauId") REFERENCES "Bordereau"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraitementHistory" ADD CONSTRAINT "TraitementHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bordereau" ADD CONSTRAINT "Bordereau_chargeCompteId_fkey" FOREIGN KEY ("chargeCompteId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bordereau" ADD CONSTRAINT "Bordereau_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bordereau" ADD CONSTRAINT "Bordereau_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bordereau" ADD CONSTRAINT "Bordereau_currentHandlerId_fkey" FOREIGN KEY ("currentHandlerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bordereau" ADD CONSTRAINT "Bordereau_prestataireId_fkey" FOREIGN KEY ("prestataireId") REFERENCES "Prestataire"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bordereau" ADD CONSTRAINT "Bordereau_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BordereauAuditLog" ADD CONSTRAINT "BordereauAuditLog_bordereauId_fkey" FOREIGN KEY ("bordereauId") REFERENCES "Bordereau"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reclamation" ADD CONSTRAINT "Reclamation_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reclamation" ADD CONSTRAINT "Reclamation_bordereauId_fkey" FOREIGN KEY ("bordereauId") REFERENCES "Bordereau"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reclamation" ADD CONSTRAINT "Reclamation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reclamation" ADD CONSTRAINT "Reclamation_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reclamation" ADD CONSTRAINT "Reclamation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reclamation" ADD CONSTRAINT "Reclamation_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reclamation" ADD CONSTRAINT "Reclamation_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reclamation" ADD CONSTRAINT "Reclamation_conformiteUpdatedBy_fkey" FOREIGN KEY ("conformiteUpdatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReclamationHistory" ADD CONSTRAINT "ReclamationHistory_reclamationId_fkey" FOREIGN KEY ("reclamationId") REFERENCES "Reclamation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReclamationHistory" ADD CONSTRAINT "ReclamationHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_chargeCompteId_fkey" FOREIGN KEY ("chargeCompteId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_compagnieAssuranceId_fkey" FOREIGN KEY ("compagnieAssuranceId") REFERENCES "CompagnieAssurance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_assignedManagerId_fkey" FOREIGN KEY ("assignedManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_teamLeaderId_fkey" FOREIGN KEY ("teamLeaderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractHistory" ADD CONSTRAINT "ContractHistory_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractHistory" ADD CONSTRAINT "ContractHistory_modifiedById_fkey" FOREIGN KEY ("modifiedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_bordereauId_fkey" FOREIGN KEY ("bordereauId") REFERENCES "Bordereau"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Courrier" ADD CONSTRAINT "Courrier_bordereauId_fkey" FOREIGN KEY ("bordereauId") REFERENCES "Bordereau"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Courrier" ADD CONSTRAINT "Courrier_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Virement" ADD CONSTRAINT "Virement_bordereauId_fkey" FOREIGN KEY ("bordereauId") REFERENCES "Bordereau"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Virement" ADD CONSTRAINT "Virement_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OCRLog" ADD CONSTRAINT "OCRLog_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OCRLog" ADD CONSTRAINT "OCRLog_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertLog" ADD CONSTRAINT "AlertLog_bordereauId_fkey" FOREIGN KEY ("bordereauId") REFERENCES "Bordereau"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertLog" ADD CONSTRAINT "AlertLog_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertLog" ADD CONSTRAINT "AlertLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulletinSoin" ADD CONSTRAINT "BulletinSoin_bordereauId_fkey" FOREIGN KEY ("bordereauId") REFERENCES "Bordereau"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulletinSoin" ADD CONSTRAINT "BulletinSoin_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulletinSoin" ADD CONSTRAINT "BulletinSoin_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulletinSoin" ADD CONSTRAINT "BulletinSoin_virementId_fkey" FOREIGN KEY ("virementId") REFERENCES "Virement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulletinSoinItem" ADD CONSTRAINT "BulletinSoinItem_bulletinSoinId_fkey" FOREIGN KEY ("bulletinSoinId") REFERENCES "BulletinSoin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpertiseInfo" ADD CONSTRAINT "ExpertiseInfo_bulletinSoinId_fkey" FOREIGN KEY ("bulletinSoinId") REFERENCES "BulletinSoin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BSLog" ADD CONSTRAINT "BSLog_bsId_fkey" FOREIGN KEY ("bsId") REFERENCES "BulletinSoin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BSLog" ADD CONSTRAINT "BSLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adherent" ADD CONSTRAINT "Adherent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdherentRibHistory" ADD CONSTRAINT "AdherentRibHistory_adherentId_fkey" FOREIGN KEY ("adherentId") REFERENCES "Adherent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdreVirement" ADD CONSTRAINT "OrdreVirement_bordereauId_fkey" FOREIGN KEY ("bordereauId") REFERENCES "Bordereau"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdreVirement" ADD CONSTRAINT "OrdreVirement_donneurOrdreId_fkey" FOREIGN KEY ("donneurOrdreId") REFERENCES "DonneurOrdre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VirementItem" ADD CONSTRAINT "VirementItem_adherentId_fkey" FOREIGN KEY ("adherentId") REFERENCES "Adherent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VirementItem" ADD CONSTRAINT "VirementItem_ordreVirementId_fkey" FOREIGN KEY ("ordreVirementId") REFERENCES "OrdreVirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VirementHistorique" ADD CONSTRAINT "VirementHistorique_ordreVirementId_fkey" FOREIGN KEY ("ordreVirementId") REFERENCES "OrdreVirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonneurDOrdre" ADD CONSTRAINT "DonneurDOrdre_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WireTransferBatch" ADD CONSTRAINT "WireTransferBatch_donneurId_fkey" FOREIGN KEY ("donneurId") REFERENCES "DonneurDOrdre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WireTransferBatch" ADD CONSTRAINT "WireTransferBatch_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WireTransfer" ADD CONSTRAINT "WireTransfer_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "WireTransferBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WireTransfer" ADD CONSTRAINT "WireTransfer_donneurId_fkey" FOREIGN KEY ("donneurId") REFERENCES "DonneurDOrdre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WireTransfer" ADD CONSTRAINT "WireTransfer_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WireTransferBatchHistory" ADD CONSTRAINT "WireTransferBatchHistory_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "WireTransferBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WireTransferHistory" ADD CONSTRAINT "WireTransferHistory_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "WireTransfer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowAssignment" ADD CONSTRAINT "WorkflowAssignment_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GecTemplate" ADD CONSTRAINT "GecTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowAssignmentHistory" ADD CONSTRAINT "WorkflowAssignmentHistory_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "WorkflowAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionLog" ADD CONSTRAINT "ActionLog_bordereauId_fkey" FOREIGN KEY ("bordereauId") REFERENCES "Bordereau"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportExecution" ADD CONSTRAINT "ReportExecution_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ScheduledReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuiviVirement" ADD CONSTRAINT "SuiviVirement_ordreVirementId_fkey" FOREIGN KEY ("ordreVirementId") REFERENCES "OrdreVirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowNotification" ADD CONSTRAINT "WorkflowNotification_bordereauId_fkey" FOREIGN KEY ("bordereauId") REFERENCES "Bordereau"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowNotification" ADD CONSTRAINT "WorkflowNotification_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowNotification" ADD CONSTRAINT "WorkflowNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlaConfiguration" ADD CONSTRAINT "SlaConfiguration_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamStructure" ADD CONSTRAINT "TeamStructure_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamStructure" ADD CONSTRAINT "TeamStructure_parentTeamId_fkey" FOREIGN KEY ("parentTeamId") REFERENCES "TeamStructure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAssignmentHistory" ADD CONSTRAINT "DocumentAssignmentHistory_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAssignmentHistory" ADD CONSTRAINT "DocumentAssignmentHistory_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAssignmentHistory" ADD CONSTRAINT "DocumentAssignmentHistory_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAssignmentHistory" ADD CONSTRAINT "DocumentAssignmentHistory_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OVDocument" ADD CONSTRAINT "OVDocument_ordreVirementId_fkey" FOREIGN KEY ("ordreVirementId") REFERENCES "OrdreVirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OVDocument" ADD CONSTRAINT "OVDocument_bordereauId_fkey" FOREIGN KEY ("bordereauId") REFERENCES "Bordereau"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OVDocument" ADD CONSTRAINT "OVDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserBordereaux" ADD CONSTRAINT "_UserBordereaux_A_fkey" FOREIGN KEY ("A") REFERENCES "Bordereau"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserBordereaux" ADD CONSTRAINT "_UserBordereaux_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClientReclamations" ADD CONSTRAINT "_ClientReclamations_A_fkey" FOREIGN KEY ("A") REFERENCES "Reclamation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClientReclamations" ADD CONSTRAINT "_ClientReclamations_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClientGestionnaires" ADD CONSTRAINT "_ClientGestionnaires_A_fkey" FOREIGN KEY ("A") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClientGestionnaires" ADD CONSTRAINT "_ClientGestionnaires_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
