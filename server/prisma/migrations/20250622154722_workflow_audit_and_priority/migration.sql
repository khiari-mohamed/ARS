-- AlterTable
ALTER TABLE "Bordereau" ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "BulletinSoin" ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Reclamation" ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Virement" ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "WorkflowAssignmentHistory" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "updatedByUserId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prevStatus" TEXT,
    "newStatus" TEXT,
    "prevNotes" TEXT,
    "newNotes" TEXT,
    "slaMet" BOOLEAN,

    CONSTRAINT "WorkflowAssignmentHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WorkflowAssignmentHistory" ADD CONSTRAINT "WorkflowAssignmentHistory_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "WorkflowAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
