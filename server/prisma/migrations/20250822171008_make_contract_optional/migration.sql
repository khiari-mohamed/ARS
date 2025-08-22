/*
  Warnings:

  - The values [SCAN_TERMINE] on the enum `Statut` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Statut_new" AS ENUM ('EN_ATTENTE', 'A_SCANNER', 'SCAN_EN_COURS', 'SCANNE', 'A_AFFECTER', 'ASSIGNE', 'EN_COURS', 'TRAITE', 'PRET_VIREMENT', 'VIREMENT_EN_COURS', 'VIREMENT_EXECUTE', 'VIREMENT_REJETE', 'CLOTURE', 'EN_DIFFICULTE', 'PARTIEL');
ALTER TABLE "Bordereau" ALTER COLUMN "statut" DROP DEFAULT;
ALTER TABLE "Bordereau" ALTER COLUMN "statut" TYPE "Statut_new" USING ("statut"::text::"Statut_new");
ALTER TYPE "Statut" RENAME TO "Statut_old";
ALTER TYPE "Statut_new" RENAME TO "Statut";
DROP TYPE "Statut_old";
ALTER TABLE "Bordereau" ALTER COLUMN "statut" SET DEFAULT 'EN_ATTENTE';
COMMIT;

-- DropForeignKey
ALTER TABLE "Bordereau" DROP CONSTRAINT "Bordereau_contractId_fkey";

-- AlterTable
ALTER TABLE "Bordereau" ALTER COLUMN "contractId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Bordereau" ADD CONSTRAINT "Bordereau_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
