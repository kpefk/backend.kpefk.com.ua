-- CreateEnum
CREATE TYPE "ClassroomType" AS ENUM ('LECTURE', 'PRACTICE', 'LAB', 'COMPUTER', 'SPORTS', 'OTHER');

-- CreateEnum
CREATE TYPE "SubstitutionType" AS ENUM ('CANCELLED', 'TEACHER_CHANGE', 'ROOM_CHANGE', 'MOVED');

-- AlterTable
ALTER TABLE "classrooms" ADD COLUMN     "capacity" INTEGER,
ADD COLUMN     "type" "ClassroomType";

-- AlterTable
ALTER TABLE "schedule_entries" ADD COLUMN     "online_url" TEXT;

-- AlterTable
ALTER TABLE "schedules" ADD COLUMN     "homeroom_day_of_week" INTEGER;

-- CreateTable
CREATE TABLE "schedule_substitutions" (
    "id" TEXT NOT NULL,
    "entry_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "SubstitutionType" NOT NULL,
    "new_day_of_week" INTEGER,
    "new_slot_number" INTEGER,
    "replacement_teacher_id" TEXT,
    "replacement_classroom_id" TEXT,
    "reason" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_substitutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_settings" (
    "id" TEXT NOT NULL,
    "max_pairs_full_time" INTEGER NOT NULL DEFAULT 4,
    "max_pairs_part_time" INTEGER,
    "homeroom_counts_to_limit" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "schedule_substitutions_entry_id_idx" ON "schedule_substitutions"("entry_id");

-- CreateIndex
CREATE INDEX "schedule_substitutions_date_idx" ON "schedule_substitutions"("date");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_substitutions_entry_id_date_key" ON "schedule_substitutions"("entry_id", "date");

-- AddForeignKey
ALTER TABLE "schedule_substitutions" ADD CONSTRAINT "schedule_substitutions_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "schedule_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_substitutions" ADD CONSTRAINT "schedule_substitutions_replacement_teacher_id_fkey" FOREIGN KEY ("replacement_teacher_id") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_substitutions" ADD CONSTRAINT "schedule_substitutions_replacement_classroom_id_fkey" FOREIGN KEY ("replacement_classroom_id") REFERENCES "classrooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
