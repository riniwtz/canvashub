CREATE TYPE "task_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "task_work_category" AS ENUM('academic', 'organization', 'personal', 'development', 'general');--> statement-breakpoint
CREATE TABLE "task_activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_user_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"action" varchar(40) NOT NULL,
	"details" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_statuses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_user_id" uuid NOT NULL,
	"name" varchar(60) NOT NULL,
	"slug" varchar(72) NOT NULL,
	"color" varchar(7) DEFAULT '#737373' NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_statuses_name_length_check" CHECK (char_length(btrim("name")) between 1 and 60),
	CONSTRAINT "task_statuses_color_check" CHECK ("color" ~ '^#[0-9A-Fa-f]{6}$')
);
--> statement-breakpoint
CREATE TABLE "task_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"task_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_user_id" uuid NOT NULL,
	"name" varchar(80) NOT NULL,
	"normalized_name" varchar(80) NOT NULL,
	"slug" varchar(96) NOT NULL,
	"description" varchar(240),
	"color" varchar(7) DEFAULT '#737373' NOT NULL,
	"icon" varchar(40) DEFAULT 'briefcase' NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_types_name_length_check" CHECK (char_length(btrim("name")) between 1 and 80),
	CONSTRAINT "task_types_color_check" CHECK ("color" ~ '^#[0-9A-Fa-f]{6}$')
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_user_id" uuid NOT NULL,
	"parent_task_id" uuid,
	"task_type_id" uuid NOT NULL,
	"status_id" uuid NOT NULL,
	"course_id" uuid,
	"organization_id" uuid,
	"title" varchar(160) NOT NULL,
	"description" text,
	"notes" text,
	"priority" "task_priority" DEFAULT 'medium'::"task_priority" NOT NULL,
	"work_category" "task_work_category" DEFAULT 'general'::"task_work_category" NOT NULL,
	"start_date" date,
	"due_date" date,
	"due_time" time(0),
	"due_at" timestamp with time zone,
	"timezone" varchar(64) DEFAULT 'Asia/Manila' NOT NULL,
	"completed_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"request_key" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tasks_title_length_check" CHECK (char_length(btrim("title")) between 1 and 160),
	CONSTRAINT "tasks_description_length_check" CHECK ("description" is null or char_length("description") <= 5000),
	CONSTRAINT "tasks_notes_length_check" CHECK ("notes" is null or char_length("notes") <= 5000),
	CONSTRAINT "tasks_parent_not_self_check" CHECK ("parent_task_id" is null or "parent_task_id" <> "id"),
	CONSTRAINT "tasks_due_time_requires_date_check" CHECK ("due_time" is null or "due_date" is not null),
	CONSTRAINT "tasks_version_check" CHECK ("version" > 0)
);
--> statement-breakpoint
CREATE TABLE "work_organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_user_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"normalized_name" varchar(120) NOT NULL,
	"description" varchar(240),
	"is_active" boolean DEFAULT true NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "work_organizations_name_length_check" CHECK (char_length(btrim("name")) between 1 and 120)
);
--> statement-breakpoint
CREATE TABLE "work_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_user_id" uuid NOT NULL,
	"name" varchar(40) NOT NULL,
	"normalized_name" varchar(40) NOT NULL,
	"slug" varchar(48) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(120) NOT NULL,
	"email" varchar(254) NOT NULL,
	"timezone" varchar(64) DEFAULT 'Asia/Manila' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "work_users_name_length_check" CHECK (char_length(btrim("name")) between 1 and 120)
);
--> statement-breakpoint
CREATE INDEX "task_activity_logs_owner_task_created_idx" ON "task_activity_logs" ("owner_user_id","task_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "task_statuses_owner_slug_uq" ON "task_statuses" ("owner_user_id","slug");--> statement-breakpoint
CREATE INDEX "task_statuses_owner_active_sort_idx" ON "task_statuses" ("owner_user_id","is_active","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "task_tags_task_tag_uq" ON "task_tags" ("task_id","tag_id");--> statement-breakpoint
CREATE INDEX "task_tags_tag_id_idx" ON "task_tags" ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "task_types_owner_normalized_name_uq" ON "task_types" ("owner_user_id","normalized_name");--> statement-breakpoint
CREATE UNIQUE INDEX "task_types_owner_slug_uq" ON "task_types" ("owner_user_id","slug");--> statement-breakpoint
CREATE INDEX "task_types_owner_active_sort_idx" ON "task_types" ("owner_user_id","is_active","sort_order");--> statement-breakpoint
CREATE INDEX "tasks_owner_deleted_updated_idx" ON "tasks" ("owner_user_id","deleted_at","updated_at");--> statement-breakpoint
CREATE INDEX "tasks_owner_parent_deleted_idx" ON "tasks" ("owner_user_id","parent_task_id","deleted_at");--> statement-breakpoint
CREATE INDEX "tasks_owner_type_idx" ON "tasks" ("owner_user_id","task_type_id");--> statement-breakpoint
CREATE INDEX "tasks_owner_status_idx" ON "tasks" ("owner_user_id","status_id");--> statement-breakpoint
CREATE INDEX "tasks_owner_due_date_idx" ON "tasks" ("owner_user_id","due_date");--> statement-breakpoint
CREATE INDEX "tasks_course_id_idx" ON "tasks" ("course_id");--> statement-breakpoint
CREATE INDEX "tasks_organization_id_idx" ON "tasks" ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_owner_request_key_uq" ON "tasks" ("owner_user_id","request_key");--> statement-breakpoint
CREATE UNIQUE INDEX "work_organizations_owner_normalized_name_uq" ON "work_organizations" ("owner_user_id","normalized_name");--> statement-breakpoint
CREATE INDEX "work_organizations_owner_active_name_idx" ON "work_organizations" ("owner_user_id","is_active","name");--> statement-breakpoint
CREATE UNIQUE INDEX "work_tags_owner_normalized_name_uq" ON "work_tags" ("owner_user_id","normalized_name");--> statement-breakpoint
CREATE UNIQUE INDEX "work_tags_owner_slug_uq" ON "work_tags" ("owner_user_id","slug");--> statement-breakpoint
CREATE INDEX "work_tags_owner_name_idx" ON "work_tags" ("owner_user_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "work_users_email_uq" ON "work_users" ("email");--> statement-breakpoint
ALTER TABLE "task_activity_logs" ADD CONSTRAINT "task_activity_logs_owner_user_id_work_users_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "work_users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "task_activity_logs" ADD CONSTRAINT "task_activity_logs_task_id_tasks_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "task_activity_logs" ADD CONSTRAINT "task_activity_logs_actor_user_id_work_users_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "work_users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "task_statuses" ADD CONSTRAINT "task_statuses_owner_user_id_work_users_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "work_users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "task_tags" ADD CONSTRAINT "task_tags_task_id_tasks_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "task_tags" ADD CONSTRAINT "task_tags_tag_id_work_tags_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "work_tags"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "task_types" ADD CONSTRAINT "task_types_owner_user_id_work_users_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "work_users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_owner_user_id_work_users_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "work_users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_task_id_tasks_id_fkey" FOREIGN KEY ("parent_task_id") REFERENCES "tasks"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_task_type_id_task_types_id_fkey" FOREIGN KEY ("task_type_id") REFERENCES "task_types"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_status_id_task_statuses_id_fkey" FOREIGN KEY ("status_id") REFERENCES "task_statuses"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_course_id_canvas_courses_id_fkey" FOREIGN KEY ("course_id") REFERENCES "canvas_courses"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_organization_id_work_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "work_organizations"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_work_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "work_users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_updated_by_work_users_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "work_users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "work_organizations" ADD CONSTRAINT "work_organizations_owner_user_id_work_users_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "work_users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "work_tags" ADD CONSTRAINT "work_tags_owner_user_id_work_users_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "work_users"("id") ON DELETE CASCADE;