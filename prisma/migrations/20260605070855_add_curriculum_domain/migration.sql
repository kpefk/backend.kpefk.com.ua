-- CreateEnum
CREATE TYPE "EducationForm" AS ENUM ('FULL_TIME', 'PART_TIME', 'DUAL');

-- CreateEnum
CREATE TYPE "AdmissionBasis" AS ENUM ('AFTER_9TH_GRADE', 'AFTER_11TH_GRADE');

-- CreateEnum
CREATE TYPE "CurriculumSectionType" AS ENUM ('SECONDARY_EDUCATION', 'GENERAL_COMPETENCY', 'PROFESSIONAL_COMPETENCY', 'ELECTIVE', 'PRACTICE', 'ATTESTATION');

-- CreateEnum
CREATE TYPE "ComponentType" AS ENUM ('DISCIPLINE', 'PRACTICE', 'COURSE_WORK', 'COURSE_PROJECT', 'DIPLOMA_PROJECT', 'QUALIFICATION_WORK_DEFENSE', 'QUALIFICATION_EXAM', 'STATE_EXAM');

-- CreateEnum
CREATE TYPE "ControlForm" AS ENUM ('EXAM', 'TEST', 'DIFFERENTIATED_TEST', 'COURSE_WORK', 'COURSE_PROJECT', 'NONE');

-- CreateEnum
CREATE TYPE "PracticeType" AS ENUM ('EDUCATIONAL', 'TECHNOLOGICAL', 'PRE_GRADUATION');

-- CreateEnum
CREATE TYPE "CalendarWeekType" AS ENUM ('INSTRUCTION', 'EXAM_SESSION', 'PRACTICE', 'HOLIDAY', 'NATIONAL_HOLIDAY', 'STATE_ATTESTATION', 'GRADUATION_WORK', 'DEFENSE');

-- CreateEnum
CREATE TYPE "IndividualPlanDeviationType" AS ENUM ('ELECTIVE_SELECTION', 'RETAKE', 'EXTENDED_DEADLINE', 'TRANSFERRED_CREDIT', 'EXEMPTED', 'ACCELERATED', 'ADDITIONAL_COMPONENT');

