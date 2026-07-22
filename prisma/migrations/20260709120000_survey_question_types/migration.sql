-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SurveyQuestionType" ADD VALUE 'PARAGRAPH';
ALTER TYPE "SurveyQuestionType" ADD VALUE 'SINGLE_CHOICE';
ALTER TYPE "SurveyQuestionType" ADD VALUE 'MULTI_CHOICE';
ALTER TYPE "SurveyQuestionType" ADD VALUE 'DROPDOWN';
ALTER TYPE "SurveyQuestionType" ADD VALUE 'SCALE';

-- AlterTable
ALTER TABLE "survey_answers" ADD COLUMN     "selected_option_ids" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "survey_questions" ADD COLUMN     "scale_max" INTEGER,
ADD COLUMN     "scale_max_label" TEXT,
ADD COLUMN     "scale_min" INTEGER,
ADD COLUMN     "scale_min_label" TEXT;

-- CreateTable
CREATE TABLE "survey_question_options" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "survey_question_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "survey_question_options_question_id_order_key" ON "survey_question_options"("question_id", "order");

-- AddForeignKey
ALTER TABLE "survey_question_options" ADD CONSTRAINT "survey_question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "survey_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

