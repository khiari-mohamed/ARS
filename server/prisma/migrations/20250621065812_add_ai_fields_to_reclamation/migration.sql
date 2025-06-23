-- AlterTable
ALTER TABLE "ReclamationHistory" ADD COLUMN     "aiSuggestions" JSONB,
ADD COLUMN     "isRecurrent" BOOLEAN DEFAULT false;
