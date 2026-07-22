-- AlterEnum
BEGIN;
CREATE TYPE "SurveyQuestionType_new" AS ENUM ('RATING', 'TEXT', 'PARAGRAPH', 'SINGLE_CHOICE', 'MULTI_CHOICE', 'DROPDOWN', 'SCALE');
ALTER TABLE "survey_questions" ALTER COLUMN "type" TYPE "SurveyQuestionType_new" USING ("type"::text::"SurveyQuestionType_new");
ALTER TYPE "SurveyQuestionType" RENAME TO "SurveyQuestionType_old";
ALTER TYPE "SurveyQuestionType_new" RENAME TO "SurveyQuestionType";
DROP TYPE "public"."SurveyQuestionType_old";
COMMIT;

-- AlterTable
ALTER TABLE "survey_answers" DROP COLUMN "bool_value";

