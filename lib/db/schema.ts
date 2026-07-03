import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm/_relations";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Canvas LMS local cache schema for PostgreSQL + Drizzle ORM.
 *
 * Designed for the DLSU Canvas instance, but table names are generic enough to
 * work with any Canvas LMS account. Store Canvas IDs as text because Canvas IDs
 * are 64-bit and the API can return them as strings when using:
 * Accept: application/json+canvas-string-ids
 */

type CanvasRaw = Record<string, unknown>;
type JsonArray<T = unknown> = T[];

const rawJson = () => jsonb("raw").$type<CanvasRaw>().notNull().default(sql`'{}'::jsonb`);

const lifecycleColumns = () => ({
  syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const canvasUsers = pgTable(
  "canvas_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    canvasId: text("canvas_id").notNull(),

    name: text("name"),
    sortableName: text("sortable_name"),
    shortName: text("short_name"),
    email: text("email"),
    avatarUrl: text("avatar_url"),
    locale: text("locale"),
    timeZone: text("time_zone"),
    bio: text("bio"),

    raw: rawJson(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("canvas_users_canvas_id_uq").on(table.canvasId),
    index("canvas_users_email_idx").on(table.email),
  ],
);

export const canvasCourses = pgTable(
  "canvas_courses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    canvasId: text("canvas_id").notNull(),

    name: text("name"),
    courseCode: text("course_code"),
    originalName: text("original_name"),
    workflowState: text("workflow_state"),
    enrollmentState: text("enrollment_state"),
    enrollmentTermId: text("enrollment_term_id"),
    termName: text("term_name"),
    accountId: text("account_id"),
    rootAccountId: text("root_account_id"),
    startAt: timestamp("start_at", { withTimezone: true }),
    endAt: timestamp("end_at", { withTimezone: true }),
    isPublic: boolean("is_public"),
    syllabusBody: text("syllabus_body"),

    raw: rawJson(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("canvas_courses_canvas_id_uq").on(table.canvasId),
    index("canvas_courses_workflow_state_idx").on(table.workflowState),
    index("canvas_courses_term_idx").on(table.enrollmentTermId),
  ],
);

export const canvasCourseNicknames = pgTable(
  "canvas_course_nicknames",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id").references(() => canvasCourses.id, { onDelete: "cascade" }),
    courseCanvasId: text("course_canvas_id").notNull(),

    nickname: text("nickname").notNull(),
    raw: rawJson(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("canvas_course_nicknames_course_canvas_id_uq").on(table.courseCanvasId),
    index("canvas_course_nicknames_course_id_idx").on(table.courseId),
  ],
);

export const canvasEnrollments = pgTable(
  "canvas_enrollments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    canvasId: text("canvas_id").notNull(),

    courseId: uuid("course_id").references(() => canvasCourses.id, { onDelete: "cascade" }),
    courseCanvasId: text("course_canvas_id").notNull(),
    userId: uuid("user_id").references(() => canvasUsers.id, { onDelete: "set null" }),
    userCanvasId: text("user_canvas_id"),

    type: text("type"), // StudentEnrollment, TeacherEnrollment, TaEnrollment, etc.
    role: text("role"),
    roleId: text("role_id"),
    enrollmentState: text("enrollment_state"),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
    totalActivityTimeSeconds: integer("total_activity_time_seconds"),

    currentScore: real("current_score"),
    currentGrade: text("current_grade"),
    finalScore: real("final_score"),
    finalGrade: text("final_grade"),
    grades: jsonb("grades").$type<CanvasRaw>(),

    raw: rawJson(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("canvas_enrollments_canvas_id_uq").on(table.canvasId),
    index("canvas_enrollments_course_id_idx").on(table.courseId),
    index("canvas_enrollments_user_id_idx").on(table.userId),
    index("canvas_enrollments_course_canvas_id_idx").on(table.courseCanvasId),
    index("canvas_enrollments_user_canvas_id_idx").on(table.userCanvasId),
    index("canvas_enrollments_state_idx").on(table.enrollmentState),
  ],
);

export const canvasAssignmentGroups = pgTable(
  "canvas_assignment_groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    canvasId: text("canvas_id").notNull(),

    courseId: uuid("course_id").references(() => canvasCourses.id, { onDelete: "cascade" }),
    courseCanvasId: text("course_canvas_id").notNull(),
    name: text("name"),
    position: integer("position"),
    groupWeight: real("group_weight"),
    rules: jsonb("rules").$type<CanvasRaw>(),

    raw: rawJson(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("canvas_assignment_groups_canvas_id_uq").on(table.canvasId),
    index("canvas_assignment_groups_course_id_idx").on(table.courseId),
    index("canvas_assignment_groups_course_canvas_id_idx").on(table.courseCanvasId),
  ],
);

export const canvasAssignments = pgTable(
  "canvas_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    canvasId: text("canvas_id").notNull(),

    courseId: uuid("course_id").references(() => canvasCourses.id, { onDelete: "cascade" }),
    courseCanvasId: text("course_canvas_id").notNull(),
    assignmentGroupId: uuid("assignment_group_id").references(() => canvasAssignmentGroups.id, {
      onDelete: "set null",
    }),
    assignmentGroupCanvasId: text("assignment_group_canvas_id"),

    name: text("name"),
    description: text("description"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    unlockAt: timestamp("unlock_at", { withTimezone: true }),
    lockAt: timestamp("lock_at", { withTimezone: true }),
    allDates: jsonb("all_dates").$type<JsonArray<CanvasRaw>>(),

    pointsPossible: real("points_possible"),
    gradingType: text("grading_type"),
    submissionTypes: jsonb("submission_types").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    allowedExtensions: jsonb("allowed_extensions").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    hasSubmittedSubmissions: boolean("has_submitted_submissions"),
    needsGradingCount: integer("needs_grading_count"),

    htmlUrl: text("html_url"),
    externalToolTagAttributes: jsonb("external_tool_tag_attributes").$type<CanvasRaw>(),
    rubric: jsonb("rubric").$type<JsonArray<CanvasRaw>>(),
    rubricSettings: jsonb("rubric_settings").$type<CanvasRaw>(),

    workflowState: text("workflow_state"),
    published: boolean("published"),
    muted: boolean("muted"),
    omitFromFinalGrade: boolean("omit_from_final_grade"),

    raw: rawJson(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("canvas_assignments_canvas_id_uq").on(table.canvasId),
    index("canvas_assignments_course_id_idx").on(table.courseId),
    index("canvas_assignments_course_canvas_id_idx").on(table.courseCanvasId),
    index("canvas_assignments_group_id_idx").on(table.assignmentGroupId),
    index("canvas_assignments_due_at_idx").on(table.dueAt),
    index("canvas_assignments_workflow_state_idx").on(table.workflowState),
  ],
);

export const canvasSubmissions = pgTable(
  "canvas_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    canvasId: text("canvas_id"),

    courseId: uuid("course_id").references(() => canvasCourses.id, { onDelete: "cascade" }),
    courseCanvasId: text("course_canvas_id").notNull(),
    assignmentId: uuid("assignment_id").references(() => canvasAssignments.id, { onDelete: "cascade" }),
    assignmentCanvasId: text("assignment_canvas_id").notNull(),
    userId: uuid("user_id").references(() => canvasUsers.id, { onDelete: "set null" }),
    userCanvasId: text("user_canvas_id").notNull(),

    attempt: integer("attempt"),
    workflowState: text("workflow_state"),
    submissionType: text("submission_type"),
    body: text("body"),
    url: text("url"),
    previewUrl: text("preview_url"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    gradedAt: timestamp("graded_at", { withTimezone: true }),
    cachedDueAt: timestamp("cached_due_at", { withTimezone: true }),

    score: real("score"),
    grade: text("grade"),
    enteredScore: real("entered_score"),
    enteredGrade: text("entered_grade"),
    excused: boolean("excused"),
    late: boolean("late"),
    missing: boolean("missing"),
    secondsLate: integer("seconds_late"),
    latePolicyStatus: text("late_policy_status"),

    attachments: jsonb("attachments").$type<JsonArray<CanvasRaw>>().notNull().default(sql`'[]'::jsonb`),
    submissionComments: jsonb("submission_comments").$type<JsonArray<CanvasRaw>>().notNull().default(sql`'[]'::jsonb`),
    rubricAssessment: jsonb("rubric_assessment").$type<CanvasRaw>(),
    assignmentVisible: boolean("assignment_visible"),

    raw: rawJson(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("canvas_submissions_canvas_id_uq").on(table.canvasId),
    uniqueIndex("canvas_submissions_assignment_user_attempt_uq").on(
      table.assignmentCanvasId,
      table.userCanvasId,
      table.attempt,
    ),
    index("canvas_submissions_course_id_idx").on(table.courseId),
    index("canvas_submissions_assignment_id_idx").on(table.assignmentId),
    index("canvas_submissions_user_id_idx").on(table.userId),
    index("canvas_submissions_workflow_state_idx").on(table.workflowState),
    index("canvas_submissions_submitted_at_idx").on(table.submittedAt),
  ],
);

export const canvasDiscussionTopics = pgTable(
  "canvas_discussion_topics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    canvasId: text("canvas_id").notNull(),

    courseId: uuid("course_id").references(() => canvasCourses.id, { onDelete: "cascade" }),
    courseCanvasId: text("course_canvas_id").notNull(),

    title: text("title"),
    message: text("message"),
    htmlUrl: text("html_url"),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    delayedPostAt: timestamp("delayed_post_at", { withTimezone: true }),
    lastReplyAt: timestamp("last_reply_at", { withTimezone: true }),
    discussionType: text("discussion_type"),
    workflowState: text("workflow_state"),
    isAnnouncement: boolean("is_announcement").notNull().default(false),
    requireInitialPost: boolean("require_initial_post"),
    userCount: integer("user_count"),
    discussionSubentryCount: integer("discussion_subentry_count"),
    author: jsonb("author").$type<CanvasRaw>(),

    raw: rawJson(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("canvas_discussion_topics_canvas_id_uq").on(table.canvasId),
    index("canvas_discussion_topics_course_id_idx").on(table.courseId),
    index("canvas_discussion_topics_course_canvas_id_idx").on(table.courseCanvasId),
    index("canvas_discussion_topics_posted_at_idx").on(table.postedAt),
    index("canvas_discussion_topics_is_announcement_idx").on(table.isAnnouncement),
  ],
);

export const canvasModules = pgTable(
  "canvas_modules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    canvasId: text("canvas_id").notNull(),

    courseId: uuid("course_id").references(() => canvasCourses.id, { onDelete: "cascade" }),
    courseCanvasId: text("course_canvas_id").notNull(),

    name: text("name"),
    position: integer("position"),
    workflowState: text("workflow_state"),
    unlockAt: timestamp("unlock_at", { withTimezone: true }),
    requireSequentialProgress: boolean("require_sequential_progress"),
    prerequisiteModuleIds: jsonb("prerequisite_module_ids").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    itemsCount: integer("items_count"),
    itemsUrl: text("items_url"),

    raw: rawJson(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("canvas_modules_canvas_id_uq").on(table.canvasId),
    index("canvas_modules_course_id_idx").on(table.courseId),
    index("canvas_modules_course_canvas_id_idx").on(table.courseCanvasId),
    index("canvas_modules_position_idx").on(table.position),
  ],
);

export const canvasModuleItems = pgTable(
  "canvas_module_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    canvasId: text("canvas_id").notNull(),

    moduleId: uuid("module_id").references(() => canvasModules.id, { onDelete: "cascade" }),
    moduleCanvasId: text("module_canvas_id").notNull(),
    courseId: uuid("course_id").references(() => canvasCourses.id, { onDelete: "cascade" }),
    courseCanvasId: text("course_canvas_id").notNull(),

    title: text("title"),
    type: text("type"), // File, Page, Discussion, Assignment, Quiz, ExternalUrl, etc.
    contentId: text("content_id"),
    position: integer("position"),
    indent: integer("indent"),
    pageUrl: text("page_url"),
    htmlUrl: text("html_url"),
    url: text("url"),
    externalUrl: text("external_url"),
    completionRequirement: jsonb("completion_requirement").$type<CanvasRaw>(),
    contentDetails: jsonb("content_details").$type<CanvasRaw>(),
    published: boolean("published"),

    raw: rawJson(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("canvas_module_items_canvas_id_uq").on(table.canvasId),
    index("canvas_module_items_module_id_idx").on(table.moduleId),
    index("canvas_module_items_course_id_idx").on(table.courseId),
    index("canvas_module_items_content_id_idx").on(table.contentId),
    index("canvas_module_items_position_idx").on(table.position),
  ],
);

export const canvasFolders = pgTable(
  "canvas_folders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    canvasId: text("canvas_id").notNull(),

    courseId: uuid("course_id").references(() => canvasCourses.id, { onDelete: "cascade" }),
    courseCanvasId: text("course_canvas_id"),
    parentFolderCanvasId: text("parent_folder_canvas_id"),

    name: text("name"),
    fullName: text("full_name"),
    contextType: text("context_type"),
    contextId: text("context_id"),
    foldersUrl: text("folders_url"),
    filesUrl: text("files_url"),
    filesCount: integer("files_count"),
    foldersCount: integer("folders_count"),
    position: integer("position"),
    locked: boolean("locked"),
    hidden: boolean("hidden"),

    raw: rawJson(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("canvas_folders_canvas_id_uq").on(table.canvasId),
    index("canvas_folders_course_id_idx").on(table.courseId),
    index("canvas_folders_course_canvas_id_idx").on(table.courseCanvasId),
    index("canvas_folders_parent_canvas_id_idx").on(table.parentFolderCanvasId),
  ],
);

export const canvasFiles = pgTable(
  "canvas_files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    canvasId: text("canvas_id").notNull(),

    courseId: uuid("course_id").references(() => canvasCourses.id, { onDelete: "cascade" }),
    courseCanvasId: text("course_canvas_id"),
    folderId: uuid("folder_id").references(() => canvasFolders.id, { onDelete: "set null" }),
    folderCanvasId: text("folder_canvas_id"),

    displayName: text("display_name"),
    filename: text("filename"),
    contentType: text("content_type"),
    url: text("url"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    createdAtCanvas: timestamp("created_at_canvas", { withTimezone: true }),
    updatedAtCanvas: timestamp("updated_at_canvas", { withTimezone: true }),
    unlockAt: timestamp("unlock_at", { withTimezone: true }),
    locked: boolean("locked"),
    hidden: boolean("hidden"),
    visibilityLevel: text("visibility_level"),
    thumbnailUrl: text("thumbnail_url"),
    mimeClass: text("mime_class"),

    raw: rawJson(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("canvas_files_canvas_id_uq").on(table.canvasId),
    index("canvas_files_course_id_idx").on(table.courseId),
    index("canvas_files_course_canvas_id_idx").on(table.courseCanvasId),
    index("canvas_files_folder_id_idx").on(table.folderId),
    index("canvas_files_content_type_idx").on(table.contentType),
    index("canvas_files_created_at_canvas_idx").on(table.createdAtCanvas),
  ],
);

export const canvasCalendarEvents = pgTable(
  "canvas_calendar_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    canvasId: text("canvas_id").notNull(),

    courseId: uuid("course_id").references(() => canvasCourses.id, { onDelete: "cascade" }),
    courseCanvasId: text("course_canvas_id"),
    assignmentId: uuid("assignment_id").references(() => canvasAssignments.id, { onDelete: "set null" }),
    assignmentCanvasId: text("assignment_canvas_id"),

    contextCode: text("context_code"), // course_<id> or user_<id>
    type: text("type"), // event or assignment
    title: text("title"),
    description: text("description"),
    htmlUrl: text("html_url"),
    startAt: timestamp("start_at", { withTimezone: true }),
    endAt: timestamp("end_at", { withTimezone: true }),
    allDay: boolean("all_day"),
    allDayDate: text("all_day_date"),
    workflowState: text("workflow_state"),
    locationName: text("location_name"),
    locationAddress: text("location_address"),
    blackoutDate: boolean("blackout_date"),
    importantDates: boolean("important_dates"),

    raw: rawJson(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("canvas_calendar_events_canvas_id_uq").on(table.canvasId),
    index("canvas_calendar_events_course_id_idx").on(table.courseId),
    index("canvas_calendar_events_assignment_id_idx").on(table.assignmentId),
    index("canvas_calendar_events_context_code_idx").on(table.contextCode),
    index("canvas_calendar_events_type_idx").on(table.type),
    index("canvas_calendar_events_start_at_idx").on(table.startAt),
    index("canvas_calendar_events_end_at_idx").on(table.endAt),
  ],
);

export const canvasTodoItems = pgTable(
  "canvas_todo_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    canvasId: text("canvas_id").notNull(), // API id, assignment id, or deterministic hash from sync code.

    courseId: uuid("course_id").references(() => canvasCourses.id, { onDelete: "cascade" }),
    courseCanvasId: text("course_canvas_id"),
    assignmentId: uuid("assignment_id").references(() => canvasAssignments.id, { onDelete: "cascade" }),
    assignmentCanvasId: text("assignment_canvas_id"),

    type: text("type"),
    title: text("title"),
    htmlUrl: text("html_url"),
    ignore: text("ignore"),
    ignorePermanently: text("ignore_permanently"),
    needsGradingCount: integer("needs_grading_count"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    plannableDate: timestamp("plannable_date", { withTimezone: true }),
    plannable: jsonb("plannable").$type<CanvasRaw>(),
    contextName: text("context_name"),

    raw: rawJson(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("canvas_todo_items_canvas_id_uq").on(table.canvasId),
    index("canvas_todo_items_course_id_idx").on(table.courseId),
    index("canvas_todo_items_assignment_id_idx").on(table.assignmentId),
    index("canvas_todo_items_due_at_idx").on(table.dueAt),
    index("canvas_todo_items_type_idx").on(table.type),
  ],
);

export const canvasApiSyncState = pgTable(
  "canvas_api_sync_state",
  {
    key: text("key").primaryKey(), // Example: courses:active, assignments:<courseCanvasId>
    resource: text("resource").notNull(),
    courseCanvasId: text("course_canvas_id"),
    userCanvasId: text("user_canvas_id"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    nextUrl: text("next_url"),
    cursor: text("cursor"),
    etag: text("etag"),
    metadata: jsonb("metadata").$type<CanvasRaw>().notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("canvas_api_sync_state_resource_idx").on(table.resource),
    index("canvas_api_sync_state_course_canvas_id_idx").on(table.courseCanvasId),
  ],
);

export const canvasApiSyncRuns = pgTable(
  "canvas_api_sync_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    resource: text("resource").notNull(),
    scope: text("scope"), // Example: all, self, course:<id>
    status: text("status").notNull().default("running"), // running, success, failed, partial
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    itemCount: integer("item_count").notNull().default(0),
    requestCount: integer("request_count").notNull().default(0),
    errorMessage: text("error_message"),
    metadata: jsonb("metadata").$type<CanvasRaw>().notNull().default(sql`'{}'::jsonb`),
  },
  (table) => [
    index("canvas_api_sync_runs_resource_idx").on(table.resource),
    index("canvas_api_sync_runs_status_idx").on(table.status),
    index("canvas_api_sync_runs_started_at_idx").on(table.startedAt),
  ],
);

export const canvasCoursesRelations = relations(canvasCourses, ({ many }) => ({
  nicknames: many(canvasCourseNicknames),
  enrollments: many(canvasEnrollments),
  assignmentGroups: many(canvasAssignmentGroups),
  assignments: many(canvasAssignments),
  submissions: many(canvasSubmissions),
  discussionTopics: many(canvasDiscussionTopics),
  modules: many(canvasModules),
  moduleItems: many(canvasModuleItems),
  folders: many(canvasFolders),
  files: many(canvasFiles),
  calendarEvents: many(canvasCalendarEvents),
  todoItems: many(canvasTodoItems),
}));

export const canvasUsersRelations = relations(canvasUsers, ({ many }) => ({
  enrollments: many(canvasEnrollments),
  submissions: many(canvasSubmissions),
}));

export const canvasCourseNicknamesRelations = relations(canvasCourseNicknames, ({ one }) => ({
  course: one(canvasCourses, {
    fields: [canvasCourseNicknames.courseId],
    references: [canvasCourses.id],
  }),
}));

export const canvasEnrollmentsRelations = relations(canvasEnrollments, ({ one }) => ({
  course: one(canvasCourses, {
    fields: [canvasEnrollments.courseId],
    references: [canvasCourses.id],
  }),
  user: one(canvasUsers, {
    fields: [canvasEnrollments.userId],
    references: [canvasUsers.id],
  }),
}));

export const canvasAssignmentGroupsRelations = relations(canvasAssignmentGroups, ({ one, many }) => ({
  course: one(canvasCourses, {
    fields: [canvasAssignmentGroups.courseId],
    references: [canvasCourses.id],
  }),
  assignments: many(canvasAssignments),
}));

export const canvasAssignmentsRelations = relations(canvasAssignments, ({ one, many }) => ({
  course: one(canvasCourses, {
    fields: [canvasAssignments.courseId],
    references: [canvasCourses.id],
  }),
  assignmentGroup: one(canvasAssignmentGroups, {
    fields: [canvasAssignments.assignmentGroupId],
    references: [canvasAssignmentGroups.id],
  }),
  submissions: many(canvasSubmissions),
  calendarEvents: many(canvasCalendarEvents),
  todoItems: many(canvasTodoItems),
}));

export const canvasSubmissionsRelations = relations(canvasSubmissions, ({ one }) => ({
  course: one(canvasCourses, {
    fields: [canvasSubmissions.courseId],
    references: [canvasCourses.id],
  }),
  assignment: one(canvasAssignments, {
    fields: [canvasSubmissions.assignmentId],
    references: [canvasAssignments.id],
  }),
  user: one(canvasUsers, {
    fields: [canvasSubmissions.userId],
    references: [canvasUsers.id],
  }),
}));

export const canvasDiscussionTopicsRelations = relations(canvasDiscussionTopics, ({ one }) => ({
  course: one(canvasCourses, {
    fields: [canvasDiscussionTopics.courseId],
    references: [canvasCourses.id],
  }),
}));

export const canvasModulesRelations = relations(canvasModules, ({ one, many }) => ({
  course: one(canvasCourses, {
    fields: [canvasModules.courseId],
    references: [canvasCourses.id],
  }),
  items: many(canvasModuleItems),
}));

export const canvasModuleItemsRelations = relations(canvasModuleItems, ({ one }) => ({
  module: one(canvasModules, {
    fields: [canvasModuleItems.moduleId],
    references: [canvasModules.id],
  }),
  course: one(canvasCourses, {
    fields: [canvasModuleItems.courseId],
    references: [canvasCourses.id],
  }),
}));

export const canvasFoldersRelations = relations(canvasFolders, ({ one, many }) => ({
  course: one(canvasCourses, {
    fields: [canvasFolders.courseId],
    references: [canvasCourses.id],
  }),
  files: many(canvasFiles),
}));

export const canvasFilesRelations = relations(canvasFiles, ({ one }) => ({
  course: one(canvasCourses, {
    fields: [canvasFiles.courseId],
    references: [canvasCourses.id],
  }),
  folder: one(canvasFolders, {
    fields: [canvasFiles.folderId],
    references: [canvasFolders.id],
  }),
}));

export const canvasCalendarEventsRelations = relations(canvasCalendarEvents, ({ one }) => ({
  course: one(canvasCourses, {
    fields: [canvasCalendarEvents.courseId],
    references: [canvasCourses.id],
  }),
  assignment: one(canvasAssignments, {
    fields: [canvasCalendarEvents.assignmentId],
    references: [canvasAssignments.id],
  }),
}));

export const canvasTodoItemsRelations = relations(canvasTodoItems, ({ one }) => ({
  course: one(canvasCourses, {
    fields: [canvasTodoItems.courseId],
    references: [canvasCourses.id],
  }),
  assignment: one(canvasAssignments, {
    fields: [canvasTodoItems.assignmentId],
    references: [canvasAssignments.id],
  }),
}));

export type CanvasUser = typeof canvasUsers.$inferSelect;
export type NewCanvasUser = typeof canvasUsers.$inferInsert;

export type CanvasCourse = typeof canvasCourses.$inferSelect;
export type NewCanvasCourse = typeof canvasCourses.$inferInsert;

export type CanvasCourseNickname = typeof canvasCourseNicknames.$inferSelect;
export type NewCanvasCourseNickname = typeof canvasCourseNicknames.$inferInsert;

export type CanvasEnrollment = typeof canvasEnrollments.$inferSelect;
export type NewCanvasEnrollment = typeof canvasEnrollments.$inferInsert;

export type CanvasAssignmentGroup = typeof canvasAssignmentGroups.$inferSelect;
export type NewCanvasAssignmentGroup = typeof canvasAssignmentGroups.$inferInsert;

export type CanvasAssignment = typeof canvasAssignments.$inferSelect;
export type NewCanvasAssignment = typeof canvasAssignments.$inferInsert;

export type CanvasSubmission = typeof canvasSubmissions.$inferSelect;
export type NewCanvasSubmission = typeof canvasSubmissions.$inferInsert;

export type CanvasDiscussionTopic = typeof canvasDiscussionTopics.$inferSelect;
export type NewCanvasDiscussionTopic = typeof canvasDiscussionTopics.$inferInsert;

export type CanvasModule = typeof canvasModules.$inferSelect;
export type NewCanvasModule = typeof canvasModules.$inferInsert;

export type CanvasModuleItem = typeof canvasModuleItems.$inferSelect;
export type NewCanvasModuleItem = typeof canvasModuleItems.$inferInsert;

export type CanvasFolder = typeof canvasFolders.$inferSelect;
export type NewCanvasFolder = typeof canvasFolders.$inferInsert;

export type CanvasFile = typeof canvasFiles.$inferSelect;
export type NewCanvasFile = typeof canvasFiles.$inferInsert;

export type CanvasCalendarEvent = typeof canvasCalendarEvents.$inferSelect;
export type NewCanvasCalendarEvent = typeof canvasCalendarEvents.$inferInsert;

export type CanvasTodoItem = typeof canvasTodoItems.$inferSelect;
export type NewCanvasTodoItem = typeof canvasTodoItems.$inferInsert;

export type CanvasApiSyncState = typeof canvasApiSyncState.$inferSelect;
export type NewCanvasApiSyncState = typeof canvasApiSyncState.$inferInsert;

export type CanvasApiSyncRun = typeof canvasApiSyncRuns.$inferSelect;
export type NewCanvasApiSyncRun = typeof canvasApiSyncRuns.$inferInsert;
