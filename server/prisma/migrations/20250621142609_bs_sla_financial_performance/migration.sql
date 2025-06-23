-- AlterTable
ALTER TABLE "BulletinSoin" ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "processedById" TEXT,
ADD COLUMN     "virementId" TEXT;

-- AddForeignKey
ALTER TABLE "BulletinSoin" ADD CONSTRAINT "BulletinSoin_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulletinSoin" ADD CONSTRAINT "BulletinSoin_virementId_fkey" FOREIGN KEY ("virementId") REFERENCES "Virement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
