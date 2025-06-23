/*
  Warnings:

  - Added the required column `codeAssure` to the `BulletinSoin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dateCreation` to the `BulletinSoin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dateMaladie` to the `BulletinSoin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lien` to the `BulletinSoin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nomAssure` to the `BulletinSoin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nomBeneficiaire` to the `BulletinSoin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nomBordereau` to the `BulletinSoin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nomPrestation` to the `BulletinSoin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nomSociete` to the `BulletinSoin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `observationGlobal` to the `BulletinSoin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalPec` to the `BulletinSoin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `BulletinSoin` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BulletinSoin" ADD COLUMN     "codeAssure" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "dateCreation" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "dateMaladie" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "lien" TEXT NOT NULL,
ADD COLUMN     "nomAssure" TEXT NOT NULL,
ADD COLUMN     "nomBeneficiaire" TEXT NOT NULL,
ADD COLUMN     "nomBordereau" TEXT NOT NULL,
ADD COLUMN     "nomPrestation" TEXT NOT NULL,
ADD COLUMN     "nomSociete" TEXT NOT NULL,
ADD COLUMN     "observationGlobal" TEXT NOT NULL,
ADD COLUMN     "ocrText" TEXT,
ADD COLUMN     "totalPec" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "BulletinSoinItem" (
    "id" TEXT NOT NULL,
    "bulletinSoinId" TEXT NOT NULL,
    "nomProduit" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "commentaire" TEXT NOT NULL,
    "nomChapitre" TEXT NOT NULL,
    "nomPrestataire" TEXT NOT NULL,
    "datePrestation" TIMESTAMP(3) NOT NULL,
    "typeHonoraire" TEXT NOT NULL,
    "depense" DOUBLE PRECISION NOT NULL,
    "pec" DOUBLE PRECISION NOT NULL,
    "participationAdherent" DOUBLE PRECISION NOT NULL,
    "message" TEXT NOT NULL,
    "codeMessage" TEXT NOT NULL,
    "acuiteDroite" DOUBLE PRECISION NOT NULL,
    "acuiteGauche" DOUBLE PRECISION NOT NULL,
    "nombreCle" TEXT NOT NULL,
    "nbJourDepassement" INTEGER NOT NULL,

    CONSTRAINT "BulletinSoinItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpertiseInfo" (
    "id" TEXT NOT NULL,
    "bulletinSoinId" TEXT NOT NULL,
    "isFavorable" TEXT NOT NULL,
    "matriculeAdherent" TEXT NOT NULL,
    "numBS" TEXT NOT NULL,
    "contrat" TEXT NOT NULL,
    "cin" TEXT NOT NULL,
    "vlodsphere" DOUBLE PRECISION,
    "vpogsphere" DOUBLE PRECISION,
    "prixMonture" DOUBLE PRECISION,
    "codification" TEXT,
    "natureActe" TEXT,
    "societe" TEXT,
    "dents" TEXT,

    CONSTRAINT "ExpertiseInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BSLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bsId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BSLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BulletinSoinItem" ADD CONSTRAINT "BulletinSoinItem_bulletinSoinId_fkey" FOREIGN KEY ("bulletinSoinId") REFERENCES "BulletinSoin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpertiseInfo" ADD CONSTRAINT "ExpertiseInfo_bulletinSoinId_fkey" FOREIGN KEY ("bulletinSoinId") REFERENCES "BulletinSoin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BSLog" ADD CONSTRAINT "BSLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BSLog" ADD CONSTRAINT "BSLog_bsId_fkey" FOREIGN KEY ("bsId") REFERENCES "BulletinSoin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
