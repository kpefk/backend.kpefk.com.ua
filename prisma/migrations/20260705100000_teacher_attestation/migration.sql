-- CreateEnum
CREATE TYPE "AttestationType" AS ENUM ('REGULAR', 'EXTRAORDINARY');

-- CreateTable
CREATE TABLE "teacher_attestations" (
    "id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "attestation_date" TIMESTAMP(3) NOT NULL,
    "type" "AttestationType" NOT NULL DEFAULT 'REGULAR',
    "result_category" TEXT NOT NULL,
    "result_title" TEXT,
    "corresponds_to_position" BOOLEAN NOT NULL DEFAULT true,
    "order_number" TEXT,
    "order_date" TIMESTAMP(3),
    "next_attestation_date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_attestations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "teacher_attestations_teacher_id_idx" ON "teacher_attestations"("teacher_id");

-- CreateIndex
CREATE INDEX "teacher_attestations_next_attestation_date_idx" ON "teacher_attestations"("next_attestation_date");

-- AddForeignKey
ALTER TABLE "teacher_attestations" ADD CONSTRAINT "teacher_attestations_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_attestations" ADD CONSTRAINT "teacher_attestations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

