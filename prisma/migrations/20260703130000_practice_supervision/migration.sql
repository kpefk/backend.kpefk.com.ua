-- AlterEnum
ALTER TYPE "LessonType" ADD VALUE 'PRACTICE_SUPERVISION';

-- AlterTable
ALTER TABLE "working_curriculum_component_terms" ADD COLUMN     "practice_duration_weeks" DECIMAL(4,1);

