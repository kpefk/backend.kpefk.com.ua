-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "curator_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "groups_name_key" ON "groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "groups_curator_id_key" ON "groups"("curator_id");

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_curator_id_fkey" FOREIGN KEY ("curator_id") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
