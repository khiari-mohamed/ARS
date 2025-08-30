-- Add PaperStream-specific fields to Document table
ALTER TABLE "Document" ADD COLUMN "batchId" TEXT;
ALTER TABLE "Document" ADD COLUMN "barcodeValues" TEXT[];
ALTER TABLE "Document" ADD COLUMN "pageCount" INTEGER;
ALTER TABLE "Document" ADD COLUMN "resolution" INTEGER;
ALTER TABLE "Document" ADD COLUMN "colorMode" TEXT;
ALTER TABLE "Document" ADD COLUMN "operatorId" TEXT;
ALTER TABLE "Document" ADD COLUMN "scannerModel" TEXT;
ALTER TABLE "Document" ADD COLUMN "imprinterIds" TEXT[];
ALTER TABLE "Document" ADD COLUMN "ingestStatus" TEXT;
ALTER TABLE "Document" ADD COLUMN "ingestTimestamp" TIMESTAMP(3);

-- Create indexes for better performance
CREATE INDEX "Document_batchId_idx" ON "Document"("batchId");
CREATE INDEX "Document_barcodeValues_idx" ON "Document" USING GIN("barcodeValues");
CREATE INDEX "Document_operatorId_idx" ON "Document"("operatorId");
CREATE INDEX "Document_ingestStatus_idx" ON "Document"("ingestStatus");
CREATE INDEX "Document_ingestTimestamp_idx" ON "Document"("ingestTimestamp");