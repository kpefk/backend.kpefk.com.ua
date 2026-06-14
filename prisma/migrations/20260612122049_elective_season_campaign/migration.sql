-- DropIndex
DROP INDEX "uq_tlla_no_subgroup";

-- DropIndex
DROP INDEX "uq_tlla_with_subgroup";

-- DropIndex
DROP INDEX "uq_tlsa_no_group";

-- DropIndex
DROP INDEX "uq_tlsa_with_group";

-- AlterTable
ALTER TABLE "elective_block_seasons" ADD COLUMN     "elective_season_id" TEXT;

-- AlterTable
ALTER TABLE "group_elective_selections" ADD COLUMN     "order_date" TIMESTAMP(3),
ADD COLUMN     "order_number" TEXT,
ADD COLUMN     "season_id" TEXT;

-- CreateTable
CREATE TABLE "elective_seasons" (
    "id" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "status" "CatalogStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "selection_deadline" TIMESTAMP(3),
    "late_deadline" TIMESTAMP(3),
    "pedagogical_council_date" TIMESTAMP(3),
    "pedagogical_council_protocol_number" TEXT,
    "director_order_number" TEXT,
    "director_order_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "elective_seasons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "elective_seasons_academic_year_key" ON "elective_seasons"("academic_year");

-- CreateIndex
CREATE INDEX "group_elective_selections_season_id_idx" ON "group_elective_selections"("season_id");

-- AddForeignKey
ALTER TABLE "group_elective_selections" ADD CONSTRAINT "group_elective_selections_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "elective_block_seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "elective_block_seasons" ADD CONSTRAINT "elective_block_seasons_elective_season_id_fkey" FOREIGN KEY ("elective_season_id") REFERENCES "elective_seasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
