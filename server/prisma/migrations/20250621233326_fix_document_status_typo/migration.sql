/*
  Warnings:

  - You are about to drop the column `tatus` on the `Document` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Document" DROP COLUMN "tatus",
ADD COLUMN     "status" TEXT;
