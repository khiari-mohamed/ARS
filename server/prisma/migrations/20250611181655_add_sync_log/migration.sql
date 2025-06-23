-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "imported" INTEGER NOT NULL,
    "errors" INTEGER NOT NULL,
    "details" TEXT,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);
