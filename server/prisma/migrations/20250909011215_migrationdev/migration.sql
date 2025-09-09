-- CreateEnum
CREATE TYPE "EtatVirement" AS ENUM ('NON_EXECUTE', 'EN_COURS_EXECUTION', 'EXECUTE_PARTIELLEMENT', 'REJETE', 'EXECUTE');

-- DropIndex
DROP INDEX "Document_barcodeValues_idx";

-- DropIndex
DROP INDEX "Document_batchId_idx";

-- DropIndex
DROP INDEX "Document_ingestStatus_idx";

-- DropIndex
DROP INDEX "Document_ingestTimestamp_idx";

-- DropIndex
DROP INDEX "Document_operatorId_idx";

-- AlterTable
ALTER TABLE "Bordereau" ADD COLUMN     "chargeCompteId" TEXT,
ADD COLUMN     "dateLimiteTraitement" TIMESTAMP(3),
ADD COLUMN     "dateReceptionBO" TIMESTAMP(3),
ADD COLUMN     "dateReceptionEquipeSante" TIMESTAMP(3),
ADD COLUMN     "dateReelleCloture" TIMESTAMP(3),
ADD COLUMN     "nombreJourTraitement" INTEGER;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "chargeCompteId" TEXT,
ADD COLUMN     "contractDocumentPath" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "capacity" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "serviceType" TEXT,
ADD COLUMN     "teamLeaderId" TEXT;

-- CreateTable
CREATE TABLE "Adherent" (
    "id" TEXT NOT NULL,
    "matricule" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "rib" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'ACTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Adherent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonneurOrdre" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "rib" TEXT NOT NULL,
    "banque" TEXT NOT NULL,
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

-- CreateIndex
CREATE INDEX "Adherent_rib_idx" ON "Adherent"("rib");

-- CreateIndex
CREATE UNIQUE INDEX "Adherent_matricule_clientId_key" ON "Adherent"("matricule", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "OrdreVirement_reference_key" ON "OrdreVirement"("reference");

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
CREATE INDEX "TeamStructure_serviceType_idx" ON "TeamStructure"("serviceType");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teamLeaderId_fkey" FOREIGN KEY ("teamLeaderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bordereau" ADD CONSTRAINT "Bordereau_chargeCompteId_fkey" FOREIGN KEY ("chargeCompteId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_chargeCompteId_fkey" FOREIGN KEY ("chargeCompteId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adherent" ADD CONSTRAINT "Adherent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdreVirement" ADD CONSTRAINT "OrdreVirement_donneurOrdreId_fkey" FOREIGN KEY ("donneurOrdreId") REFERENCES "DonneurOrdre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdreVirement" ADD CONSTRAINT "OrdreVirement_bordereauId_fkey" FOREIGN KEY ("bordereauId") REFERENCES "Bordereau"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VirementItem" ADD CONSTRAINT "VirementItem_ordreVirementId_fkey" FOREIGN KEY ("ordreVirementId") REFERENCES "OrdreVirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VirementItem" ADD CONSTRAINT "VirementItem_adherentId_fkey" FOREIGN KEY ("adherentId") REFERENCES "Adherent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VirementHistorique" ADD CONSTRAINT "VirementHistorique_ordreVirementId_fkey" FOREIGN KEY ("ordreVirementId") REFERENCES "OrdreVirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GecTemplate" ADD CONSTRAINT "GecTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "TeamStructure" ADD CONSTRAINT "TeamStructure_parentTeamId_fkey" FOREIGN KEY ("parentTeamId") REFERENCES "TeamStructure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamStructure" ADD CONSTRAINT "TeamStructure_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
