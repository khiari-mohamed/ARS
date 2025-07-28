/*
  Warnings:

  - A unique constraint covering the columns `[hash]` on the table `Document` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "hash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Document_hash_key" ON "Document"("hash");
