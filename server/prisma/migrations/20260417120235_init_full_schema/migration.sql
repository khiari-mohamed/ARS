-- AlterTable
ALTER TABLE "Bordereau" ADD COLUMN     "dateAffectation" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "modeRecuperation" TEXT;

-- AlterTable
ALTER TABLE "OrdreVirement" ADD COLUMN     "clientName" TEXT;

-- CreateTable
CREATE TABLE "AdherentHistory" (
    "id" TEXT NOT NULL,
    "adherentId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "updatedById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdherentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdherentHistory_adherentId_idx" ON "AdherentHistory"("adherentId");

-- CreateIndex
CREATE INDEX "AdherentHistory_updatedAt_idx" ON "AdherentHistory"("updatedAt");

-- AddForeignKey
ALTER TABLE "AdherentHistory" ADD CONSTRAINT "AdherentHistory_adherentId_fkey" FOREIGN KEY ("adherentId") REFERENCES "Adherent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
