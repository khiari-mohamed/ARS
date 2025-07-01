/*
  Warnings:

  - You are about to drop the column `accountManagerId` on the `Client` table. All the data in the column will be lost.
  - The `status` column on the `Document` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('UPLOADED', 'EN_COURS', 'TRAITE', 'REJETE', 'RETOUR_ADMIN');

-- DropForeignKey
ALTER TABLE "Client" DROP CONSTRAINT "Client_accountManagerId_fkey";

-- AlterTable
ALTER TABLE "Client" DROP COLUMN "accountManagerId";

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "status",
ADD COLUMN     "status" "DocumentStatus";

-- CreateTable
CREATE TABLE "_ClientGestionnaires" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ClientGestionnaires_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ClientGestionnaires_B_index" ON "_ClientGestionnaires"("B");

-- AddForeignKey
ALTER TABLE "_ClientGestionnaires" ADD CONSTRAINT "_ClientGestionnaires_A_fkey" FOREIGN KEY ("A") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClientGestionnaires" ADD CONSTRAINT "_ClientGestionnaires_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
