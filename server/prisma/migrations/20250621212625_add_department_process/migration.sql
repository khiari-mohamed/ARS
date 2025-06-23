-- AlterTable
ALTER TABLE "Reclamation" ADD COLUMN     "department" TEXT,
ADD COLUMN     "processId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "department" TEXT;

-- CreateTable
CREATE TABLE "Process" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Process_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ProcessReclamations" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProcessReclamations_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ProcessReclamations_B_index" ON "_ProcessReclamations"("B");

-- AddForeignKey
ALTER TABLE "_ProcessReclamations" ADD CONSTRAINT "_ProcessReclamations_A_fkey" FOREIGN KEY ("A") REFERENCES "Process"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProcessReclamations" ADD CONSTRAINT "_ProcessReclamations_B_fkey" FOREIGN KEY ("B") REFERENCES "Reclamation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
