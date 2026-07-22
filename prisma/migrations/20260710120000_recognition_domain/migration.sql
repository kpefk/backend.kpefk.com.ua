-- CreateEnum
CREATE TYPE "GradeOrigin" AS ENUM ('REGULAR', 'RECOGNIZED', 'MOBILITY');

-- CreateEnum
CREATE TYPE "RecognitionStatus" AS ENUM ('DRAFT', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "CreditRecognitionType" AS ENUM ('PRIOR_EDUCATION', 'NON_FORMAL');

-- CreateEnum
CREATE TYPE "MobilityDirection" AS ENUM ('OUTBOUND', 'INBOUND');

-- AlterTable
ALTER TABLE "semester_grades" ADD COLUMN     "origin" "GradeOrigin" NOT NULL DEFAULT 'REGULAR';

-- CreateTable
CREATE TABLE "credit_recognitions" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "type" "CreditRecognitionType" NOT NULL,
    "status" "RecognitionStatus" NOT NULL DEFAULT 'DRAFT',
    "source_institution_name" TEXT NOT NULL,
    "source_university_id" TEXT,
    "source_document" TEXT,
    "source_document_date" TIMESTAMP(3),
    "protocol_number" TEXT,
    "protocol_date" TIMESTAMP(3),
    "decided_by_id" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_recognitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_recognition_items" (
    "id" TEXT NOT NULL,
    "recognition_id" TEXT NOT NULL,
    "curriculum_component_term_id" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "credits_ects" DECIMAL(6,2) NOT NULL,
    "final_grade" INTEGER,
    "national_grade" "NationalGrade" NOT NULL,
    "generated_grade_id" TEXT,

    CONSTRAINT "credit_recognition_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_mobilities" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "direction" "MobilityDirection" NOT NULL,
    "status" "RecognitionStatus" NOT NULL DEFAULT 'DRAFT',
    "partner_institution_name" TEXT NOT NULL,
    "partner_university_id" TEXT,
    "country" TEXT,
    "period_from" TIMESTAMP(3) NOT NULL,
    "period_to" TIMESTAMP(3) NOT NULL,
    "agreement_number" TEXT,
    "agreement_date" TIMESTAMP(3),
    "protocol_number" TEXT,
    "protocol_date" TIMESTAMP(3),
    "decided_by_id" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_mobilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_mobility_items" (
    "id" TEXT NOT NULL,
    "mobility_id" TEXT NOT NULL,
    "curriculum_component_term_id" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "credits_ects" DECIMAL(6,2) NOT NULL,
    "final_grade" INTEGER,
    "national_grade" "NationalGrade" NOT NULL,
    "partner_component_name" TEXT,
    "generated_grade_id" TEXT,

    CONSTRAINT "academic_mobility_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "credit_recognitions_student_id_idx" ON "credit_recognitions"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "credit_recognition_items_generated_grade_id_key" ON "credit_recognition_items"("generated_grade_id");

-- CreateIndex
CREATE INDEX "credit_recognition_items_curriculum_component_term_id_idx" ON "credit_recognition_items"("curriculum_component_term_id");

-- CreateIndex
CREATE UNIQUE INDEX "credit_recognition_items_recognition_id_curriculum_componen_key" ON "credit_recognition_items"("recognition_id", "curriculum_component_term_id");

-- CreateIndex
CREATE INDEX "academic_mobilities_student_id_idx" ON "academic_mobilities"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "academic_mobility_items_generated_grade_id_key" ON "academic_mobility_items"("generated_grade_id");

-- CreateIndex
CREATE INDEX "academic_mobility_items_curriculum_component_term_id_idx" ON "academic_mobility_items"("curriculum_component_term_id");

-- CreateIndex
CREATE UNIQUE INDEX "academic_mobility_items_mobility_id_curriculum_component_te_key" ON "academic_mobility_items"("mobility_id", "curriculum_component_term_id");

-- AddForeignKey
ALTER TABLE "credit_recognitions" ADD CONSTRAINT "credit_recognitions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_recognitions" ADD CONSTRAINT "credit_recognitions_source_university_id_fkey" FOREIGN KEY ("source_university_id") REFERENCES "universities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_recognitions" ADD CONSTRAINT "credit_recognitions_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_recognition_items" ADD CONSTRAINT "credit_recognition_items_recognition_id_fkey" FOREIGN KEY ("recognition_id") REFERENCES "credit_recognitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_recognition_items" ADD CONSTRAINT "credit_recognition_items_curriculum_component_term_id_fkey" FOREIGN KEY ("curriculum_component_term_id") REFERENCES "curriculum_component_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_recognition_items" ADD CONSTRAINT "credit_recognition_items_generated_grade_id_fkey" FOREIGN KEY ("generated_grade_id") REFERENCES "semester_grades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_mobilities" ADD CONSTRAINT "academic_mobilities_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_mobilities" ADD CONSTRAINT "academic_mobilities_partner_university_id_fkey" FOREIGN KEY ("partner_university_id") REFERENCES "universities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_mobilities" ADD CONSTRAINT "academic_mobilities_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_mobility_items" ADD CONSTRAINT "academic_mobility_items_mobility_id_fkey" FOREIGN KEY ("mobility_id") REFERENCES "academic_mobilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_mobility_items" ADD CONSTRAINT "academic_mobility_items_curriculum_component_term_id_fkey" FOREIGN KEY ("curriculum_component_term_id") REFERENCES "curriculum_component_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_mobility_items" ADD CONSTRAINT "academic_mobility_items_generated_grade_id_fkey" FOREIGN KEY ("generated_grade_id") REFERENCES "semester_grades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

