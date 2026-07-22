-- AlterTable
ALTER TABLE "admission_applications" ADD COLUMN     "information_original_document_location" BOOLEAN,
ADD COLUMN     "is_additional_exam" BOOLEAN,
ADD COLUMN     "is_another_budget_allowed" BOOLEAN,
ADD COLUMN     "is_budget_education" INTEGER,
ADD COLUMN     "is_graduate_one_year" BOOLEAN,
ADD COLUMN     "is_interview_success" BOOLEAN,
ADD COLUMN     "is_similiar_speciality" BOOLEAN;

