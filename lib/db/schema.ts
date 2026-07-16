import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm/_relations";
import {
  bigint,
  boolean,
  bytea,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  type AnyPgColumn,
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

const recordLifecycleColumns = () => ({
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

const lifecycleColumns = () => ({
  syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow().notNull(),
  ...recordLifecycleColumns(),
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

export const contactSocialPlatform = pgEnum("contact_social_platform", [
  "facebook",
  "instagram",
  "x",
  "linkedin",
  "tiktok",
  "youtube",
  "github",
  "website",
]);

export const trackedAccountStatus = pgEnum("tracked_account_status", [
  "active",
  "paused",
  "archived",
  "inactive",
]);

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    nickname: varchar("nickname", { length: 80 }),
    age: smallint("age"),
    birthday: date("birthday", { mode: "string" }),
    phone: varchar("phone", { length: 32 }),
    ...recordLifecycleColumns(),
  },
  (table) => [
    check(
      "contacts_name_length_check",
      sql`char_length(btrim(${table.name})) between 1 and 120`,
    ),
    check(
      "contacts_nickname_length_check",
      sql`${table.nickname} is null or char_length(btrim(${table.nickname})) between 1 and 80`,
    ),
    check("contacts_age_check", sql`${table.age} is null or ${table.age} between 0 and 150`),
    check(
      "contacts_phone_length_check",
      sql`${table.phone} is null or char_length(btrim(${table.phone})) between 1 and 32`,
    ),
    index("contacts_name_idx").on(table.name),
    index("contacts_created_at_idx").on(table.createdAt),
  ],
);

export const contactSocialLinks = pgTable(
  "contact_social_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    platform: contactSocialPlatform("platform").notNull(),
    url: varchar("url", { length: 2048 }).notNull(),
    ...recordLifecycleColumns(),
  },
  (table) => [
    check("contact_social_links_url_protocol_check", sql`${table.url} ~* '^https?://'`),
    index("contact_social_links_contact_id_idx").on(table.contactId),
    uniqueIndex("contact_social_links_contact_platform_url_uq").on(
      table.contactId,
      table.platform,
      table.url,
    ),
  ],
);

export const trackedAccounts = pgTable(
  "tracked_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountName: varchar("account_name", { length: 100 }).notNull(),
    email: varchar("email", { length: 254 }).notNull(),
    passwordCiphertext: bytea("password_ciphertext").notNull(),
    passwordSalt: bytea("password_salt").notNull(),
    passwordIv: bytea("password_iv").notNull(),
    passwordAuthTag: bytea("password_auth_tag").notNull(),
    encryptionVersion: smallint("encryption_version").default(1).notNull(),
    encryptionAlgorithm: varchar("encryption_algorithm", { length: 32 })
      .default("aes-256-gcm")
      .notNull(),
    keyDerivationAlgorithm: varchar("key_derivation_algorithm", { length: 32 })
      .default("argon2id")
      .notNull(),
    argon2MemoryCost: integer("argon2_memory_cost").notNull(),
    argon2TimeCost: integer("argon2_time_cost").notNull(),
    argon2Parallelism: smallint("argon2_parallelism").notNull(),
    notes: text("notes"),
    accountByContactId: uuid("account_by_contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    status: trackedAccountStatus("status").default("active").notNull(),
    ...recordLifecycleColumns(),
  },
  (table) => [
    check(
      "tracked_accounts_name_length_check",
      sql`char_length(btrim(${table.accountName})) between 2 and 100`,
    ),
    check(
      "tracked_accounts_email_length_check",
      sql`char_length(btrim(${table.email})) between 3 and 254`,
    ),
    check(
      "tracked_accounts_password_ciphertext_check",
      sql`octet_length(${table.passwordCiphertext}) > 0`,
    ),
    check(
      "tracked_accounts_password_salt_check",
      sql`octet_length(${table.passwordSalt}) = 16`,
    ),
    check("tracked_accounts_password_iv_check", sql`octet_length(${table.passwordIv}) = 12`),
    check(
      "tracked_accounts_password_auth_tag_check",
      sql`octet_length(${table.passwordAuthTag}) = 16`,
    ),
    check("tracked_accounts_encryption_version_check", sql`${table.encryptionVersion} > 0`),
    check(
      "tracked_accounts_encryption_algorithm_check",
      sql`char_length(btrim(${table.encryptionAlgorithm})) > 0`,
    ),
    check(
      "tracked_accounts_key_derivation_algorithm_check",
      sql`char_length(btrim(${table.keyDerivationAlgorithm})) > 0`,
    ),
    check("tracked_accounts_argon2_memory_cost_check", sql`${table.argon2MemoryCost} > 0`),
    check("tracked_accounts_argon2_time_cost_check", sql`${table.argon2TimeCost} > 0`),
    check("tracked_accounts_argon2_parallelism_check", sql`${table.argon2Parallelism} > 0`),
    check(
      "tracked_accounts_notes_length_check",
      sql`${table.notes} is null or char_length(btrim(${table.notes})) between 3 and 2000`,
    ),
    index("tracked_accounts_email_idx").on(table.email),
    index("tracked_accounts_account_by_contact_id_idx").on(table.accountByContactId),
    index("tracked_accounts_status_idx").on(table.status),
    index("tracked_accounts_created_at_idx").on(table.createdAt),
  ],
);

export const taskPriority = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

export const taskWorkCategory = pgEnum("task_work_category", [
  "academic",
  "organization",
  "personal",
  "development",
  "general",
]);

export const workUsers = pgTable(
  "work_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 254 }).notNull(),
    timezone: varchar("timezone", { length: 64 })
      .default("Asia/Manila")
      .notNull(),
    ...recordLifecycleColumns(),
  },
  (table) => [
    uniqueIndex("work_users_email_uq").on(table.email),
    check(
      "work_users_name_length_check",
      sql`char_length(btrim(${table.name})) between 1 and 120`,
    ),
  ],
);

export const taskTypes = pgTable(
  "task_types",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => workUsers.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 80 }).notNull(),
    normalizedName: varchar("normalized_name", { length: 80 }).notNull(),
    slug: varchar("slug", { length: 96 }).notNull(),
    description: varchar("description", { length: 240 }),
    color: varchar("color", { length: 7 }).default("#737373").notNull(),
    icon: varchar("icon", { length: 40 }).default("briefcase").notNull(),
    isSystem: boolean("is_system").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...recordLifecycleColumns(),
  },
  (table) => [
    uniqueIndex("task_types_owner_normalized_name_uq").on(
      table.ownerUserId,
      table.normalizedName,
    ),
    uniqueIndex("task_types_owner_slug_uq").on(table.ownerUserId, table.slug),
    index("task_types_owner_active_sort_idx").on(
      table.ownerUserId,
      table.isActive,
      table.sortOrder,
    ),
    check(
      "task_types_name_length_check",
      sql`char_length(btrim(${table.name})) between 1 and 80`,
    ),
    check("task_types_color_check", sql`${table.color} ~ '^#[0-9A-Fa-f]{6}$'`),
  ],
);

