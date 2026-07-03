CREATE TABLE "canvas_api_sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"resource" text NOT NULL,
	"scope" text,
	"status" text DEFAULT 'running' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"item_count" integer DEFAULT 0 NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"metadata" jsonb DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canvas_api_sync_state" (
	"key" text PRIMARY KEY,
	"resource" text NOT NULL,
	"course_canvas_id" text,
	"user_canvas_id" text,
	"last_synced_at" timestamp with time zone,
	"next_url" text,
	"cursor" text,
	"etag" text,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canvas_assignment_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"canvas_id" text NOT NULL,
	"course_id" uuid,
	"course_canvas_id" text NOT NULL,
	"name" text,
	"position" integer,
	"group_weight" real,
	"rules" jsonb,
	"raw" jsonb DEFAULT '{}' NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canvas_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"canvas_id" text NOT NULL,
	"course_id" uuid,
	"course_canvas_id" text NOT NULL,
	"assignment_group_id" uuid,
	"assignment_group_canvas_id" text,
	"name" text,
	"description" text,
	"due_at" timestamp with time zone,
	"unlock_at" timestamp with time zone,
	"lock_at" timestamp with time zone,
	"all_dates" jsonb,
	"points_possible" real,
	"grading_type" text,
	"submission_types" jsonb DEFAULT '[]' NOT NULL,
	"allowed_extensions" jsonb DEFAULT '[]' NOT NULL,
	"has_submitted_submissions" boolean,
	"needs_grading_count" integer,
	"html_url" text,
	"external_tool_tag_attributes" jsonb,
	"rubric" jsonb,
	"rubric_settings" jsonb,
	"workflow_state" text,
	"published" boolean,
	"muted" boolean,
	"omit_from_final_grade" boolean,
	"raw" jsonb DEFAULT '{}' NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canvas_calendar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"canvas_id" text NOT NULL,
	"course_id" uuid,
	"course_canvas_id" text,
	"assignment_id" uuid,
	"assignment_canvas_id" text,
	"context_code" text,
	"type" text,
	"title" text,
	"description" text,
	"html_url" text,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"all_day" boolean,
	"all_day_date" text,
	"workflow_state" text,
	"location_name" text,
	"location_address" text,
	"blackout_date" boolean,
	"important_dates" boolean,
	"raw" jsonb DEFAULT '{}' NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canvas_course_nicknames" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"course_id" uuid,
	"course_canvas_id" text NOT NULL,
	"nickname" text NOT NULL,
	"raw" jsonb DEFAULT '{}' NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canvas_courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"canvas_id" text NOT NULL,
	"name" text,
	"course_code" text,
	"original_name" text,
	"workflow_state" text,
	"enrollment_state" text,
	"enrollment_term_id" text,
	"term_name" text,
	"account_id" text,
	"root_account_id" text,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"is_public" boolean,
	"syllabus_body" text,
	"raw" jsonb DEFAULT '{}' NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canvas_discussion_topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"canvas_id" text NOT NULL,
	"course_id" uuid,
	"course_canvas_id" text NOT NULL,
	"title" text,
	"message" text,
	"html_url" text,
	"posted_at" timestamp with time zone,
	"delayed_post_at" timestamp with time zone,
	"last_reply_at" timestamp with time zone,
	"discussion_type" text,
	"workflow_state" text,
	"is_announcement" boolean DEFAULT false NOT NULL,
	"require_initial_post" boolean,
	"user_count" integer,
	"discussion_subentry_count" integer,
	"author" jsonb,
	"raw" jsonb DEFAULT '{}' NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canvas_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"canvas_id" text NOT NULL,
	"course_id" uuid,
	"course_canvas_id" text NOT NULL,
	"user_id" uuid,
	"user_canvas_id" text,
	"type" text,
	"role" text,
	"role_id" text,
	"enrollment_state" text,
	"last_activity_at" timestamp with time zone,
	"total_activity_time_seconds" integer,
	"current_score" real,
	"current_grade" text,
	"final_score" real,
	"final_grade" text,
	"grades" jsonb,
	"raw" jsonb DEFAULT '{}' NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canvas_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"canvas_id" text NOT NULL,
	"course_id" uuid,
	"course_canvas_id" text,
	"folder_id" uuid,
	"folder_canvas_id" text,
	"display_name" text,
	"filename" text,
	"content_type" text,
	"url" text,
	"size_bytes" bigint,
	"created_at_canvas" timestamp with time zone,
	"updated_at_canvas" timestamp with time zone,
	"unlock_at" timestamp with time zone,
	"locked" boolean,
	"hidden" boolean,
	"visibility_level" text,
	"thumbnail_url" text,
	"mime_class" text,
	"raw" jsonb DEFAULT '{}' NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canvas_folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"canvas_id" text NOT NULL,
	"course_id" uuid,
	"course_canvas_id" text,
	"parent_folder_canvas_id" text,
	"name" text,
	"full_name" text,
	"context_type" text,
	"context_id" text,
	"folders_url" text,
	"files_url" text,
	"files_count" integer,
	"folders_count" integer,
	"position" integer,
	"locked" boolean,
	"hidden" boolean,
	"raw" jsonb DEFAULT '{}' NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canvas_module_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"canvas_id" text NOT NULL,
	"module_id" uuid,
	"module_canvas_id" text NOT NULL,
	"course_id" uuid,
	"course_canvas_id" text NOT NULL,
	"title" text,
	"type" text,
	"content_id" text,
	"position" integer,
	"indent" integer,
	"page_url" text,
	"html_url" text,
	"url" text,
	"external_url" text,
	"completion_requirement" jsonb,
	"content_details" jsonb,
	"published" boolean,
	"raw" jsonb DEFAULT '{}' NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canvas_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"canvas_id" text NOT NULL,
	"course_id" uuid,
	"course_canvas_id" text NOT NULL,
	"name" text,
	"position" integer,
	"workflow_state" text,
	"unlock_at" timestamp with time zone,
	"require_sequential_progress" boolean,
	"prerequisite_module_ids" jsonb DEFAULT '[]' NOT NULL,
	"items_count" integer,
	"items_url" text,
	"raw" jsonb DEFAULT '{}' NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canvas_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"canvas_id" text,
	"course_id" uuid,
	"course_canvas_id" text NOT NULL,
	"assignment_id" uuid,
	"assignment_canvas_id" text NOT NULL,
	"user_id" uuid,
	"user_canvas_id" text NOT NULL,
	"attempt" integer,
	"workflow_state" text,
	"submission_type" text,
	"body" text,
	"url" text,
	"preview_url" text,
	"submitted_at" timestamp with time zone,
	"graded_at" timestamp with time zone,
	"cached_due_at" timestamp with time zone,
	"score" real,
	"grade" text,
	"entered_score" real,
	"entered_grade" text,
	"excused" boolean,
	"late" boolean,
	"missing" boolean,
	"seconds_late" integer,
	"late_policy_status" text,
	"attachments" jsonb DEFAULT '[]' NOT NULL,
	"submission_comments" jsonb DEFAULT '[]' NOT NULL,
	"rubric_assessment" jsonb,
	"assignment_visible" boolean,
	"raw" jsonb DEFAULT '{}' NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canvas_todo_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"canvas_id" text NOT NULL,
	"course_id" uuid,
	"course_canvas_id" text,
	"assignment_id" uuid,
	"assignment_canvas_id" text,
	"type" text,
	"title" text,
	"html_url" text,
	"ignore" text,
	"ignore_permanently" text,
	"needs_grading_count" integer,
	"due_at" timestamp with time zone,
	"plannable_date" timestamp with time zone,
	"plannable" jsonb,
	"context_name" text,
	"raw" jsonb DEFAULT '{}' NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canvas_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"canvas_id" text NOT NULL,
	"name" text,
	"sortable_name" text,
	"short_name" text,
	"email" text,
	"avatar_url" text,
	"locale" text,
	"time_zone" text,
	"bio" text,
	"raw" jsonb DEFAULT '{}' NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "canvas_api_sync_runs_resource_idx" ON "canvas_api_sync_runs" ("resource");--> statement-breakpoint
