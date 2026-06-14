-- CreateEnum
CREATE TYPE "LoadDistributionMode" AS ENUM ('STREAM', 'PER_GROUP');

-- AlterTable
ALTER TABLE "working_curriculum_component_terms" ADD COLUMN     "lab_mode" "LoadDistributionMode" NOT NULL DEFAULT 'STREAM',
ADD COLUMN     "practice_mode" "LoadDistributionMode" NOT NULL DEFAULT 'STREAM';
