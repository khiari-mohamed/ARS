-- AlterEnum
ALTER TYPE "Statut" ADD VALUE 'EN_DIFFICULTE';

-- DropForeignKey
ALTER TABLE "Bordereau" DROP CONSTRAINT "Bordereau_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Reclamation" DROP CONSTRAINT "Reclamation_clientId_fkey";

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reglementDelay" INTEGER NOT NULL,
    "reclamationDelay" INTEGER NOT NULL,
    "accountManagerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE UNIQUE INDEX "Client_name_key" ON "Client"("name");

-- CreateIndex
CREATE INDEX "_UserBordereaux_B_index" ON "_UserBordereaux"("B");

-- CreateIndex
CREATE INDEX "_ClientReclamations_B_index" ON "_ClientReclamations"("B");

-- AddForeignKey
ALTER TABLE "Bordereau" ADD CONSTRAINT "Bordereau_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reclamation" ADD CONSTRAINT "Reclamation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_accountManagerId_fkey" FOREIGN KEY ("accountManagerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserBordereaux" ADD CONSTRAINT "_UserBordereaux_A_fkey" FOREIGN KEY ("A") REFERENCES "Bordereau"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserBordereaux" ADD CONSTRAINT "_UserBordereaux_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClientReclamations" ADD CONSTRAINT "_ClientReclamations_A_fkey" FOREIGN KEY ("A") REFERENCES "Reclamation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClientReclamations" ADD CONSTRAINT "_ClientReclamations_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