CREATE INDEX "canvas_api_sync_runs_status_idx" ON "canvas_api_sync_runs" ("status");--> statement-breakpoint
CREATE INDEX "canvas_api_sync_runs_started_at_idx" ON "canvas_api_sync_runs" ("started_at");--> statement-breakpoint
CREATE INDEX "canvas_api_sync_state_resource_idx" ON "canvas_api_sync_state" ("resource");--> statement-breakpoint
CREATE INDEX "canvas_api_sync_state_course_canvas_id_idx" ON "canvas_api_sync_state" ("course_canvas_id");--> statement-breakpoint
CREATE UNIQUE INDEX "canvas_assignment_groups_canvas_id_uq" ON "canvas_assignment_groups" ("canvas_id");--> statement-breakpoint
CREATE INDEX "canvas_assignment_groups_course_id_idx" ON "canvas_assignment_groups" ("course_id");--> statement-breakpoint
CREATE INDEX "canvas_assignment_groups_course_canvas_id_idx" ON "canvas_assignment_groups" ("course_canvas_id");--> statement-breakpoint
CREATE UNIQUE INDEX "canvas_assignments_canvas_id_uq" ON "canvas_assignments" ("canvas_id");--> statement-breakpoint
CREATE INDEX "canvas_assignments_course_id_idx" ON "canvas_assignments" ("course_id");--> statement-breakpoint
CREATE INDEX "canvas_assignments_course_canvas_id_idx" ON "canvas_assignments" ("course_canvas_id");--> statement-breakpoint
CREATE INDEX "canvas_assignments_group_id_idx" ON "canvas_assignments" ("assignment_group_id");--> statement-breakpoint
CREATE INDEX "canvas_assignments_due_at_idx" ON "canvas_assignments" ("due_at");--> statement-breakpoint
CREATE INDEX "canvas_assignments_workflow_state_idx" ON "canvas_assignments" ("workflow_state");--> statement-breakpoint
CREATE UNIQUE INDEX "canvas_calendar_events_canvas_id_uq" ON "canvas_calendar_events" ("canvas_id");--> statement-breakpoint
CREATE INDEX "canvas_calendar_events_course_id_idx" ON "canvas_calendar_events" ("course_id");--> statement-breakpoint
CREATE INDEX "canvas_calendar_events_assignment_id_idx" ON "canvas_calendar_events" ("assignment_id");--> statement-breakpoint
CREATE INDEX "canvas_calendar_events_context_code_idx" ON "canvas_calendar_events" ("context_code");--> statement-breakpoint
CREATE INDEX "canvas_calendar_events_type_idx" ON "canvas_calendar_events" ("type");--> statement-breakpoint
CREATE INDEX "canvas_calendar_events_start_at_idx" ON "canvas_calendar_events" ("start_at");--> statement-breakpoint
CREATE INDEX "canvas_calendar_events_end_at_idx" ON "canvas_calendar_events" ("end_at");--> statement-breakpoint
CREATE UNIQUE INDEX "canvas_course_nicknames_course_canvas_id_uq" ON "canvas_course_nicknames" ("course_canvas_id");--> statement-breakpoint
CREATE INDEX "canvas_course_nicknames_course_id_idx" ON "canvas_course_nicknames" ("course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "canvas_courses_canvas_id_uq" ON "canvas_courses" ("canvas_id");--> statement-breakpoint
CREATE INDEX "canvas_courses_workflow_state_idx" ON "canvas_courses" ("workflow_state");--> statement-breakpoint
CREATE INDEX "canvas_courses_term_idx" ON "canvas_courses" ("enrollment_term_id");--> statement-breakpoint
CREATE UNIQUE INDEX "canvas_discussion_topics_canvas_id_uq" ON "canvas_discussion_topics" ("canvas_id");--> statement-breakpoint
CREATE INDEX "canvas_discussion_topics_course_id_idx" ON "canvas_discussion_topics" ("course_id");--> statement-breakpoint
CREATE INDEX "canvas_discussion_topics_course_canvas_id_idx" ON "canvas_discussion_topics" ("course_canvas_id");--> statement-breakpoint
CREATE INDEX "canvas_discussion_topics_posted_at_idx" ON "canvas_discussion_topics" ("posted_at");--> statement-breakpoint
CREATE INDEX "canvas_discussion_topics_is_announcement_idx" ON "canvas_discussion_topics" ("is_announcement");--> statement-breakpoint
CREATE UNIQUE INDEX "canvas_enrollments_canvas_id_uq" ON "canvas_enrollments" ("canvas_id");--> statement-breakpoint
CREATE INDEX "canvas_enrollments_course_id_idx" ON "canvas_enrollments" ("course_id");--> statement-breakpoint
CREATE INDEX "canvas_enrollments_user_id_idx" ON "canvas_enrollments" ("user_id");--> statement-breakpoint
CREATE INDEX "canvas_enrollments_course_canvas_id_idx" ON "canvas_enrollments" ("course_canvas_id");--> statement-breakpoint
CREATE INDEX "canvas_enrollments_user_canvas_id_idx" ON "canvas_enrollments" ("user_canvas_id");--> statement-breakpoint
CREATE INDEX "canvas_enrollments_state_idx" ON "canvas_enrollments" ("enrollment_state");--> statement-breakpoint
CREATE UNIQUE INDEX "canvas_files_canvas_id_uq" ON "canvas_files" ("canvas_id");--> statement-breakpoint
CREATE INDEX "canvas_files_course_id_idx" ON "canvas_files" ("course_id");--> statement-breakpoint
CREATE INDEX "canvas_files_course_canvas_id_idx" ON "canvas_files" ("course_canvas_id");--> statement-breakpoint
CREATE INDEX "canvas_files_folder_id_idx" ON "canvas_files" ("folder_id");--> statement-breakpoint
CREATE INDEX "canvas_files_content_type_idx" ON "canvas_files" ("content_type");--> statement-breakpoint
CREATE INDEX "canvas_files_created_at_canvas_idx" ON "canvas_files" ("created_at_canvas");--> statement-breakpoint
CREATE UNIQUE INDEX "canvas_folders_canvas_id_uq" ON "canvas_folders" ("canvas_id");--> statement-breakpoint
CREATE INDEX "canvas_folders_course_id_idx" ON "canvas_folders" ("course_id");--> statement-breakpoint
CREATE INDEX "canvas_folders_course_canvas_id_idx" ON "canvas_folders" ("course_canvas_id");--> statement-breakpoint
CREATE INDEX "canvas_folders_parent_canvas_id_idx" ON "canvas_folders" ("parent_folder_canvas_id");--> statement-breakpoint
CREATE UNIQUE INDEX "canvas_module_items_canvas_id_uq" ON "canvas_module_items" ("canvas_id");--> statement-breakpoint
CREATE INDEX "canvas_module_items_module_id_idx" ON "canvas_module_items" ("module_id");--> statement-breakpoint
CREATE INDEX "canvas_module_items_course_id_idx" ON "canvas_module_items" ("course_id");--> statement-breakpoint
CREATE INDEX "canvas_module_items_content_id_idx" ON "canvas_module_items" ("content_id");--> statement-breakpoint
CREATE INDEX "canvas_module_items_position_idx" ON "canvas_module_items" ("position");--> statement-breakpoint
CREATE UNIQUE INDEX "canvas_modules_canvas_id_uq" ON "canvas_modules" ("canvas_id");--> statement-breakpoint
CREATE INDEX "canvas_modules_course_id_idx" ON "canvas_modules" ("course_id");--> statement-breakpoint
CREATE INDEX "canvas_modules_course_canvas_id_idx" ON "canvas_modules" ("course_canvas_id");--> statement-breakpoint
CREATE INDEX "canvas_modules_position_idx" ON "canvas_modules" ("position");--> statement-breakpoint
CREATE UNIQUE INDEX "canvas_submissions_canvas_id_uq" ON "canvas_submissions" ("canvas_id");--> statement-breakpoint
CREATE UNIQUE INDEX "canvas_submissions_assignment_user_attempt_uq" ON "canvas_submissions" ("assignment_canvas_id","user_canvas_id","attempt");--> statement-breakpoint
CREATE INDEX "canvas_submissions_course_id_idx" ON "canvas_submissions" ("course_id");--> statement-breakpoint
CREATE INDEX "canvas_submissions_assignment_id_idx" ON "canvas_submissions" ("assignment_id");--> statement-breakpoint
CREATE INDEX "canvas_submissions_user_id_idx" ON "canvas_submissions" ("user_id");--> statement-breakpoint
CREATE INDEX "canvas_submissions_workflow_state_idx" ON "canvas_submissions" ("workflow_state");--> statement-breakpoint
CREATE INDEX "canvas_submissions_submitted_at_idx" ON "canvas_submissions" ("submitted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "canvas_todo_items_canvas_id_uq" ON "canvas_todo_items" ("canvas_id");--> statement-breakpoint
CREATE INDEX "canvas_todo_items_course_id_idx" ON "canvas_todo_items" ("course_id");--> statement-breakpoint
CREATE INDEX "canvas_todo_items_assignment_id_idx" ON "canvas_todo_items" ("assignment_id");--> statement-breakpoint
CREATE INDEX "canvas_todo_items_due_at_idx" ON "canvas_todo_items" ("due_at");--> statement-breakpoint
CREATE INDEX "canvas_todo_items_type_idx" ON "canvas_todo_items" ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "canvas_users_canvas_id_uq" ON "canvas_users" ("canvas_id");--> statement-breakpoint
CREATE INDEX "canvas_users_email_idx" ON "canvas_users" ("email");--> statement-breakpoint
ALTER TABLE "canvas_assignment_groups" ADD CONSTRAINT "canvas_assignment_groups_course_id_canvas_courses_id_fkey" FOREIGN KEY ("course_id") REFERENCES "canvas_courses"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "canvas_assignments" ADD CONSTRAINT "canvas_assignments_course_id_canvas_courses_id_fkey" FOREIGN KEY ("course_id") REFERENCES "canvas_courses"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "canvas_assignments" ADD CONSTRAINT "canvas_assignments_xPLB1SuOy1xN_fkey" FOREIGN KEY ("assignment_group_id") REFERENCES "canvas_assignment_groups"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "canvas_calendar_events" ADD CONSTRAINT "canvas_calendar_events_course_id_canvas_courses_id_fkey" FOREIGN KEY ("course_id") REFERENCES "canvas_courses"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "canvas_calendar_events" ADD CONSTRAINT "canvas_calendar_events_assignment_id_canvas_assignments_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "canvas_assignments"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "canvas_course_nicknames" ADD CONSTRAINT "canvas_course_nicknames_course_id_canvas_courses_id_fkey" FOREIGN KEY ("course_id") REFERENCES "canvas_courses"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "canvas_discussion_topics" ADD CONSTRAINT "canvas_discussion_topics_course_id_canvas_courses_id_fkey" FOREIGN KEY ("course_id") REFERENCES "canvas_courses"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "canvas_enrollments" ADD CONSTRAINT "canvas_enrollments_course_id_canvas_courses_id_fkey" FOREIGN KEY ("course_id") REFERENCES "canvas_courses"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "canvas_enrollments" ADD CONSTRAINT "canvas_enrollments_user_id_canvas_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "canvas_users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "canvas_files" ADD CONSTRAINT "canvas_files_course_id_canvas_courses_id_fkey" FOREIGN KEY ("course_id") REFERENCES "canvas_courses"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "canvas_files" ADD CONSTRAINT "canvas_files_folder_id_canvas_folders_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "canvas_folders"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "canvas_folders" ADD CONSTRAINT "canvas_folders_course_id_canvas_courses_id_fkey" FOREIGN KEY ("course_id") REFERENCES "canvas_courses"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "canvas_module_items" ADD CONSTRAINT "canvas_module_items_module_id_canvas_modules_id_fkey" FOREIGN KEY ("module_id") REFERENCES "canvas_modules"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "canvas_module_items" ADD CONSTRAINT "canvas_module_items_course_id_canvas_courses_id_fkey" FOREIGN KEY ("course_id") REFERENCES "canvas_courses"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "canvas_modules" ADD CONSTRAINT "canvas_modules_course_id_canvas_courses_id_fkey" FOREIGN KEY ("course_id") REFERENCES "canvas_courses"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "canvas_submissions" ADD CONSTRAINT "canvas_submissions_course_id_canvas_courses_id_fkey" FOREIGN KEY ("course_id") REFERENCES "canvas_courses"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "canvas_submissions" ADD CONSTRAINT "canvas_submissions_assignment_id_canvas_assignments_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "canvas_assignments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "canvas_submissions" ADD CONSTRAINT "canvas_submissions_user_id_canvas_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "canvas_users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "canvas_todo_items" ADD CONSTRAINT "canvas_todo_items_course_id_canvas_courses_id_fkey" FOREIGN KEY ("course_id") REFERENCES "canvas_courses"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "canvas_todo_items" ADD CONSTRAINT "canvas_todo_items_assignment_id_canvas_assignments_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "canvas_assignments"("id") ON DELETE CASCADE;