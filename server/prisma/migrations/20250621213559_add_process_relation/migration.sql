/*
  Warnings:

  - You are about to drop the `_ProcessReclamations` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ProcessReclamations" DROP CONSTRAINT "_ProcessReclamations_A_fkey";

-- DropForeignKey
ALTER TABLE "_ProcessReclamations" DROP CONSTRAINT "_ProcessReclamations_B_fkey";

-- DropTable
DROP TABLE "_ProcessReclamations";

-- AddForeignKey
ALTER TABLE "Reclamation" ADD CONSTRAINT "Reclamation_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE SET NULL ON UPDATE CASCADE;
