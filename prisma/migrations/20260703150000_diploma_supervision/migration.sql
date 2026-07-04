-- CreateEnum
CREATE TYPE "SupervisionRole" AS ENUM ('SUPERVISOR', 'CONSULTANT');

-- AlterEnum
ALTER TYPE "LessonType" ADD VALUE 'DIPLOMA_COMMITTEE';

-- AlterTable
ALTER TABLE "working_curriculum_component_terms" ADD COLUMN     "diploma_committee_size" INTEGER NOT NULL DEFAULT 3;

-- CreateTable
CREATE TABLE "diploma_supervision_assignments" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "working_curriculum_id" TEXT NOT NULL,
    "curriculum_component_term_id" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "role" "SupervisionRole" NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "assigned_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diploma_supervision_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "diploma_supervision_assignments_working_curriculum_id_idx" ON "diploma_supervision_assignments"("working_curriculum_id");

-- CreateIndex
CREATE INDEX "diploma_supervision_assignments_teacher_id_idx" ON "diploma_supervision_assignments"("teacher_id");

-- CreateIndex
CREATE INDEX "diploma_supervision_assignments_student_id_idx" ON "diploma_supervision_assignments"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "diploma_supervision_assignments_student_id_curriculum_compo_key" ON "diploma_supervision_assignments"("student_id", "curriculum_component_term_id", "teacher_id");

-- AddForeignKey
ALTER TABLE "diploma_supervision_assignments" ADD CONSTRAINT "diploma_supervision_assignments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diploma_supervision_assignments" ADD CONSTRAINT "diploma_supervision_assignments_working_curriculum_id_fkey" FOREIGN KEY ("working_curriculum_id") REFERENCES "working_curricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diploma_supervision_assignments" ADD CONSTRAINT "diploma_supervision_assignments_curriculum_component_term__fkey" FOREIGN KEY ("curriculum_component_term_id") REFERENCES "curriculum_component_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diploma_supervision_assignments" ADD CONSTRAINT "diploma_supervision_assignments_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diploma_supervision_assignments" ADD CONSTRAINT "diploma_supervision_assignments_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

