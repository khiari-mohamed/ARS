/*
  Warnings:

  - Added the required column `assignedManagerId` to the `Contract` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `Contract` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientName` to the `Contract` table without a default value. This is not possible if the table is not empty.
  - Added the required column `delaiReclamation` to the `Contract` table without a default value. This is not possible if the table is not empty.
  - Added the required column `delaiReglement` to the `Contract` table without a default value. This is not possible if the table is not empty.
  - Added the required column `documentPath` to the `Contract` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Contract` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "assignedManagerId" TEXT NOT NULL,
ADD COLUMN     "clientId" TEXT NOT NULL,
ADD COLUMN     "clientName" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "delaiReclamation" INTEGER NOT NULL,
ADD COLUMN     "delaiReglement" INTEGER NOT NULL,
ADD COLUMN     "documentPath" TEXT NOT NULL,
ADD COLUMN     "escalationThreshold" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "ContractHistory" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "modifiedById" TEXT NOT NULL,
    "modifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changes" JSONB NOT NULL,

    CONSTRAINT "ContractHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_assignedManagerId_fkey" FOREIGN KEY ("assignedManagerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractHistory" ADD CONSTRAINT "ContractHistory_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractHistory" ADD CONSTRAINT "ContractHistory_modifiedById_fkey" FOREIGN KEY ("modifiedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