export const taskStatuses = pgTable(
  "task_statuses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => workUsers.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 60 }).notNull(),
    slug: varchar("slug", { length: 72 }).notNull(),
    color: varchar("color", { length: 7 }).default("#737373").notNull(),
    isCompleted: boolean("is_completed").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...recordLifecycleColumns(),
  },
  (table) => [
    uniqueIndex("task_statuses_owner_slug_uq").on(table.ownerUserId, table.slug),
    index("task_statuses_owner_active_sort_idx").on(
      table.ownerUserId,
      table.isActive,
      table.sortOrder,
    ),
    check(
      "task_statuses_name_length_check",
      sql`char_length(btrim(${table.name})) between 1 and 60`,
    ),
    check("task_statuses_color_check", sql`${table.color} ~ '^#[0-9A-Fa-f]{6}$'`),
  ],
);

export const workOrganizations = pgTable(
  "work_organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => workUsers.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    normalizedName: varchar("normalized_name", { length: 120 }).notNull(),
    description: varchar("description", { length: 240 }),
    isActive: boolean("is_active").default(true).notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...recordLifecycleColumns(),
  },
  (table) => [
    uniqueIndex("work_organizations_owner_normalized_name_uq").on(
      table.ownerUserId,
      table.normalizedName,
    ),
    index("work_organizations_owner_active_name_idx").on(
      table.ownerUserId,
      table.isActive,
      table.name,
    ),
    check(
      "work_organizations_name_length_check",
      sql`char_length(btrim(${table.name})) between 1 and 120`,
    ),
  ],
);

