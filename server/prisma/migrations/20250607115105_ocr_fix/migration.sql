-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "ocrResult" JSONB;

-- CreateTable
CREATE TABLE "OCRLog" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "processedById" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "ocrAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OCRLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OCRLog" ADD CONSTRAINT "OCRLog_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OCRLog" ADD CONSTRAINT "OCRLog_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
