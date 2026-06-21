-- CreateEnum
CREATE TYPE "WeekParity" AS ENUM ('ODD', 'EVEN', 'EVERY');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "schedules" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "working_curriculum_id" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "semester_number" INTEGER NOT NULL,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'DRAFT',
    "generated_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_entries" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "slot_number" INTEGER NOT NULL,
    "week_parity" "WeekParity" NOT NULL DEFAULT 'EVERY',
    "lesson_type" "LessonType" NOT NULL,
    "subgroup_number" INTEGER,
    "curriculum_component_term_id" TEXT NOT NULL,
    "teacher_id" TEXT,
    "classroom_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "schedules_working_curriculum_id_idx" ON "schedules"("working_curriculum_id");

-- CreateIndex
CREATE UNIQUE INDEX "schedules_group_id_academic_year_semester_number_key" ON "schedules"("group_id", "academic_year", "semester_number");

-- CreateIndex
CREATE INDEX "schedule_entries_schedule_id_idx" ON "schedule_entries"("schedule_id");

-- CreateIndex
CREATE INDEX "schedule_entries_teacher_id_idx" ON "schedule_entries"("teacher_id");

-- CreateIndex
CREATE INDEX "schedule_entries_classroom_id_idx" ON "schedule_entries"("classroom_id");

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_working_curriculum_id_fkey" FOREIGN KEY ("working_curriculum_id") REFERENCES "working_curricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_entries" ADD CONSTRAINT "schedule_entries_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_entries" ADD CONSTRAINT "schedule_entries_curriculum_component_term_id_fkey" FOREIGN KEY ("curriculum_component_term_id") REFERENCES "curriculum_component_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_entries" ADD CONSTRAINT "schedule_entries_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_entries" ADD CONSTRAINT "schedule_entries_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
