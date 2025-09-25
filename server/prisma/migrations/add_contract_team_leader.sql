-- Add teamLeaderId field to Contract table
ALTER TABLE "Contract" ADD COLUMN "teamLeaderId" TEXT;

-- Add foreign key constraint
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_teamLeaderId_fkey" 
FOREIGN KEY ("teamLeaderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create index for performance
CREATE INDEX "Contract_teamLeaderId_idx" ON "Contract"("teamLeaderId");