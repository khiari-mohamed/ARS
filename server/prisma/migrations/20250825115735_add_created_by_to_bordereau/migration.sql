-- CreateTable
CREATE TABLE "ActionLog" (
    "id" TEXT NOT NULL,
    "bordereauId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSONB,

    CONSTRAINT "ActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActionLog_bordereauId_idx" ON "ActionLog"("bordereauId");

-- CreateIndex
CREATE INDEX "ActionLog_timestamp_idx" ON "ActionLog"("timestamp");

-- AddForeignKey
ALTER TABLE "ActionLog" ADD CONSTRAINT "ActionLog_bordereauId_fkey" FOREIGN KEY ("bordereauId") REFERENCES "Bordereau"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
