-- AlterTable
ALTER TABLE "admission_campaigns" ADD COLUMN     "auto_register_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_auto_poll_at" TIMESTAMP(3),
ADD COLUMN     "poll_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "poll_interval_active_sec" INTEGER NOT NULL DEFAULT 40,
ADD COLUMN     "poll_interval_off_hours_sec" INTEGER NOT NULL DEFAULT 3600,
ADD COLUMN     "poll_window_end_hour" INTEGER NOT NULL DEFAULT 18,
ADD COLUMN     "poll_window_start_hour" INTEGER NOT NULL DEFAULT 9,
ADD COLUMN     "registration_descryption_default" TEXT;

-- AlterTable
ALTER TABLE "admission_offers" ADD COLUMN     "case_suffix" TEXT,
ADD COLUMN     "registration_descryption" TEXT;

