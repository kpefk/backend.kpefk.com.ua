-- AlterTable
ALTER TABLE "admission_applications" ADD COLUMN     "entry_edu_doc_date_get" TIMESTAMP(3),
ADD COLUMN     "entry_edu_doc_fetched_at" TIMESTAMP(3),
ADD COLUMN     "entry_edu_doc_issued" TEXT,
ADD COLUMN     "entry_edu_doc_number" TEXT,
ADD COLUMN     "entry_edu_doc_series" TEXT,
ADD COLUMN     "entry_edu_doc_type_name" TEXT,
ADD COLUMN     "entry_edu_doc_year_end" INTEGER;

