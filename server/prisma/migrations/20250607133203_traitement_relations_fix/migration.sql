-- AlterTable
ALTER TABLE "Bordereau" ADD COLUMN     "currentHandlerId" TEXT,
ADD COLUMN     "teamId" TEXT;

-- CreateTable
CREATE TABLE "TraitementHistory" (
    "id" TEXT NOT NULL,
    "bordereauId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TraitementHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TraitementHistory" ADD CONSTRAINT "TraitementHistory_bordereauId_fkey" FOREIGN KEY ("bordereauId") REFERENCES "Bordereau"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraitementHistory" ADD CONSTRAINT "TraitementHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraitementHistory" ADD CONSTRAINT "TraitementHistory_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bordereau" ADD CONSTRAINT "Bordereau_currentHandlerId_fkey" FOREIGN KEY ("currentHandlerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bordereau" ADD CONSTRAINT "Bordereau_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
