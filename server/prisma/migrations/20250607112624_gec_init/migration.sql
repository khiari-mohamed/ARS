-- CreateEnum
CREATE TYPE "CourrierType" AS ENUM ('REGLEMENT', 'RELANCE', 'RECLAMATION', 'AUTRE');

-- CreateEnum
CREATE TYPE "CourrierStatus" AS ENUM ('DRAFT', 'SENT', 'FAILED', 'PENDING_RESPONSE', 'RESPONDED');

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

-- AddForeignKey
ALTER TABLE "Courrier" ADD CONSTRAINT "Courrier_bordereauId_fkey" FOREIGN KEY ("bordereauId") REFERENCES "Bordereau"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Courrier" ADD CONSTRAINT "Courrier_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
