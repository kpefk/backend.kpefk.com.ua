-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('ABSENT', 'PRESENT', 'LATE');

-- CreateTable
CREATE TABLE "student_subgroups" (
    "id" TEXT NOT NULL,
    "curriculum_component_term_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "subgroup_number" INTEGER NOT NULL,
    "assigned_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_subgroups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_sessions" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "academic_year" TEXT NOT NULL,
    "semester_number" INTEGER NOT NULL,
    "group_id" TEXT NOT NULL,
    "curriculum_component_term_id" TEXT NOT NULL,
    "subject_name" VARCHAR(300) NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "slot_number" INTEGER NOT NULL,
    "week_parity" "WeekParity" NOT NULL,
    "lesson_type" "LessonType" NOT NULL,
    "subgroup_number" INTEGER NOT NULL DEFAULT 0,
    "topic" VARCHAR(500),
    "schedule_entry_id" TEXT,
    "recorded_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "lesson_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "lesson_session_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "student_name" VARCHAR(300) NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'ABSENT',
    "grade" INTEGER,
    "comment" VARCHAR(1000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_subgroups_curriculum_component_term_id_subgroup_num_idx" ON "student_subgroups"("curriculum_component_term_id", "subgroup_number");

-- CreateIndex
CREATE INDEX "student_subgroups_group_id_curriculum_component_term_id_idx" ON "student_subgroups"("group_id", "curriculum_component_term_id");

-- CreateIndex
CREATE INDEX "student_subgroups_student_id_idx" ON "student_subgroups"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_subgroups_curriculum_component_term_id_student_id_key" ON "student_subgroups"("curriculum_component_term_id", "student_id");

-- CreateIndex
CREATE INDEX "lesson_sessions_teacher_id_date_idx" ON "lesson_sessions"("teacher_id", "date");

-- CreateIndex
CREATE INDEX "lesson_sessions_group_id_academic_year_semester_number_idx" ON "lesson_sessions"("group_id", "academic_year", "semester_number");

-- CreateIndex
CREATE INDEX "lesson_sessions_curriculum_component_term_id_idx" ON "lesson_sessions"("curriculum_component_term_id");

-- CreateIndex
CREATE INDEX "lesson_sessions_date_idx" ON "lesson_sessions"("date");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_sessions_group_id_date_slot_number_subgroup_number_key" ON "lesson_sessions"("group_id", "date", "slot_number", "subgroup_number");

-- CreateIndex
CREATE INDEX "attendance_records_student_id_idx" ON "attendance_records"("student_id");

-- CreateIndex
CREATE INDEX "attendance_records_lesson_session_id_idx" ON "attendance_records"("lesson_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_lesson_session_id_student_id_key" ON "attendance_records"("lesson_session_id", "student_id");

-- AddForeignKey
ALTER TABLE "student_subgroups" ADD CONSTRAINT "student_subgroups_curriculum_component_term_id_fkey" FOREIGN KEY ("curriculum_component_term_id") REFERENCES "curriculum_component_terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_subgroups" ADD CONSTRAINT "student_subgroups_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_subgroups" ADD CONSTRAINT "student_subgroups_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_sessions" ADD CONSTRAINT "lesson_sessions_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_sessions" ADD CONSTRAINT "lesson_sessions_curriculum_component_term_id_fkey" FOREIGN KEY ("curriculum_component_term_id") REFERENCES "curriculum_component_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_sessions" ADD CONSTRAINT "lesson_sessions_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_sessions" ADD CONSTRAINT "lesson_sessions_schedule_entry_id_fkey" FOREIGN KEY ("schedule_entry_id") REFERENCES "schedule_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_sessions" ADD CONSTRAINT "lesson_sessions_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_lesson_session_id_fkey" FOREIGN KEY ("lesson_session_id") REFERENCES "lesson_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
