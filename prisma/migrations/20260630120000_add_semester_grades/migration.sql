-- CreateEnum
CREATE TYPE "GradeScale" AS ENUM ('TWELVE_POINT', 'FIVE_POINT');

-- CreateEnum
CREATE TYPE "NationalGrade" AS ENUM ('EXCELLENT', 'GOOD', 'SATISFACTORY', 'UNSATISFACTORY', 'PASSED', 'NOT_PASSED');

-- CreateEnum
CREATE TYPE "SemesterGradeStatus" AS ENUM ('ACTIVE', 'SUPERSEDED');

-- CreateTable
CREATE TABLE "semester_grades" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "curriculum_component_term_id" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "control_form" "TermControlForm" NOT NULL,
    "grade_scale" "GradeScale" NOT NULL,
    "final_grade" INTEGER,
    "national_grade" "NationalGrade" NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "status" "SemesterGradeStatus" NOT NULL DEFAULT 'ACTIVE',
    "previous_attempt_id" TEXT,
    "recorded_by_id" TEXT NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "semester_grades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "semester_grades_student_id_academic_year_idx" ON "semester_grades"("student_id", "academic_year");

-- CreateIndex
CREATE INDEX "semester_grades_curriculum_component_term_id_idx" ON "semester_grades"("curriculum_component_term_id");

-- CreateIndex
CREATE INDEX "semester_grades_recorded_by_id_idx" ON "semester_grades"("recorded_by_id");

-- CreateIndex
CREATE INDEX "semester_grades_status_idx" ON "semester_grades"("status");

-- CreateIndex
CREATE UNIQUE INDEX "semester_grades_student_id_curriculum_component_term_id_att_key" ON "semester_grades"("student_id", "curriculum_component_term_id", "attempt");

-- AddForeignKey
ALTER TABLE "semester_grades" ADD CONSTRAINT "semester_grades_previous_attempt_id_fkey" FOREIGN KEY ("previous_attempt_id") REFERENCES "semester_grades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semester_grades" ADD CONSTRAINT "semester_grades_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semester_grades" ADD CONSTRAINT "semester_grades_curriculum_component_term_id_fkey" FOREIGN KEY ("curriculum_component_term_id") REFERENCES "curriculum_component_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semester_grades" ADD CONSTRAINT "semester_grades_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

