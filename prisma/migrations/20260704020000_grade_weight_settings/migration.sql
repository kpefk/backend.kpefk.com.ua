-- CreateTable
CREATE TABLE "grade_weight_settings" (
    "id" TEXT NOT NULL,
    "current_weight" INTEGER NOT NULL DEFAULT 60,
    "exam_weight" INTEGER NOT NULL DEFAULT 40,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grade_weight_settings_pkey" PRIMARY KEY ("id")
);

