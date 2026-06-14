-- AlterTable
ALTER TABLE "curriculum_versions" ALTER COLUMN "approval_date" DROP NOT NULL,
ALTER COLUMN "approval_order_number" DROP NOT NULL,
ALTER COLUMN "approved_by" DROP NOT NULL;
