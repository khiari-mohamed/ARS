-- CreateEnum
CREATE TYPE "WireTransferBatchStatus" AS ENUM ('CREATED', 'VALIDATED', 'REJECTED', 'ARCHIVED', 'PROCESSED');

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

-- CreateIndex
CREATE UNIQUE INDEX "Society_name_key" ON "Society"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Society_code_key" ON "Society"("code");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonneurDOrdre" ADD CONSTRAINT "DonneurDOrdre_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WireTransferBatch" ADD CONSTRAINT "WireTransferBatch_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WireTransferBatch" ADD CONSTRAINT "WireTransferBatch_donneurId_fkey" FOREIGN KEY ("donneurId") REFERENCES "DonneurDOrdre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WireTransfer" ADD CONSTRAINT "WireTransfer_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "WireTransferBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WireTransfer" ADD CONSTRAINT "WireTransfer_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WireTransfer" ADD CONSTRAINT "WireTransfer_donneurId_fkey" FOREIGN KEY ("donneurId") REFERENCES "DonneurDOrdre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WireTransferBatchHistory" ADD CONSTRAINT "WireTransferBatchHistory_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "WireTransferBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WireTransferHistory" ADD CONSTRAINT "WireTransferHistory_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "WireTransfer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
