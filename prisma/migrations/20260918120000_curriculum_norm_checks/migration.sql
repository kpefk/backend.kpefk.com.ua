-- Нормативні перевірки навчальних планів (Наказ МОН № 510, розд. V і IX;
-- Наказ МОН № 686 у ред. Наказу № 472, п. 19, 21, 22).

-- AlterEnum
ALTER TYPE "LessonType" ADD VALUE IF NOT EXISTS 'ATTESTATION_COMMITTEE';
ALTER TYPE "LessonType" ADD VALUE IF NOT EXISTS 'ATTESTATION_CONSULTATION';

-- AlterTable
ALTER TABLE "specialties" ADD COLUMN     "normative_ects" DECIMAL(6,2);
ALTER TABLE "specialties" ADD COLUMN     "standard_reference" TEXT;

-- AlterTable
ALTER TABLE "working_curriculum_component_terms" ADD COLUMN     "attestation_committee_size" INTEGER NOT NULL DEFAULT 3;

-- Нормативний обсяг ОПП зі стандартів фахової передвищої освіти (розд. 3 стандарту).
-- Заповнюється лише там, де код спеціальності збігається з кодом переліку
-- (Постанова КМУ № 266). Якщо заклад веде власні коди ("F3", "D3") — рядки
-- лишаються порожніми і обсяг вноситься через інтерфейс; перевірка обсягу тоді
-- пропускається з попередженням STANDARD_ECTS_UNKNOWN.
UPDATE "specialties" SET "normative_ects" = 120 WHERE "code" = '071' AND "normative_ects" IS NULL;
UPDATE "specialties" SET "normative_ects" = 150 WHERE "code" = '073' AND "normative_ects" IS NULL;
UPDATE "specialties" SET "normative_ects" = 180 WHERE "code" = '122' AND "normative_ects" IS NULL;
UPDATE "specialties" SET "normative_ects" = 180 WHERE "code" = '133' AND "normative_ects" IS NULL;
UPDATE "specialties" SET "normative_ects" = 180 WHERE "code" = '274' AND "normative_ects" IS NULL;
UPDATE "specialties" SET "normative_ects" = 180 WHERE "code" = '275' AND "normative_ects" IS NULL;
