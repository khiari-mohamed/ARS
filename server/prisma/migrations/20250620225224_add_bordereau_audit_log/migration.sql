-- CreateTable
CREATE TABLE "BordereauAuditLog" (
    "id" TEXT NOT NULL,
    "bordereauId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "userId" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BordereauAuditLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BordereauAuditLog" ADD CONSTRAINT "BordereauAuditLog_bordereauId_fkey" FOREIGN KEY ("bordereauId") REFERENCES "Bordereau"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
