-- CreateTable
CREATE TABLE "BulletinSoin" (
    "id" TEXT NOT NULL,
    "bordereauId" TEXT NOT NULL,
    "numBs" TEXT NOT NULL,
    "etat" TEXT NOT NULL,
    "ownerId" TEXT,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "BulletinSoin_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BulletinSoin" ADD CONSTRAINT "BulletinSoin_bordereauId_fkey" FOREIGN KEY ("bordereauId") REFERENCES "Bordereau"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulletinSoin" ADD CONSTRAINT "BulletinSoin_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
