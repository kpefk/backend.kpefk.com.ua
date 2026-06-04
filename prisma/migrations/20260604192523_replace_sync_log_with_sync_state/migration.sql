/*
  Warnings:

  - You are about to drop the `sync_logs` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "sync_logs";

-- DropEnum
DROP TYPE "SyncStatus";

-- DropEnum
DROP TYPE "SyncType";

-- CreateTable
CREATE TABLE "sync_state" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_state_pkey" PRIMARY KEY ("key")
);
