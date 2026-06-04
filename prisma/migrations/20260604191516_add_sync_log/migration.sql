-- CreateEnum
CREATE TYPE "SyncType" AS ENUM ('STUDENTS', 'STAFF', 'DOCUMENTS');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED', 'PARTIAL');

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" TEXT NOT NULL,
    "type" "SyncType" NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'RUNNING',
    "is_full_sync" BOOLEAN NOT NULL DEFAULT true,
    "from_date" TIMESTAMP(3),
    "triggered_by" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "duration_ms" INTEGER,
    "total" INTEGER,
    "created" INTEGER,
    "updated" INTEGER,
    "skipped" INTEGER,
    "moves" INTEGER,
    "error" TEXT,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);
