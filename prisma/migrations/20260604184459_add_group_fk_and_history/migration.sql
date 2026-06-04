-- CreateEnum
CREATE TYPE "GroupChangeReason" AS ENUM ('EDEBO_SYNC', 'COURSE_PROMOTION', 'TRANSFER', 'MANUAL');

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "group_id" TEXT;

-- CreateTable
CREATE TABLE "student_group_history" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "from_group_id" TEXT,
    "to_group_id" TEXT,
    "reason" "GroupChangeReason" NOT NULL DEFAULT 'EDEBO_SYNC',
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_group_history_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_group_history" ADD CONSTRAINT "student_group_history_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_group_history" ADD CONSTRAINT "student_group_history_from_group_id_fkey" FOREIGN KEY ("from_group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_group_history" ADD CONSTRAINT "student_group_history_to_group_id_fkey" FOREIGN KEY ("to_group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
