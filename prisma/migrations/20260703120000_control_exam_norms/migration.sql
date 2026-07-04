-- CreateEnum
CREATE TYPE "ExamFormat" AS ENUM ('ORAL', 'WRITTEN');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LessonType" ADD VALUE 'SEMESTER_CONTROL';
ALTER TYPE "LessonType" ADD VALUE 'CONTROL_WORKS_CHECK';

-- AlterTable
ALTER TABLE "working_curriculum_component_terms" ADD COLUMN     "control_works_auditory_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "control_works_independent_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "exam_format" "ExamFormat";

