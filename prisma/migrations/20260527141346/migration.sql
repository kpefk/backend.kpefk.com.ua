/*
  Warnings:

  - You are about to drop the column `country_name` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `first_name` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `is_dual` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `last_name` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `listenerId` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `middle_name` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `passport_document_expired_date` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `passport_document_issued_date` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `passport_document_numbers` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `passport_document_series` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `passport_document_type_id` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `passport_document_type_name` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `personId` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `profession_classifier_code_1` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `profession_classifier_code_2` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `profession_classifier_code_3` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `profession_classifier_code_4` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `profession_classifier_code_5` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `profession_name_1` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `profession_name_2` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `profession_name_3` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `profession_name_4` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `profession_name_5` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `profession_rang_name_1` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `profession_rang_name_2` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `profession_rang_name_3` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `profession_rang_name_4` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `profession_rang_name_5` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `reason` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `rnokpp` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `universityId` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `unzr` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `country_id` on the `teachers` table. All the data in the column will be lost.
  - You are about to drop the column `passport_document_date_get` on the `teachers` table. All the data in the column will be lost.
  - You are about to drop the column `passport_document_expired_date` on the `teachers` table. All the data in the column will be lost.
  - You are about to drop the column `passport_document_numbers` on the `teachers` table. All the data in the column will be lost.
  - You are about to drop the column `passport_document_series` on the `teachers` table. All the data in the column will be lost.
  - You are about to drop the column `passport_document_type_id` on the `teachers` table. All the data in the column will be lost.
  - You are about to drop the column `passport_document_type_name` on the `teachers` table. All the data in the column will be lost.
  - You are about to drop the column `pedagogic_title_id` on the `teachers` table. All the data in the column will be lost.
  - You are about to drop the column `pedagogic_title_name` on the `teachers` table. All the data in the column will be lost.
  - You are about to drop the column `rnokpp` on the `teachers` table. All the data in the column will be lost.
  - You are about to drop the column `university_id` on the `teachers` table. All the data in the column will be lost.
  - You are about to drop the column `unzr` on the `teachers` table. All the data in the column will be lost.
  - Added the required column `education_history_actual_id` to the `students` table without a default value. This is not possible if the table is not empty.
  - Added the required column `education_id` to the `students` table without a default value. This is not possible if the table is not empty.
  - Added the required column `history_type_id` to the `students` table without a default value. This is not possible if the table is not empty.
  - Added the required column `person_code_u` to the `students` table without a default value. This is not possible if the table is not empty.
  - Added the required column `person_fio` to the `students` table without a default value. This is not possible if the table is not empty.
  - Added the required column `person_id` to the `students` table without a default value. This is not possible if the table is not empty.
  - Added the required column `university_id` to the `students` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "students" DROP COLUMN "country_name",
DROP COLUMN "first_name",
DROP COLUMN "is_dual",
DROP COLUMN "last_name",
DROP COLUMN "listenerId",
DROP COLUMN "middle_name",
DROP COLUMN "passport_document_expired_date",
DROP COLUMN "passport_document_issued_date",
DROP COLUMN "passport_document_numbers",
DROP COLUMN "passport_document_series",
DROP COLUMN "passport_document_type_id",
DROP COLUMN "passport_document_type_name",
DROP COLUMN "personId",
DROP COLUMN "profession_classifier_code_1",
DROP COLUMN "profession_classifier_code_2",
DROP COLUMN "profession_classifier_code_3",
DROP COLUMN "profession_classifier_code_4",
DROP COLUMN "profession_classifier_code_5",
DROP COLUMN "profession_name_1",
DROP COLUMN "profession_name_2",
DROP COLUMN "profession_name_3",
DROP COLUMN "profession_name_4",
DROP COLUMN "profession_name_5",
DROP COLUMN "profession_rang_name_1",
DROP COLUMN "profession_rang_name_2",
DROP COLUMN "profession_rang_name_3",
DROP COLUMN "profession_rang_name_4",
DROP COLUMN "profession_rang_name_5",
DROP COLUMN "reason",
DROP COLUMN "rnokpp",
DROP COLUMN "universityId",
DROP COLUMN "unzr",
ADD COLUMN     "academic_leave_type_name" TEXT,
ADD COLUMN     "budget_transfer_category_id" INTEGER,
ADD COLUMN     "budget_transfer_category_name" TEXT,
ADD COLUMN     "course_id" INTEGER,
ADD COLUMN     "course_name" TEXT,
ADD COLUMN     "date_begin" TIMESTAMP(3),
ADD COLUMN     "date_end" TIMESTAMP(3),
ADD COLUMN     "education_form_id" INTEGER,
ADD COLUMN     "education_history_actual_id" INTEGER NOT NULL,
ADD COLUMN     "education_id" INTEGER NOT NULL,
ADD COLUMN     "expel_education_type_name" TEXT,
ADD COLUMN     "faculty_name" TEXT,
ADD COLUMN     "foreign_type_id" INTEGER,
ADD COLUMN     "foreign_type_name" TEXT,
ADD COLUMN     "full_speciality_name" TEXT,
ADD COLUMN     "group_name" TEXT,
ADD COLUMN     "history_type_id" INTEGER NOT NULL,
ADD COLUMN     "is_dual_form" BOOLEAN,
ADD COLUMN     "is_for_phd_renewal" BOOLEAN,
ADD COLUMN     "is_second_higher" BOOLEAN,
ADD COLUMN     "is_short_term" BOOLEAN,
ADD COLUMN     "license_year" INTEGER,
ADD COLUMN     "person_code_u" TEXT NOT NULL,
ADD COLUMN     "person_fio" TEXT NOT NULL,
ADD COLUMN     "person_id" INTEGER NOT NULL,
ADD COLUMN     "profession_info" TEXT,
ADD COLUMN     "qualification_group_id" INTEGER,
ADD COLUMN     "qualification_group_name" TEXT,
ADD COLUMN     "study_program_name" TEXT,
ADD COLUMN     "university_id" INTEGER NOT NULL,
ADD COLUMN     "university_study_program_id" INTEGER,
ALTER COLUMN "birthday" DROP NOT NULL,
ALTER COLUMN "person_sex_name" DROP NOT NULL,
ALTER COLUMN "education_form_name" DROP NOT NULL,
ALTER COLUMN "education_date_begin" DROP NOT NULL,
ALTER COLUMN "education_date_end" DROP NOT NULL,
ALTER COLUMN "modify_date" DROP NOT NULL;

-- AlterTable
ALTER TABLE "teachers" DROP COLUMN "country_id",
DROP COLUMN "passport_document_date_get",
DROP COLUMN "passport_document_expired_date",
DROP COLUMN "passport_document_numbers",
DROP COLUMN "passport_document_series",
DROP COLUMN "passport_document_type_id",
DROP COLUMN "passport_document_type_name",
DROP COLUMN "pedagogic_title_id",
DROP COLUMN "pedagogic_title_name",
DROP COLUMN "rnokpp",
DROP COLUMN "university_id",
DROP COLUMN "unzr",
ADD COLUMN     "dignity_ids_str" TEXT,
ADD COLUMN     "dignity_names" TEXT,
ALTER COLUMN "birthday" DROP NOT NULL,
ALTER COLUMN "modify_date" DROP NOT NULL;
