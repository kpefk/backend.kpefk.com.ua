-- AddTable: curriculum_component_display_in_sections
--
-- Lightweight display-projection table.
-- A row here means: "also render component_id inside section_id for display purposes."
-- The canonical curriculum_component record is NOT duplicated — this is a display alias only.
--
-- Invariants enforced by schema:
--   • (component_id, section_id) is UNIQUE — one projection per component per section.
--   • Both FKs have ON DELETE CASCADE: deleting the canonical component or the target
--     section automatically removes the projection row.
--   • component_id and section_id must belong to the same curriculum version (enforced
--     in the service layer, not in the DB).

-- CreateTable
CREATE TABLE "curriculum_component_display_in_sections" (
    "id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "display_marker" TEXT,
    "display_note" TEXT,

    CONSTRAINT "curriculum_component_display_in_sections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (unique pair constraint)
CREATE UNIQUE INDEX "curriculum_component_display_in_sections_component_id_section_id_key"
    ON "curriculum_component_display_in_sections"("component_id", "section_id");

-- CreateIndex (section lookup — used in findById projection query)
CREATE INDEX "curriculum_component_display_in_sections_section_id_display_order_idx"
    ON "curriculum_component_display_in_sections"("section_id", "display_order");

-- CreateIndex (component lookup — used in cascade and projection queries)
CREATE INDEX "curriculum_component_display_in_sections_component_id_idx"
    ON "curriculum_component_display_in_sections"("component_id");

-- AddForeignKey (component — cascade delete when canonical component is deleted)
ALTER TABLE "curriculum_component_display_in_sections"
    ADD CONSTRAINT "curriculum_component_display_in_sections_component_id_fkey"
    FOREIGN KEY ("component_id")
    REFERENCES "curriculum_components"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (section — cascade delete when target section is deleted)
ALTER TABLE "curriculum_component_display_in_sections"
    ADD CONSTRAINT "curriculum_component_display_in_sections_section_id_fkey"
    FOREIGN KEY ("section_id")
    REFERENCES "curriculum_sections"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
