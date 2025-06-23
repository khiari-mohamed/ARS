-- AlterTable
ALTER TABLE "Bordereau" ADD COLUMN     "prestataireId" TEXT;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "ocrText" TEXT,
ADD COLUMN     "tatus" TEXT;

-- CreateTable
CREATE TABLE "Prestataire" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Prestataire_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Bordereau" ADD CONSTRAINT "Bordereau_prestataireId_fkey" FOREIGN KEY ("prestataireId") REFERENCES "Prestataire"("id") ON DELETE SET NULL ON UPDATE CASCADE;