-- CreateTable
CREATE TABLE "specialties" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "specialties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "educational_programs" (
    "id" TEXT NOT NULL,
    "specialty_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "qualification_name" TEXT NOT NULL,
    "qualification_level" TEXT,
    "edebo_id" INTEGER,
    "approval_date" TIMESTAMP(3),
    "approval_order_number" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "educational_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curricula" (
    "id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "education_form" "EducationForm" NOT NULL,
    "admission_basis" "AdmissionBasis" NOT NULL,
    "entry_year" INTEGER NOT NULL,
    "study_duration_months" INTEGER NOT NULL,
    "total_ects" DECIMAL(6,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "curricula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_versions" (
    "id" TEXT NOT NULL,
    "curriculum_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "approval_date" TIMESTAMP(3) NOT NULL,
    "approval_order_number" TEXT NOT NULL,
    "approved_by" TEXT NOT NULL,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "deprecated_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curriculum_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_sections" (
    "id" TEXT NOT NULL,
    "version_id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "section_type" "CurriculumSectionType" NOT NULL,
    "subtotal_ects" DECIMAL(6,2),

    CONSTRAINT "curriculum_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "elective_blocks" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "semester_number" INTEGER NOT NULL,
    "min_selections" INTEGER NOT NULL DEFAULT 1,
    "max_selections" INTEGER NOT NULL DEFAULT 1,
    "order_index" INTEGER NOT NULL,

    CONSTRAINT "elective_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_components" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "elective_block_id" TEXT,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "component_type" "ComponentType" NOT NULL,
    "total_ects" DECIMAL(6,2) NOT NULL,
    "total_hours" INTEGER NOT NULL,
    "order_index" INTEGER NOT NULL,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT true,
    "practice_type" "PracticeType",
    "course_work_count" INTEGER NOT NULL DEFAULT 0,
    "course_project_count" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "curriculum_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_component_terms" (
    "id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,
    "semester_number" INTEGER NOT NULL,
    "ects" DECIMAL(6,2) NOT NULL,
    "hours" INTEGER NOT NULL,
    "control_form" "ControlForm" NOT NULL,
    "has_course_work" BOOLEAN NOT NULL DEFAULT false,
    "has_course_project" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "curriculum_component_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_budget_entries" (
    "id" TEXT NOT NULL,
    "version_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "total_hours" INTEGER NOT NULL,
    "total_ects" DECIMAL(6,2),
    "order_index" INTEGER NOT NULL,

    CONSTRAINT "time_budget_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_calendar_entries" (
    "id" TEXT NOT NULL,
    "version_id" TEXT NOT NULL,
    "course_number" INTEGER NOT NULL,
    "semester_number" INTEGER NOT NULL,
    "week_number" INTEGER NOT NULL,
    "week_type" "CalendarWeekType" NOT NULL,

    CONSTRAINT "academic_calendar_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_curriculum_assignments" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "curriculum_id" TEXT NOT NULL,
    "version_id" TEXT NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_until" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "assigned_by" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_curriculum_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "working_curricula" (
    "id" TEXT NOT NULL,
    "version_id" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "semester_numbers" INTEGER[],
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "approved_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "working_curricula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "working_curriculum_component_terms" (
    "id" TEXT NOT NULL,
    "working_curriculum_id" TEXT NOT NULL,
    "component_term_id" TEXT NOT NULL,
    "lecture_hours" INTEGER NOT NULL DEFAULT 0,
    "practical_hours" INTEGER NOT NULL DEFAULT 0,
    "lab_hours" INTEGER NOT NULL DEFAULT 0,
    "seminar_hours" INTEGER NOT NULL DEFAULT 0,
    "independent_hours" INTEGER NOT NULL DEFAULT 0,
    "consultation_hours" INTEGER NOT NULL DEFAULT 0,
    "weekly_lecture_hours" DECIMAL(4,1),
    "weekly_practical_hours" DECIMAL(4,1),

    CONSTRAINT "working_curriculum_component_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_working_curriculum_assignments" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "working_curriculum_id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "assigned_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_working_curriculum_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_elective_selections" (
    "id" TEXT NOT NULL,
    "block_id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "selected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "selected_by" TEXT,

    CONSTRAINT "group_elective_selections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_elective_selections" (
    "id" TEXT NOT NULL,
    "block_id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "override_reason" TEXT,
    "selected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_elective_selections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_individual_plans" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "approved_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_individual_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_individual_plan_items" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,
    "semester_number" INTEGER NOT NULL,
    "deviation_type" "IndividualPlanDeviationType" NOT NULL,
    "notes" TEXT,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "student_individual_plan_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "specialties_code_key" ON "specialties"("code");

-- CreateIndex
CREATE UNIQUE INDEX "educational_programs_edebo_id_key" ON "educational_programs"("edebo_id");

-- CreateIndex
CREATE INDEX "educational_programs_specialty_id_idx" ON "educational_programs"("specialty_id");

-- CreateIndex
CREATE INDEX "curricula_program_id_idx" ON "curricula"("program_id");

-- CreateIndex
CREATE INDEX "curricula_entry_year_idx" ON "curricula"("entry_year");

-- CreateIndex
CREATE UNIQUE INDEX "curricula_program_id_education_form_admission_basis_entry_y_key" ON "curricula"("program_id", "education_form", "admission_basis", "entry_year");

-- CreateIndex
CREATE INDEX "curriculum_versions_curriculum_id_idx" ON "curriculum_versions"("curriculum_id");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_versions_curriculum_id_version_number_key" ON "curriculum_versions"("curriculum_id", "version_number");

-- CreateIndex
CREATE INDEX "curriculum_sections_version_id_idx" ON "curriculum_sections"("version_id");

-- CreateIndex
CREATE INDEX "elective_blocks_section_id_idx" ON "elective_blocks"("section_id");

-- CreateIndex
CREATE INDEX "curriculum_components_section_id_idx" ON "curriculum_components"("section_id");

-- CreateIndex
CREATE INDEX "curriculum_components_elective_block_id_idx" ON "curriculum_components"("elective_block_id");

-- CreateIndex
CREATE INDEX "curriculum_component_terms_component_id_idx" ON "curriculum_component_terms"("component_id");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_component_terms_component_id_semester_number_key" ON "curriculum_component_terms"("component_id", "semester_number");

-- CreateIndex
CREATE INDEX "time_budget_entries_version_id_idx" ON "time_budget_entries"("version_id");

-- CreateIndex
CREATE INDEX "academic_calendar_entries_version_id_idx" ON "academic_calendar_entries"("version_id");

-- CreateIndex
CREATE UNIQUE INDEX "academic_calendar_entries_version_id_course_number_semester_key" ON "academic_calendar_entries"("version_id", "course_number", "semester_number", "week_number");

-- CreateIndex
CREATE INDEX "group_curriculum_assignments_group_id_is_active_idx" ON "group_curriculum_assignments"("group_id", "is_active");

-- CreateIndex
CREATE INDEX "group_curriculum_assignments_version_id_idx" ON "group_curriculum_assignments"("version_id");

-- CreateIndex
CREATE INDEX "working_curricula_version_id_idx" ON "working_curricula"("version_id");

-- CreateIndex
CREATE UNIQUE INDEX "working_curricula_version_id_academic_year_key" ON "working_curricula"("version_id", "academic_year");

-- CreateIndex
CREATE INDEX "working_curriculum_component_terms_working_curriculum_id_idx" ON "working_curriculum_component_terms"("working_curriculum_id");

-- CreateIndex
CREATE UNIQUE INDEX "working_curriculum_component_terms_working_curriculum_id_co_key" ON "working_curriculum_component_terms"("working_curriculum_id", "component_term_id");

-- CreateIndex
CREATE INDEX "group_working_curriculum_assignments_working_curriculum_id_idx" ON "group_working_curriculum_assignments"("working_curriculum_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_working_curriculum_assignments_group_id_academic_year_key" ON "group_working_curriculum_assignments"("group_id", "academic_year");

-- CreateIndex
CREATE INDEX "group_elective_selections_assignment_id_idx" ON "group_elective_selections"("assignment_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_elective_selections_block_id_assignment_id_key" ON "group_elective_selections"("block_id", "assignment_id");

-- CreateIndex
CREATE INDEX "student_elective_selections_student_id_idx" ON "student_elective_selections"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_elective_selections_block_id_student_id_key" ON "student_elective_selections"("block_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_individual_plans_student_id_key" ON "student_individual_plans"("student_id");

-- CreateIndex
CREATE INDEX "student_individual_plan_items_plan_id_idx" ON "student_individual_plan_items"("plan_id");

-- AddForeignKey
ALTER TABLE "educational_programs" ADD CONSTRAINT "educational_programs_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "specialties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curricula" ADD CONSTRAINT "curricula_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "educational_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_versions" ADD CONSTRAINT "curriculum_versions_curriculum_id_fkey" FOREIGN KEY ("curriculum_id") REFERENCES "curricula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_sections" ADD CONSTRAINT "curriculum_sections_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "curriculum_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "elective_blocks" ADD CONSTRAINT "elective_blocks_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "curriculum_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_components" ADD CONSTRAINT "curriculum_components_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "curriculum_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_components" ADD CONSTRAINT "curriculum_components_elective_block_id_fkey" FOREIGN KEY ("elective_block_id") REFERENCES "elective_blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_component_terms" ADD CONSTRAINT "curriculum_component_terms_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "curriculum_components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_budget_entries" ADD CONSTRAINT "time_budget_entries_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "curriculum_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_calendar_entries" ADD CONSTRAINT "academic_calendar_entries_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "curriculum_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_curriculum_assignments" ADD CONSTRAINT "group_curriculum_assignments_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_curriculum_assignments" ADD CONSTRAINT "group_curriculum_assignments_curriculum_id_fkey" FOREIGN KEY ("curriculum_id") REFERENCES "curricula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_curriculum_assignments" ADD CONSTRAINT "group_curriculum_assignments_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "curriculum_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "working_curricula" ADD CONSTRAINT "working_curricula_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "curriculum_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "working_curriculum_component_terms" ADD CONSTRAINT "working_curriculum_component_terms_working_curriculum_id_fkey" FOREIGN KEY ("working_curriculum_id") REFERENCES "working_curricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "working_curriculum_component_terms" ADD CONSTRAINT "working_curriculum_component_terms_component_term_id_fkey" FOREIGN KEY ("component_term_id") REFERENCES "curriculum_component_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_working_curriculum_assignments" ADD CONSTRAINT "group_working_curriculum_assignments_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_working_curriculum_assignments" ADD CONSTRAINT "group_working_curriculum_assignments_working_curriculum_id_fkey" FOREIGN KEY ("working_curriculum_id") REFERENCES "working_curricula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_working_curriculum_assignments" ADD CONSTRAINT "group_working_curriculum_assignments_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "group_curriculum_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_elective_selections" ADD CONSTRAINT "group_elective_selections_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "elective_blocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_elective_selections" ADD CONSTRAINT "group_elective_selections_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "curriculum_components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_elective_selections" ADD CONSTRAINT "group_elective_selections_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "group_curriculum_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_elective_selections" ADD CONSTRAINT "student_elective_selections_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "elective_blocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_elective_selections" ADD CONSTRAINT "student_elective_selections_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "curriculum_components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_elective_selections" ADD CONSTRAINT "student_elective_selections_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_individual_plans" ADD CONSTRAINT "student_individual_plans_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_individual_plans" ADD CONSTRAINT "student_individual_plans_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "group_curriculum_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_individual_plan_items" ADD CONSTRAINT "student_individual_plan_items_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "student_individual_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_individual_plan_items" ADD CONSTRAINT "student_individual_plan_items_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "curriculum_components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
