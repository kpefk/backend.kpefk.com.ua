-- CreateTable
CREATE TABLE "student_rating_bonuses" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "semester_number" INTEGER NOT NULL,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reason" TEXT,
    "updated_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_rating_bonuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_rating_bonuses_student_id_academic_year_semester_nu_key" ON "student_rating_bonuses"("student_id", "academic_year", "semester_number");

-- AddForeignKey
ALTER TABLE "student_rating_bonuses" ADD CONSTRAINT "student_rating_bonuses_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_rating_bonuses" ADD CONSTRAINT "student_rating_bonuses_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