export const workTags = pgTable(
  "work_tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => workUsers.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 40 }).notNull(),
    normalizedName: varchar("normalized_name", { length: 40 }).notNull(),
    slug: varchar("slug", { length: 48 }).notNull(),
    ...recordLifecycleColumns(),
  },
  (table) => [
    uniqueIndex("work_tags_owner_normalized_name_uq").on(
      table.ownerUserId,
      table.normalizedName,
    ),
    uniqueIndex("work_tags_owner_slug_uq").on(table.ownerUserId, table.slug),
    index("work_tags_owner_name_idx").on(table.ownerUserId, table.name),
  ],
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => workUsers.id, { onDelete: "cascade" }),
    parentTaskId: uuid("parent_task_id").references(
      (): AnyPgColumn => tasks.id,
      { onDelete: "set null" },
    ),
    taskTypeId: uuid("task_type_id")
      .notNull()
      .references(() => taskTypes.id, { onDelete: "restrict" }),
    statusId: uuid("status_id")
      .notNull()
      .references(() => taskStatuses.id, { onDelete: "restrict" }),
    courseId: uuid("course_id").references(() => canvasCourses.id, {
      onDelete: "set null",
    }),
    organizationId: uuid("organization_id").references(
      () => workOrganizations.id,
      { onDelete: "set null" },
    ),
    title: varchar("title", { length: 160 }).notNull(),
    description: text("description"),
    notes: text("notes"),
    priority: taskPriority("priority").default("medium").notNull(),
    workCategory: taskWorkCategory("work_category").default("general").notNull(),
    startDate: date("start_date", { mode: "string" }),
    dueDate: date("due_date", { mode: "string" }),
    dueTime: time("due_time", { precision: 0 }),
    dueAt: timestamp("due_at", { withTimezone: true }),
    timezone: varchar("timezone", { length: 64 }).default("Asia/Manila").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    requestKey: uuid("request_key"),
    version: integer("version").default(1).notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => workUsers.id, { onDelete: "restrict" }),
    updatedBy: uuid("updated_by")
      .notNull()
      .references(() => workUsers.id, { onDelete: "restrict" }),
    ...recordLifecycleColumns(),
  },
  (table) => [
    index("tasks_owner_deleted_updated_idx").on(
      table.ownerUserId,
      table.deletedAt,
      table.updatedAt,
    ),
    index("tasks_owner_parent_deleted_idx").on(
      table.ownerUserId,
      table.parentTaskId,
      table.deletedAt,
    ),
    index("tasks_owner_type_idx").on(table.ownerUserId, table.taskTypeId),
    index("tasks_owner_status_idx").on(table.ownerUserId, table.statusId),
    index("tasks_owner_due_date_idx").on(table.ownerUserId, table.dueDate),
    index("tasks_course_id_idx").on(table.courseId),
    index("tasks_organization_id_idx").on(table.organizationId),
    uniqueIndex("tasks_owner_request_key_uq").on(
      table.ownerUserId,
      table.requestKey,
    ),
    check(
      "tasks_title_length_check",
      sql`char_length(btrim(${table.title})) between 1 and 160`,
    ),
    check(
      "tasks_description_length_check",
      sql`${table.description} is null or char_length(${table.description}) <= 5000`,
    ),
    check(
      "tasks_notes_length_check",
      sql`${table.notes} is null or char_length(${table.notes}) <= 5000`,
    ),
    check(
      "tasks_parent_not_self_check",
      sql`${table.parentTaskId} is null or ${table.parentTaskId} <> ${table.id}`,
    ),
    check(
      "tasks_due_time_requires_date_check",
      sql`${table.dueTime} is null or ${table.dueDate} is not null`,
    ),
    check(
      "tasks_context_compatibility_check",
      sql`(${table.courseId} is null or ${table.workCategory} = 'academic')
        and (${table.organizationId} is null or ${table.workCategory} = 'organization')
        and not (${table.courseId} is not null and ${table.organizationId} is not null)`,
    ),
    check("tasks_version_check", sql`${table.version} > 0`),
  ],
);

export const taskTags = pgTable(
  "task_tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => workTags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("task_tags_task_tag_uq").on(table.taskId, table.tagId),
    index("task_tags_tag_id_idx").on(table.tagId),
  ],
);

export const taskActivityLogs = pgTable(
  "task_activity_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => workUsers.id, { onDelete: "cascade" }),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => workUsers.id, { onDelete: "restrict" }),
    action: varchar("action", { length: 40 }).notNull(),
    details: jsonb("details").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("task_activity_logs_owner_task_created_idx").on(
      table.ownerUserId,
      table.taskId,
      table.createdAt,
    ),
  ],
);

export const contactsRelations = relations(contacts, ({ many }) => ({
  socialLinks: many(contactSocialLinks),
  trackedAccounts: many(trackedAccounts),
}));

export const contactSocialLinksRelations = relations(contactSocialLinks, ({ one }) => ({
  contact: one(contacts, {
    fields: [contactSocialLinks.contactId],
    references: [contacts.id],
  }),
}));

export const trackedAccountsRelations = relations(trackedAccounts, ({ one }) => ({
  accountByContact: one(contacts, {
    fields: [trackedAccounts.accountByContactId],
    references: [contacts.id],
  }),
}));

