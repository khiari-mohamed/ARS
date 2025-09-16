-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "User" ADD COLUMN "departmentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");
CREATE INDEX "Department_serviceType_idx" ON "Department"("serviceType");
CREATE INDEX "Department_active_idx" ON "Department"("active");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Insert required departments
INSERT INTO "Department" ("id", "name", "code", "serviceType", "description") VALUES
('dept-bo', 'Bureau d''Ordre', 'BO', 'BUREAU_ORDRE', 'Service de réception et saisie initiale'),
('dept-scan', 'Service SCAN', 'SCAN', 'SCAN', 'Service de numérisation et indexation'),
('dept-sante', 'Équipe Santé', 'SANTE', 'SANTE', 'Service de traitement des dossiers santé'),
('dept-finance', 'Service Finance', 'FINANCE', 'FINANCE', 'Service de gestion financière et virements'),
('dept-client', 'Service Client', 'CLIENT', 'CLIENT_SERVICE', 'Service de gestion des réclamations');