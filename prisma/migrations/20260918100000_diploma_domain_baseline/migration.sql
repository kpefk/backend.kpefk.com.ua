-- Домен дипломів і реквізити керівника закладу.
--
-- Ці об'єкти існують у dev/production, бо свого часу були створені через
-- `prisma db push` без міграції. Через це історія міграцій не відтворювала
-- schema.prisma: тір, розгорнутий з нуля, лишався без усього модуля дипломів.
-- Міграція закриває розрив і робить історію самодостатньою.
--
-- Усі операції ідемпотентні (IF NOT EXISTS, перевірки pg_type і pg_constraint),
-- тож на базах, де ці об'єкти вже є, міграція виконується як no-op.

-- CreateEnum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DiplomaVariant') THEN
        CREATE TYPE "DiplomaVariant" AS ENUM ('EXAM', 'EDKI', 'DIPLOMA_WORK', 'DIPLOMA_PROJECT');
    END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DiplomaComponentType') THEN
        CREATE TYPE "DiplomaComponentType" AS ENUM ('REGULAR', 'ELECTIVE', 'COURSE_WORK', 'PRACTICE', 'ATTESTATION');
    END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DiplomaGrade') THEN
        CREATE TYPE "DiplomaGrade" AS ENUM ('EXCELLENT', 'GOOD', 'SATISFACTORY', 'PASSED');
    END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DiplomaStatus') THEN
        CREATE TYPE "DiplomaStatus" AS ENUM ('DRAFT', 'READY');
    END IF;
END $$;

-- AlterTable
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS     "rector_work_date_finish" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "rector_work_date_start" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "diploma_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "specialty_code" TEXT,
    "specialty_name" TEXT,
    "variant" "DiplomaVariant" NOT NULL,
    "diploma_docx" BYTEA,
    "addendum_docx" BYTEA,
    "qualification_name_uk" TEXT,
    "qualification_name_uk2" TEXT,
    "qualification_name_en" TEXT,
    "qualification_name_en2" TEXT,
    "degree_name_uk" TEXT,
    "degree_name_en" TEXT,
    "study_period" TEXT,
    "accr_cert_number" TEXT,
    "accr_cert_series" TEXT,
    "accr_cert_date" TEXT,
    "accr_cert_end_date" TEXT,
    "accr_protocol_number" TEXT,
    "accr_institution_name" TEXT,
    "accr_institution_name_en" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diploma_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "diploma_template_components" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "code" TEXT,
    "name_uk" TEXT NOT NULL,
    "name_en" TEXT,
    "ects" DECIMAL(5,1),
    "type" "DiplomaComponentType" NOT NULL,
    "control_form" "TermControlForm",
    "order_index" INTEGER NOT NULL,

    CONSTRAINT "diploma_template_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "diploma_batches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "academic_year" TEXT,
    "source_file_name" TEXT,
    "imported_by_id" TEXT,
    "count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diploma_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "diplomas" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT,
    "template_id" TEXT,
    "last_name_uk" TEXT NOT NULL,
    "first_name_uk" TEXT NOT NULL,
    "last_name_en" TEXT,
    "first_name_en" TEXT,
    "birthday" TIMESTAMP(3),
    "edebo_person_code" TEXT,
    "person_id" INTEGER,
    "person_education_id" INTEGER,
    "inn" TEXT,
    "sex_name" TEXT,
    "document_series" TEXT,
    "document_number" TEXT,
    "supplement_id" INTEGER,
    "graduate_date" TIMESTAMP(3),
    "issue_date" TIMESTAMP(3),
    "speciality_name" TEXT,
    "speciality_name_en" TEXT,
    "qualification_name" TEXT,
    "study_program_name" TEXT,
    "study_program_name_en" TEXT,
    "study_group_name" TEXT,
    "course_name" TEXT,
    "accreditation_name" TEXT,
    "accreditation_name_en" TEXT,
    "boss_fio" TEXT,
    "boss_post" TEXT,
    "boss_fio_en" TEXT,
    "boss_post_en" TEXT,
    "university_print_name" TEXT,
    "university_print_name_en" TEXT,
    "payment_type_name" TEXT,
    "education_form_name" TEXT,
    "entry_document_uk" TEXT,
    "entry_document_en" TEXT,
    "entry_year_end" INTEGER,
    "study_date_begin" TIMESTAMP(3),
    "study_date_end" TIMESTAMP(3),
    "qualification_work_title_uk" TEXT,
    "qualification_work_title_en" TEXT,
    "is_honors" BOOLEAN NOT NULL DEFAULT false,
    "status" "DiplomaStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diplomas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "diploma_components" (
    "id" TEXT NOT NULL,
    "diploma_id" TEXT NOT NULL,
    "code" TEXT,
    "name_uk" TEXT NOT NULL,
    "name_en" TEXT,
    "ects" DECIMAL(5,1),
    "type" "DiplomaComponentType" NOT NULL,
    "control_form" "TermControlForm",
    "order_index" INTEGER NOT NULL,
    "grade" "DiplomaGrade",

    CONSTRAINT "diploma_components_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "diploma_templates_specialty_code_idx" ON "diploma_templates"("specialty_code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "diploma_template_components_template_id_order_index_idx" ON "diploma_template_components"("template_id", "order_index");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "diplomas_batch_id_idx" ON "diplomas"("batch_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "diplomas_template_id_idx" ON "diplomas"("template_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "diploma_components_diploma_id_order_index_idx" ON "diploma_components"("diploma_id", "order_index");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'diploma_template_components_template_id_fkey') THEN
        ALTER TABLE "diploma_template_components" ADD CONSTRAINT "diploma_template_components_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "diploma_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'diplomas_batch_id_fkey') THEN
        ALTER TABLE "diplomas" ADD CONSTRAINT "diplomas_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "diploma_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'diplomas_template_id_fkey') THEN
        ALTER TABLE "diplomas" ADD CONSTRAINT "diplomas_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "diploma_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'diploma_components_diploma_id_fkey') THEN
        ALTER TABLE "diploma_components" ADD CONSTRAINT "diploma_components_diploma_id_fkey" FOREIGN KEY ("diploma_id") REFERENCES "diplomas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