export const workUsersRelations = relations(workUsers, ({ many }) => ({
  taskTypes: many(taskTypes),
  taskStatuses: many(taskStatuses),
  organizations: many(workOrganizations),
  tags: many(workTags),
  tasks: many(tasks),
  taskActivityLogs: many(taskActivityLogs),
}));

export const taskTypesRelations = relations(taskTypes, ({ one, many }) => ({
  owner: one(workUsers, {
    fields: [taskTypes.ownerUserId],
    references: [workUsers.id],
  }),
  tasks: many(tasks),
}));

export const taskStatusesRelations = relations(taskStatuses, ({ one, many }) => ({
  owner: one(workUsers, {
    fields: [taskStatuses.ownerUserId],
    references: [workUsers.id],
  }),
  tasks: many(tasks),
}));

export const workOrganizationsRelations = relations(
  workOrganizations,
  ({ one, many }) => ({
    owner: one(workUsers, {
      fields: [workOrganizations.ownerUserId],
      references: [workUsers.id],
    }),
    tasks: many(tasks),
  }),
);

export const workTagsRelations = relations(workTags, ({ one, many }) => ({
  owner: one(workUsers, {
    fields: [workTags.ownerUserId],
    references: [workUsers.id],
  }),
  taskTags: many(taskTags),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  owner: one(workUsers, {
    fields: [tasks.ownerUserId],
    references: [workUsers.id],
  }),
  parent: one(tasks, {
    fields: [tasks.parentTaskId],
    references: [tasks.id],
    relationName: "taskHierarchy",
  }),
  subtasks: many(tasks, { relationName: "taskHierarchy" }),
  taskType: one(taskTypes, {
    fields: [tasks.taskTypeId],
    references: [taskTypes.id],
  }),
  status: one(taskStatuses, {
    fields: [tasks.statusId],
    references: [taskStatuses.id],
  }),
  course: one(canvasCourses, {
    fields: [tasks.courseId],
    references: [canvasCourses.id],
  }),
  organization: one(workOrganizations, {
    fields: [tasks.organizationId],
    references: [workOrganizations.id],
  }),
  tags: many(taskTags),
  activityLogs: many(taskActivityLogs),
}));

export const taskTagsRelations = relations(taskTags, ({ one }) => ({
  task: one(tasks, {
    fields: [taskTags.taskId],
    references: [tasks.id],
  }),
  tag: one(workTags, {
    fields: [taskTags.tagId],
    references: [workTags.id],
  }),
}));

export const taskActivityLogsRelations = relations(
  taskActivityLogs,
  ({ one }) => ({
    owner: one(workUsers, {
      fields: [taskActivityLogs.ownerUserId],
      references: [workUsers.id],
    }),
    task: one(tasks, {
      fields: [taskActivityLogs.taskId],
      references: [tasks.id],
    }),
    actor: one(workUsers, {
      fields: [taskActivityLogs.actorUserId],
      references: [workUsers.id],
    }),
  }),
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

export type ContactSocialPlatform = (typeof contactSocialPlatform.enumValues)[number];
export type TrackedAccountStatus = (typeof trackedAccountStatus.enumValues)[number];
export type TaskPriority = (typeof taskPriority.enumValues)[number];
export type TaskWorkCategory = (typeof taskWorkCategory.enumValues)[number];

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;

export type ContactSocialLink = typeof contactSocialLinks.$inferSelect;
export type NewContactSocialLink = typeof contactSocialLinks.$inferInsert;

export type TrackedAccount = typeof trackedAccounts.$inferSelect;
export type NewTrackedAccount = typeof trackedAccounts.$inferInsert;

export type WorkUser = typeof workUsers.$inferSelect;
export type NewWorkUser = typeof workUsers.$inferInsert;
export type TaskType = typeof taskTypes.$inferSelect;
export type NewTaskType = typeof taskTypes.$inferInsert;
export type TaskStatus = typeof taskStatuses.$inferSelect;
export type NewTaskStatus = typeof taskStatuses.$inferInsert;
export type WorkOrganization = typeof workOrganizations.$inferSelect;
export type NewWorkOrganization = typeof workOrganizations.$inferInsert;
export type WorkTag = typeof workTags.$inferSelect;
export type NewWorkTag = typeof workTags.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type TaskTag = typeof taskTags.$inferSelect;
export type NewTaskTag = typeof taskTags.$inferInsert;
export type TaskActivityLog = typeof taskActivityLogs.$inferSelect;
export type NewTaskActivityLog = typeof taskActivityLogs.$inferInsert;

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
