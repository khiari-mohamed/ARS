-- AlterTable
ALTER TABLE "BulletinSoin" ADD COLUMN     "acte" TEXT,
ADD COLUMN     "dateSoin" TIMESTAMP(3),
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "matricule" TEXT,
ADD COLUMN     "montant" DOUBLE PRECISION;
