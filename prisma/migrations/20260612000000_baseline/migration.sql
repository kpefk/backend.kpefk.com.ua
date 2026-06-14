-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";
-- CreateEnum
CREATE TYPE "public"."AdmissionBasis" AS ENUM ('AFTER_9TH_GRADE', 'AFTER_11TH_GRADE');
-- CreateEnum
CREATE TYPE "public"."CalendarWeekType" AS ENUM ('INSTRUCTION', 'EXAM_SESSION', 'PRACTICE', 'HOLIDAY', 'NATIONAL_HOLIDAY', 'STATE_ATTESTATION', 'GRADUATION_WORK', 'DEFENSE');
-- CreateEnum
CREATE TYPE "public"."CatalogStatus" AS ENUM ('DRAFT', 'OPEN', 'LATE', 'CLOSED');
-- CreateEnum
CREATE TYPE "public"."ComponentType" AS ENUM ('DISCIPLINE', 'PRACTICE', 'COURSE_WORK', 'COURSE_PROJECT', 'DIPLOMA_PROJECT', 'QUALIFICATION_WORK_DEFENSE', 'QUALIFICATION_EXAM', 'STATE_EXAM');
-- CreateEnum
CREATE TYPE "public"."ControlForm" AS ENUM ('EXAM', 'TEST', 'DIFFERENTIATED_TEST', 'COURSE_WORK', 'COURSE_PROJECT', 'NONE');
-- CreateEnum
CREATE TYPE "public"."CurriculumComponentType" AS ENUM ('REGULAR', 'PRACTICE', 'ATTESTATION', 'ELECTIVE_GROUP');
-- CreateEnum
CREATE TYPE "public"."CurriculumSectionType" AS ENUM ('SECONDARY_EDUCATION', 'GENERAL_COMPETENCY', 'PROFESSIONAL_COMPETENCY', 'ELECTIVE', 'PRACTICE', 'ATTESTATION', 'BASIC_OPP', 'ELECTIVE_OPP', 'OPTIONAL_COURSES', 'CFP');
-- CreateEnum
CREATE TYPE "public"."EducationForm" AS ENUM ('FULL_TIME', 'PART_TIME', 'DUAL');
-- CreateEnum
CREATE TYPE "public"."GroupChangeReason" AS ENUM ('EDEBO_SYNC', 'COURSE_PROMOTION', 'TRANSFER', 'MANUAL');
-- CreateEnum
CREATE TYPE "public"."IndividualPlanDeviationType" AS ENUM ('ELECTIVE_SELECTION', 'RETAKE', 'EXTENDED_DEADLINE', 'TRANSFERRED_CREDIT', 'EXEMPTED', 'ACCELERATED', 'ADDITIONAL_COMPONENT');
-- CreateEnum
CREATE TYPE "public"."LessonType" AS ENUM ('LECTURE', 'PRACTICE', 'LAB', 'SEMINAR', 'CONSULTATION', 'SPRS');
-- CreateEnum
CREATE TYPE "public"."LoadStatus" AS ENUM ('DRAFT', 'CONFIRMED');
-- CreateEnum
CREATE TYPE "public"."PracticeType" AS ENUM ('EDUCATIONAL', 'TECHNOLOGICAL', 'PRE_GRADUATION');
-- CreateEnum
CREATE TYPE "public"."QualificationUpgradeSource" AS ENUM ('EDEBO_PARSED', 'MANUAL');
-- CreateEnum
CREATE TYPE "public"."SelectionMethod" AS ENUM ('VOLUNTARY', 'ASSIGNED');
-- CreateEnum
CREATE TYPE "public"."SelectionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');
-- CreateEnum
CREATE TYPE "public"."TermControlForm" AS ENUM ('EXAM', 'CREDIT', 'GRADED_CREDIT');
-- CreateEnum
CREATE TYPE "public"."TokenType" AS ENUM ('TWO_FACTOR', 'PASSWORD_RESET');
-- CreateEnum
CREATE TYPE "public"."TwoFactorMethod" AS ENUM ('NONE', 'EMAIL', 'TOTP');
-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('STUDENT', 'TEACHER', 'SCHEDULE_DISPATCHER', 'HEAD_OF_DEPARTMENT', 'DEPUTY_DIRECTOR', 'DIRECTOR', 'ADMINISTRATOR');
-- CreateTable
CREATE TABLE "public"."academic_calendar_entries" (
    "id" TEXT NOT NULL,
    "version_id" TEXT NOT NULL,
    "course_number" INTEGER NOT NULL,
    "semester_number" INTEGER NOT NULL,
    "week_number" INTEGER NOT NULL,
    "week_type" "public"."CalendarWeekType" NOT NULL,
    CONSTRAINT "academic_calendar_entries_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "public"."classrooms" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "photos" JSONB NOT NULL DEFAULT '[]',
    "teacher_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "passport_google_file_id" TEXT,
    "passport_url" TEXT,
    CONSTRAINT "classrooms_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "public"."curricula" (
    "id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "education_form" "public"."EducationForm" NOT NULL,
    "admission_basis" "public"."AdmissionBasis" NOT NULL,
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
CREATE TABLE "public"."curriculum_component_display_in_sections" (
    "id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "display_marker" TEXT,
    "display_note" TEXT,
    CONSTRAINT "curriculum_component_display_in_sections_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "public"."curriculum_component_terms" (
    "id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,
    "semester_number" INTEGER NOT NULL,
    "ects" DECIMAL(6,2) NOT NULL,
    "hours" INTEGER NOT NULL,
    "has_course_work" BOOLEAN NOT NULL DEFAULT false,
    "has_course_project" BOOLEAN NOT NULL DEFAULT false,
    "hours_per_week" INTEGER,
    "control_form" "public"."TermControlForm",
    "subgroup_count" INTEGER NOT NULL DEFAULT 1,
    "subgroup_justification" TEXT,
    CONSTRAINT "curriculum_component_terms_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "public"."curriculum_components" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "elective_block_id" TEXT,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "component_type" "public"."ComponentType" NOT NULL,
    "total_ects" DECIMAL(6,2) NOT NULL,
    "total_hours" INTEGER NOT NULL,
    "order_index" INTEGER NOT NULL,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT true,
    "practice_type" "public"."PracticeType",
    "course_work_count" INTEGER NOT NULL DEFAULT 0,
    "course_project_count" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "auditory_hours" INTEGER,
    "component_kind" "public"."CurriculumComponentType" NOT NULL DEFAULT 'REGULAR',
    "group_code" TEXT,
    "lab_hours" INTEGER,
    "lecture_hours" INTEGER,
    "other_hours" INTEGER,
    "parent_component_id" TEXT,
    "practical_hours" INTEGER,
    "self_study_hours" INTEGER,
    "seminar_hours" INTEGER,
    "zno_preparation_hours" INTEGER,
    CONSTRAINT "curriculum_components_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "public"."curriculum_sections" (
    "id" TEXT NOT NULL,
    "version_id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "section_type" "public"."CurriculumSectionType" NOT NULL,
    "subtotal_ects" DECIMAL(6,2),
    CONSTRAINT "curriculum_sections_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "public"."curriculum_versions" (
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
CREATE TABLE "public"."educational_programs" (
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
    "qualification_group_id" INTEGER,
    "specialization_name" TEXT,
    "study_program_name_en" TEXT,
    "synced_at" TIMESTAMP(3),
    "university_specialization_id" INTEGER,
    "accreditation_exists_type" INTEGER,
    "accreditation_exists_type_name" TEXT,
    "edebo_date_last_change" TIMESTAMP(3),
    "qualification_group_name" TEXT,
    CONSTRAINT "educational_programs_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "public"."elective_block_seasons" (
    "id" TEXT NOT NULL,
    "block_id" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "catalog_status" "public"."CatalogStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "elective_block_seasons_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "public"."elective_blocks" (
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
CREATE TABLE "public"."elective_components" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "opp_code" TEXT NOT NULL,
    "opp_name" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "ects_credits" INTEGER NOT NULL,
    "cyclic_comm" TEXT NOT NULL,
    "syllabus_url" TEXT,
    "academic_year" TEXT NOT NULL,
    "is_higher_ed" BOOLEAN NOT NULL DEFAULT false,
    "catalog_status" "public"."CatalogStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "curriculum_term_id" TEXT,
    CONSTRAINT "elective_components_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "public"."elective_offerings" (
    "id" TEXT NOT NULL,
    "season_id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,
    "syllabus_url" TEXT,
    "is_higher_ed" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "elective_offerings_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "public"."elective_registrations" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "elective_id" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "method" "public"."SelectionMethod" NOT NULL,
    "status" "public"."SelectionStatus" NOT NULL DEFAULT 'PENDING',
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),
    "confirmed_by" TEXT,
    "director_approved" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "elective_registrations_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "public"."group_curriculum_assignments" (
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
CREATE TABLE "public"."group_elective_selections" (
    "id" TEXT NOT NULL,
    "block_id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "selected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "selected_by" TEXT,
    CONSTRAINT "group_elective_selections_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "public"."group_working_curriculum_assignments" (
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
CREATE TABLE "public"."groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "curator_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "public"."specialties" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "edebo_speciality_id" INTEGER,
    CONSTRAINT "specialties_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "public"."student_elective_selections" (
    "id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "override_reason" TEXT,
    "academic_year" TEXT NOT NULL,
    "confirmed_at" TIMESTAMP(3),
    "confirmed_by_id" TEXT,
    "method" "public"."SelectionMethod" NOT NULL DEFAULT 'VOLUNTARY',
    "season_id" TEXT NOT NULL,
    "status" "public"."SelectionStatus" NOT NULL DEFAULT 'PENDING',
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "student_elective_selections_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "public"."student_group_history" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "from_group_id" TEXT,
    "to_group_id" TEXT,
    "reason" "public"."GroupChangeReason" NOT NULL DEFAULT 'EDEBO_SYNC',
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "student_group_history_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "public"."student_individual_plan_items" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,
    "semester_number" INTEGER NOT NULL,
    "deviation_type" "public"."IndividualPlanDeviationType" NOT NULL,
    "notes" TEXT,
    "resolved_at" TIMESTAMP(3),
    CONSTRAINT "student_individual_plan_items_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "public"."student_individual_plans" (
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
CREATE TABLE "public"."students" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "birthday" TIMESTAMP(3),
    "person_sex_name" TEXT,
    "education_form_name" TEXT,
    "education_date_begin" TIMESTAMP(3),
    "education_date_end" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modify_date" TIMESTAMP(3),
    "academic_leave_type_name" TEXT,
    "budget_transfer_category_id" INTEGER,
    "budget_transfer_category_name" TEXT,
    "course_id" INTEGER,
    "course_name" TEXT,
    "date_begin" TIMESTAMP(3),
    "date_end" TIMESTAMP(3),
    "education_form_id" INTEGER,
    "education_history_actual_id" INTEGER NOT NULL,
    "education_id" INTEGER NOT NULL,
    "expel_education_type_name" TEXT,
    "faculty_name" TEXT,
    "foreign_type_id" INTEGER,
    "foreign_type_name" TEXT,
    "full_speciality_name" TEXT,
    "group_name" TEXT,
    "history_type_id" INTEGER NOT NULL,
    "is_dual_form" BOOLEAN,
    "is_for_phd_renewal" BOOLEAN,
    "is_second_higher" BOOLEAN,
    "is_short_term" BOOLEAN,
    "license_year" INTEGER,
    "person_code_u" TEXT NOT NULL,
    "person_fio" TEXT NOT NULL,
    "person_id" INTEGER NOT NULL,
    "profession_info" TEXT,
    "qualification_group_id" INTEGER,
    "qualification_group_name" TEXT,
    "study_program_name" TEXT,
    "university_id" INTEGER NOT NULL,
    "university_study_program_id" INTEGER,
    "passport_document_numbers" TEXT,
    "passport_document_series" TEXT,
    "passport_numbers" TEXT,
    "passport_series" TEXT,
    "rnokpp" TEXT,
    "student_ticket_numbers" TEXT,
    "student_ticket_series" TEXT,
    "group_id" TEXT,
    "corporate_email" TEXT,
    "person_name_en" TEXT,
    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "public"."sync_state" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sync_state_pkey" PRIMARY KEY ("key")
);
-- CreateTable
CREATE TABLE "public"."teacher_load_lesson_assignments" (
    "id" TEXT NOT NULL,
    "subject_assignment_id" TEXT NOT NULL,
    "lesson_type" "public"."LessonType" NOT NULL,
    "subgroup_number" INTEGER,
    "hours" INTEGER NOT NULL,
    "override_teacher_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "teacher_load_lesson_assignments_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "public"."teacher_load_subject_assignments" (
    "id" TEXT NOT NULL,
    "working_curriculum_id" TEXT NOT NULL,
    "curriculum_component_term_id" TEXT NOT NULL,
    "group_id" TEXT,
    "academic_year" TEXT NOT NULL,
    "primary_teacher_id" TEXT,
    "assigned_by_id" TEXT NOT NULL,
    "signed_by_director_id" TEXT,
    "status" "public"."LoadStatus" NOT NULL DEFAULT 'DRAFT',
    "order_number" TEXT,
    "order_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "teacher_load_subject_assignments_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "public"."teacher_qualification_upgrades" (
    "id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "course_name" TEXT NOT NULL,
    "organization_name" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "hours" INTEGER NOT NULL,
    "certificate_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "raw_text" TEXT,
    "source" "public"."QualificationUpgradeSource" NOT NULL DEFAULT 'MANUAL',
    CONSTRAINT "teacher_qualification_upgrades_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "public"."teachers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "person_id" INTEGER NOT NULL,
    "staff_id" INTEGER NOT NULL,
    "last_name" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "middle_name" TEXT,
    "birthday" TIMESTAMP(3),
    "country_name" TEXT,
    "person_sex_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "position_name" TEXT,
    "position_plurality_name" TEXT,
    "position_place" TEXT,
    "university_faculty_id" INTEGER,
    "university_faculty_full_name" TEXT,
    "university_faculty_short_name" TEXT,
    "university_faculty_chair_id" INTEGER,
    "university_faculty_chair_full_name" TEXT,
    "university_faculty_chair_short_name" TEXT,
    "profession" TEXT,
    "rang" TEXT,
    "skill_id" INTEGER,
    "skill_name" TEXT,
    "stage_type_id" INTEGER,
    "stage_type_name" TEXT,
    "stage" INTEGER,
    "is_stage_solid" BOOLEAN,
    "start_date" TIMESTAMP(3),
    "date_recruit" TIMESTAMP(3),
    "date_fire" TIMESTAMP(3),
    "courses_info" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modify_date" TIMESTAMP(3),
    "dignity_ids_str" TEXT,
    "dignity_names" TEXT,
    "rate" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "public"."time_budget_entries" (
    "id" TEXT NOT NULL,
    "version_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "total_hours" INTEGER NOT NULL,
    "total_ects" DECIMAL(6,2),
    "order_index" INTEGER NOT NULL,
    CONSTRAINT "time_budget_entries_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "public"."tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" "public"."TokenType" NOT NULL,
    "expires_in" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tokens_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL DEFAULT 'STUDENT',
    "is_two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "is_first_login" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "totp_secret" TEXT,
    "totp_verified_at" TIMESTAMP(3),
    "two_factor_method" "public"."TwoFactorMethod" NOT NULL DEFAULT 'NONE',
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "public"."working_curricula" (
    "id" TEXT NOT NULL,
    "version_id" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "semester_numbers" INTEGER[],
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "approved_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "trade_union_approved_at" TIMESTAMP(3),
    "trade_union_protocol_number" TEXT,
    "pedagogical_council_date" TIMESTAMP(3),
    "pedagogical_council_protocol_number" TEXT,
    CONSTRAINT "working_curricula_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "public"."working_curriculum_component_terms" (
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
    "teacher_id" TEXT,
    CONSTRAINT "working_curriculum_component_terms_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE UNIQUE INDEX "academic_calendar_entries_version_id_course_number_semester_key" ON "public"."academic_calendar_entries"("version_id" ASC, "course_number" ASC, "semester_number" ASC, "week_number" ASC);
-- CreateIndex
CREATE INDEX "academic_calendar_entries_version_id_idx" ON "public"."academic_calendar_entries"("version_id" ASC);
-- CreateIndex
CREATE UNIQUE INDEX "classrooms_name_key" ON "public"."classrooms"("name" ASC);
-- CreateIndex
CREATE UNIQUE INDEX "classrooms_number_key" ON "public"."classrooms"("number" ASC);
-- CreateIndex
CREATE INDEX "curricula_entry_year_idx" ON "public"."curricula"("entry_year" ASC);
-- CreateIndex
CREATE UNIQUE INDEX "curricula_program_id_education_form_admission_basis_entry_y_key" ON "public"."curricula"("program_id" ASC, "education_form" ASC, "admission_basis" ASC, "entry_year" ASC);
-- CreateIndex
CREATE INDEX "curricula_program_id_idx" ON "public"."curricula"("program_id" ASC);
-- CreateIndex
CREATE INDEX "curriculum_component_display_in_sections_component_id_idx" ON "public"."curriculum_component_display_in_sections"("component_id" ASC);
-- CreateIndex
CREATE UNIQUE INDEX "curriculum_component_display_in_sections_component_id_secti_key" ON "public"."curriculum_component_display_in_sections"("component_id" ASC, "section_id" ASC);
-- CreateIndex
CREATE INDEX "curriculum_component_display_in_sections_section_id_display_idx" ON "public"."curriculum_component_display_in_sections"("section_id" ASC, "display_order" ASC);
-- CreateIndex
CREATE INDEX "curriculum_component_terms_component_id_idx" ON "public"."curriculum_component_terms"("component_id" ASC);
-- CreateIndex
CREATE UNIQUE INDEX "curriculum_component_terms_component_id_semester_number_key" ON "public"."curriculum_component_terms"("component_id" ASC, "semester_number" ASC);
-- CreateIndex
CREATE INDEX "curriculum_components_elective_block_id_idx" ON "public"."curriculum_components"("elective_block_id" ASC);
-- CreateIndex
CREATE INDEX "curriculum_components_parent_component_id_idx" ON "public"."curriculum_components"("parent_component_id" ASC);
-- CreateIndex
CREATE INDEX "curriculum_components_section_id_idx" ON "public"."curriculum_components"("section_id" ASC);
-- CreateIndex
CREATE INDEX "curriculum_sections_version_id_idx" ON "public"."curriculum_sections"("version_id" ASC);
-- CreateIndex
CREATE INDEX "curriculum_versions_curriculum_id_idx" ON "public"."curriculum_versions"("curriculum_id" ASC);
-- CreateIndex
CREATE UNIQUE INDEX "curriculum_versions_curriculum_id_version_number_key" ON "public"."curriculum_versions"("curriculum_id" ASC, "version_number" ASC);
-- CreateIndex
CREATE UNIQUE INDEX "educational_programs_edebo_id_key" ON "public"."educational_programs"("edebo_id" ASC);
-- CreateIndex
CREATE INDEX "educational_programs_specialty_id_idx" ON "public"."educational_programs"("specialty_id" ASC);
-- CreateIndex
CREATE INDEX "elective_block_seasons_academic_year_idx" ON "public"."elective_block_seasons"("academic_year" ASC);
-- CreateIndex
CREATE UNIQUE INDEX "elective_block_seasons_block_id_academic_year_key" ON "public"."elective_block_seasons"("block_id" ASC, "academic_year" ASC);
-- CreateIndex
CREATE INDEX "elective_blocks_section_id_idx" ON "public"."elective_blocks"("section_id" ASC);
-- CreateIndex
CREATE UNIQUE INDEX "elective_components_curriculum_term_id_key" ON "public"."elective_components"("curriculum_term_id" ASC);
-- CreateIndex
CREATE INDEX "elective_components_opp_code_academic_year_idx" ON "public"."elective_components"("opp_code" ASC, "academic_year" ASC);
-- CreateIndex
CREATE UNIQUE INDEX "elective_offerings_season_id_component_id_key" ON "public"."elective_offerings"("season_id" ASC, "component_id" ASC);
-- CreateIndex
CREATE INDEX "elective_offerings_season_id_idx" ON "public"."elective_offerings"("season_id" ASC);
-- CreateIndex
CREATE INDEX "elective_registrations_elective_id_idx" ON "public"."elective_registrations"("elective_id" ASC);
-- CreateIndex
CREATE UNIQUE INDEX "elective_registrations_student_id_academic_year_semester_key" ON "public"."elective_registrations"("student_id" ASC, "academic_year" ASC, "semester" ASC);
-- CreateIndex
CREATE INDEX "elective_registrations_student_id_idx" ON "public"."elective_registrations"("student_id" ASC);
-- CreateIndex
CREATE INDEX "group_curriculum_assignments_group_id_is_active_idx" ON "public"."group_curriculum_assignments"("group_id" ASC, "is_active" ASC);
-- CreateIndex
CREATE INDEX "group_curriculum_assignments_version_id_idx" ON "public"."group_curriculum_assignments"("version_id" ASC);
-- CreateIndex
CREATE INDEX "group_elective_selections_assignment_id_idx" ON "public"."group_elective_selections"("assignment_id" ASC);
-- CreateIndex
CREATE UNIQUE INDEX "group_elective_selections_block_id_assignment_id_key" ON "public"."group_elective_selections"("block_id" ASC, "assignment_id" ASC);
-- CreateIndex
CREATE UNIQUE INDEX "group_working_curriculum_assignments_group_id_academic_year_key" ON "public"."group_working_curriculum_assignments"("group_id" ASC, "academic_year" ASC);
-- CreateIndex
CREATE INDEX "group_working_curriculum_assignments_working_curriculum_id_idx" ON "public"."group_working_curriculum_assignments"("working_curriculum_id" ASC);
-- CreateIndex
CREATE UNIQUE INDEX "groups_curator_id_key" ON "public"."groups"("curator_id" ASC);
-- CreateIndex
CREATE UNIQUE INDEX "groups_name_key" ON "public"."groups"("name" ASC);
-- CreateIndex
CREATE UNIQUE INDEX "specialties_code_key" ON "public"."specialties"("code" ASC);
-- CreateIndex
CREATE UNIQUE INDEX "specialties_edebo_speciality_id_key" ON "public"."specialties"("edebo_speciality_id" ASC);
-- CreateIndex
CREATE INDEX "student_elective_selections_season_id_idx" ON "public"."student_elective_selections"("season_id" ASC);
-- CreateIndex
CREATE INDEX "student_elective_selections_student_id_idx" ON "public"."student_elective_selections"("student_id" ASC);
-- CreateIndex
CREATE UNIQUE INDEX "student_elective_selections_student_id_season_id_key" ON "public"."student_elective_selections"("student_id" ASC, "season_id" ASC);
-- CreateIndex
CREATE INDEX "student_individual_plan_items_plan_id_idx" ON "public"."student_individual_plan_items"("plan_id" ASC);
-- CreateIndex
CREATE UNIQUE INDEX "student_individual_plans_student_id_key" ON "public"."student_individual_plans"("student_id" ASC);
-- CreateIndex
CREATE UNIQUE INDEX "students_corporate_email_key" ON "public"."students"("corporate_email" ASC);
-- CreateIndex
CREATE UNIQUE INDEX "students_user_id_key" ON "public"."students"("user_id" ASC);
-- CreateIndex
CREATE INDEX "teacher_load_lesson_assignments_override_teacher_id_idx" ON "public"."teacher_load_lesson_assignments"("override_teacher_id" ASC);
-- CreateIndex
CREATE INDEX "teacher_load_lesson_assignments_subject_assignment_id_idx" ON "public"."teacher_load_lesson_assignments"("subject_assignment_id" ASC);
-- CreateIndex
CREATE UNIQUE INDEX "uq_tlla_no_subgroup" ON "public"."teacher_load_lesson_assignments"("subject_assignment_id" ASC, "lesson_type" ASC);
-- CreateIndex
CREATE UNIQUE INDEX "uq_tlla_with_subgroup" ON "public"."teacher_load_lesson_assignments"("subject_assignment_id" ASC, "lesson_type" ASC, "subgroup_number" ASC);
-- CreateIndex
CREATE INDEX "teacher_load_subject_assignments_group_id_idx" ON "public"."teacher_load_subject_assignments"("group_id" ASC);
-- CreateIndex
CREATE INDEX "teacher_load_subject_assignments_primary_teacher_id_idx" ON "public"."teacher_load_subject_assignments"("primary_teacher_id" ASC);
-- CreateIndex
CREATE INDEX "teacher_load_subject_assignments_signed_by_director_id_idx" ON "public"."teacher_load_subject_assignments"("signed_by_director_id" ASC);
-- CreateIndex
CREATE INDEX "teacher_load_subject_assignments_status_idx" ON "public"."teacher_load_subject_assignments"("status" ASC);
-- CreateIndex
CREATE INDEX "teacher_load_subject_assignments_working_curriculum_id_idx" ON "public"."teacher_load_subject_assignments"("working_curriculum_id" ASC);
-- CreateIndex
CREATE UNIQUE INDEX "uq_tlsa_no_group" ON "public"."teacher_load_subject_assignments"("working_curriculum_id" ASC, "curriculum_component_term_id" ASC);
-- CreateIndex
CREATE UNIQUE INDEX "uq_tlsa_with_group" ON "public"."teacher_load_subject_assignments"("working_curriculum_id" ASC, "curriculum_component_term_id" ASC, "group_id" ASC);
-- CreateIndex
CREATE UNIQUE INDEX "teachers_staff_id_key" ON "public"."teachers"("staff_id" ASC);
-- CreateIndex
CREATE UNIQUE INDEX "teachers_user_id_key" ON "public"."teachers"("user_id" ASC);
-- CreateIndex
CREATE INDEX "time_budget_entries_version_id_idx" ON "public"."time_budget_entries"("version_id" ASC);
-- CreateIndex
CREATE UNIQUE INDEX "tokens_token_key" ON "public"."tokens"("token" ASC);
-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email" ASC);
-- CreateIndex
CREATE UNIQUE INDEX "working_curricula_version_id_academic_year_key" ON "public"."working_curricula"("version_id" ASC, "academic_year" ASC);
-- CreateIndex
CREATE INDEX "working_curricula_version_id_idx" ON "public"."working_curricula"("version_id" ASC);
-- CreateIndex
CREATE INDEX "working_curriculum_component_terms_teacher_id_idx" ON "public"."working_curriculum_component_terms"("teacher_id" ASC);
-- CreateIndex
CREATE UNIQUE INDEX "working_curriculum_component_terms_working_curriculum_id_co_key" ON "public"."working_curriculum_component_terms"("working_curriculum_id" ASC, "component_term_id" ASC);
-- CreateIndex
CREATE INDEX "working_curriculum_component_terms_working_curriculum_id_idx" ON "public"."working_curriculum_component_terms"("working_curriculum_id" ASC);
-- AddForeignKey
ALTER TABLE "public"."academic_calendar_entries" ADD CONSTRAINT "academic_calendar_entries_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "public"."curriculum_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."classrooms" ADD CONSTRAINT "classrooms_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."curricula" ADD CONSTRAINT "curricula_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."educational_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."curriculum_component_display_in_sections" ADD CONSTRAINT "curriculum_component_display_in_sections_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "public"."curriculum_components"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."curriculum_component_display_in_sections" ADD CONSTRAINT "curriculum_component_display_in_sections_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."curriculum_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."curriculum_component_terms" ADD CONSTRAINT "curriculum_component_terms_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "public"."curriculum_components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."curriculum_components" ADD CONSTRAINT "curriculum_components_elective_block_id_fkey" FOREIGN KEY ("elective_block_id") REFERENCES "public"."elective_blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."curriculum_components" ADD CONSTRAINT "curriculum_components_parent_component_id_fkey" FOREIGN KEY ("parent_component_id") REFERENCES "public"."curriculum_components"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."curriculum_components" ADD CONSTRAINT "curriculum_components_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."curriculum_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."curriculum_sections" ADD CONSTRAINT "curriculum_sections_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "public"."curriculum_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."curriculum_versions" ADD CONSTRAINT "curriculum_versions_curriculum_id_fkey" FOREIGN KEY ("curriculum_id") REFERENCES "public"."curricula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."educational_programs" ADD CONSTRAINT "educational_programs_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "public"."specialties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."elective_block_seasons" ADD CONSTRAINT "elective_block_seasons_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "public"."elective_blocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."elective_blocks" ADD CONSTRAINT "elective_blocks_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."curriculum_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."elective_components" ADD CONSTRAINT "elective_components_curriculum_term_id_fkey" FOREIGN KEY ("curriculum_term_id") REFERENCES "public"."curriculum_component_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."elective_offerings" ADD CONSTRAINT "elective_offerings_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "public"."curriculum_components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."elective_offerings" ADD CONSTRAINT "elective_offerings_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."elective_block_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."elective_registrations" ADD CONSTRAINT "elective_registrations_elective_id_fkey" FOREIGN KEY ("elective_id") REFERENCES "public"."elective_components"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."elective_registrations" ADD CONSTRAINT "elective_registrations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."group_curriculum_assignments" ADD CONSTRAINT "group_curriculum_assignments_curriculum_id_fkey" FOREIGN KEY ("curriculum_id") REFERENCES "public"."curricula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."group_curriculum_assignments" ADD CONSTRAINT "group_curriculum_assignments_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."group_curriculum_assignments" ADD CONSTRAINT "group_curriculum_assignments_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "public"."curriculum_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."group_elective_selections" ADD CONSTRAINT "group_elective_selections_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "public"."group_curriculum_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."group_elective_selections" ADD CONSTRAINT "group_elective_selections_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "public"."elective_blocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."group_elective_selections" ADD CONSTRAINT "group_elective_selections_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "public"."curriculum_components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."group_working_curriculum_assignments" ADD CONSTRAINT "group_working_curriculum_assignments_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "public"."group_curriculum_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."group_working_curriculum_assignments" ADD CONSTRAINT "group_working_curriculum_assignments_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."group_working_curriculum_assignments" ADD CONSTRAINT "group_working_curriculum_assignments_working_curriculum_id_fkey" FOREIGN KEY ("working_curriculum_id") REFERENCES "public"."working_curricula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."groups" ADD CONSTRAINT "groups_curator_id_fkey" FOREIGN KEY ("curator_id") REFERENCES "public"."teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."student_elective_selections" ADD CONSTRAINT "student_elective_selections_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "public"."curriculum_components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."student_elective_selections" ADD CONSTRAINT "student_elective_selections_confirmed_by_id_fkey" FOREIGN KEY ("confirmed_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."student_elective_selections" ADD CONSTRAINT "student_elective_selections_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."elective_block_seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."student_elective_selections" ADD CONSTRAINT "student_elective_selections_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."student_group_history" ADD CONSTRAINT "student_group_history_from_group_id_fkey" FOREIGN KEY ("from_group_id") REFERENCES "public"."groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."student_group_history" ADD CONSTRAINT "student_group_history_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."student_group_history" ADD CONSTRAINT "student_group_history_to_group_id_fkey" FOREIGN KEY ("to_group_id") REFERENCES "public"."groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."student_individual_plan_items" ADD CONSTRAINT "student_individual_plan_items_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "public"."curriculum_components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."student_individual_plan_items" ADD CONSTRAINT "student_individual_plan_items_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."student_individual_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."student_individual_plans" ADD CONSTRAINT "student_individual_plans_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "public"."group_curriculum_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."student_individual_plans" ADD CONSTRAINT "student_individual_plans_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."students" ADD CONSTRAINT "students_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."students" ADD CONSTRAINT "students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."teacher_load_lesson_assignments" ADD CONSTRAINT "teacher_load_lesson_assignments_override_teacher_id_fkey" FOREIGN KEY ("override_teacher_id") REFERENCES "public"."teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."teacher_load_lesson_assignments" ADD CONSTRAINT "teacher_load_lesson_assignments_subject_assignment_id_fkey" FOREIGN KEY ("subject_assignment_id") REFERENCES "public"."teacher_load_subject_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."teacher_load_subject_assignments" ADD CONSTRAINT "teacher_load_subject_assignments_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."teacher_load_subject_assignments" ADD CONSTRAINT "teacher_load_subject_assignments_curriculum_component_term_fkey" FOREIGN KEY ("curriculum_component_term_id") REFERENCES "public"."curriculum_component_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."teacher_load_subject_assignments" ADD CONSTRAINT "teacher_load_subject_assignments_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."teacher_load_subject_assignments" ADD CONSTRAINT "teacher_load_subject_assignments_primary_teacher_id_fkey" FOREIGN KEY ("primary_teacher_id") REFERENCES "public"."teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."teacher_load_subject_assignments" ADD CONSTRAINT "teacher_load_subject_assignments_signed_by_director_id_fkey" FOREIGN KEY ("signed_by_director_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."teacher_load_subject_assignments" ADD CONSTRAINT "teacher_load_subject_assignments_working_curriculum_id_fkey" FOREIGN KEY ("working_curriculum_id") REFERENCES "public"."working_curricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."teacher_qualification_upgrades" ADD CONSTRAINT "teacher_qualification_upgrades_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."teachers" ADD CONSTRAINT "teachers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."time_budget_entries" ADD CONSTRAINT "time_budget_entries_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "public"."curriculum_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."tokens" ADD CONSTRAINT "tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."working_curricula" ADD CONSTRAINT "working_curricula_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "public"."curriculum_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."working_curriculum_component_terms" ADD CONSTRAINT "working_curriculum_component_terms_component_term_id_fkey" FOREIGN KEY ("component_term_id") REFERENCES "public"."curriculum_component_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."working_curriculum_component_terms" ADD CONSTRAINT "working_curriculum_component_terms_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."working_curriculum_component_terms" ADD CONSTRAINT "working_curriculum_component_terms_working_curriculum_id_fkey" FOREIGN KEY ("working_curriculum_id") REFERENCES "public"."working_curricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;
