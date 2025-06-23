-- CreateTable
CREATE TABLE "Virement" (
    "id" TEXT NOT NULL,
    "bordereauId" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "referenceBancaire" TEXT NOT NULL,
    "dateDepot" TIMESTAMP(3) NOT NULL,
    "dateExecution" TIMESTAMP(3) NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmedById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Virement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Virement_bordereauId_key" ON "Virement"("bordereauId");

-- AddForeignKey
ALTER TABLE "Virement" ADD CONSTRAINT "Virement_bordereauId_fkey" FOREIGN KEY ("bordereauId") REFERENCES "Bordereau"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Virement" ADD CONSTRAINT "Virement_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
