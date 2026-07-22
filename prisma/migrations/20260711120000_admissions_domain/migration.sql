-- CreateEnum
CREATE TYPE "AdmissionCampaignStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "admission_campaigns" (
    "id" TEXT NOT NULL,
    "admission_year" INTEGER NOT NULL,
    "status" "AdmissionCampaignStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_synced_at" TIMESTAMP(3),
    "pii_purged_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admission_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admission_offers" (
    "id" TEXT NOT NULL,
    "admission_year" INTEGER NOT NULL,
    "university_specialities_id" INTEGER NOT NULL,
    "university_specialities_name" TEXT,
    "speciality_code" TEXT,
    "speciality_name" TEXT,
    "specialization_name" TEXT,
    "qualification_group_name" TEXT,
    "education_base_name" TEXT,
    "education_form_name" TEXT,
    "course_name" TEXT,
    "offer_type_name" TEXT,
    "max_order" INTEGER,
    "budget_order" INTEGER,
    "min_order" INTEGER,
    "total_order" INTEGER,
    "order_contract" INTEGER,
    "order_license" INTEGER,
    "education_price" INTEGER,
    "currency_name" TEXT,
    "person_request_date_start" TIMESTAMP(3),
    "person_request_date_end" TIMESTAMP(3),
    "program_names" TEXT,
    "raw" JSONB,
    "synced_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admission_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admission_applications" (
    "id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "admission_year" INTEGER NOT NULL,
    "person_request_id" TEXT NOT NULL,
    "person_code_u" TEXT,
    "status_type_id" TEXT,
    "status_type_name" TEXT,
    "konkurs_value" DECIMAL(6,3),
    "request_priority" INTEGER,
    "enroll_priority" INTEGER,
    "enroll_level" INTEGER,
    "is_ez" BOOLEAN,
    "is_claim_for_budget" BOOLEAN,
    "is_claim_for_contract" BOOLEAN,
    "budget_recommendation_type_id" INTEGER,
    "contract_recommendation_type_id" INTEGER,
    "alg_recommendation_type_id" INTEGER,
    "is_original_documents_added" BOOLEAN,
    "is_confirmed_contract" BOOLEAN,
    "is_signed_decision" BOOLEAN,
    "document_award_type_id" INTEGER,
    "foreign_type_id" INTEGER,
    "country_id" INTEGER,
    "order_of_enrollment_id" INTEGER,
    "date_create" TIMESTAMP(3),
    "date_last_change" TIMESTAMP(3),
    "fio" TEXT,
    "birthday" TIMESTAMP(3),
    "person_sex_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "document_type_id" INTEGER,
    "document_series" TEXT,
    "document_numbers" TEXT,
    "document_issued" TEXT,
    "document_date_get" TIMESTAMP(3),
    "personal_code" TEXT,
    "synced_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admission_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admission_campaigns_admission_year_key" ON "admission_campaigns"("admission_year");

-- CreateIndex
CREATE INDEX "admission_offers_admission_year_idx" ON "admission_offers"("admission_year");

-- CreateIndex
CREATE UNIQUE INDEX "admission_offers_admission_year_university_specialities_id_key" ON "admission_offers"("admission_year", "university_specialities_id");

-- CreateIndex
CREATE INDEX "admission_applications_offer_id_idx" ON "admission_applications"("offer_id");

-- CreateIndex
CREATE INDEX "admission_applications_admission_year_idx" ON "admission_applications"("admission_year");

-- CreateIndex
CREATE INDEX "admission_applications_person_code_u_idx" ON "admission_applications"("person_code_u");

-- CreateIndex
CREATE UNIQUE INDEX "admission_applications_admission_year_person_request_id_key" ON "admission_applications"("admission_year", "person_request_id");

-- AddForeignKey
ALTER TABLE "admission_applications" ADD CONSTRAINT "admission_applications_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "admission_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

