-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "signature" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;
