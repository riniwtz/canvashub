import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const DiscussionTopicSchema = z.looseObject({
  posted_at: z.optional(z.nullable(z.string())),
  created_at: z.optional(z.nullable(z.string())),
});

const AssignmentSchema = z.object({
  id: z.number(),
  course_id: z.number(),
  assignment_group_id: z.number(),

  name: z.string(),
  description: z.string().nullable(),

  created_at: z.string(),
  updated_at: z.string(),

  due_at: z.string().nullable(),
  unlock_at: z.string().nullable(),
  lock_at: z.string().nullable(),

  points_possible: z.number().nullable(),

  grading_type: z.enum([
    "pass_fail",
    "percent",
    "letter_grade",
    "gpa_scale",
    "points",
    "not_graded",
  ]),

  submission_types: z.array(z.string()),

  allowed_extensions: z.array(z.string()).optional(),

  html_url: z.string(),
  submissions_download_url: z.string().optional(),

  position: z.number(),
  published: z.boolean(),
  unpublishable: z.boolean().optional(),
  workflow_state: z.string(),

  locked_for_user: z.boolean(),
  lock_info: z.record(z.string(), z.unknown()).optional(),
  lock_explanation: z.string().optional(),

  has_overrides: z.boolean().optional(),
  only_visible_to_overrides: z.boolean().optional(),

  peer_reviews: z.boolean().optional(),
  automatic_peer_reviews: z.boolean().optional(),

  group_category_id: z.number().nullable().optional(),
  grade_group_students_individually: z.boolean().optional(),

  omit_from_final_grade: z.boolean().optional(),
  hide_in_gradebook: z.boolean().optional(),

  allowed_attempts: z.number().optional(),
  has_submitted_submissions: z.boolean().optional(),
  graded_submissions_exist: z.boolean().optional(),

  quiz_id: z.number().optional(),

  discussion_topic: DiscussionTopicSchema.optional(),
});

const AssignmentsSchema = z.array(AssignmentSchema);

type Assignment = z.infer<typeof AssignmentSchema>;
type Assignments = z.infer<typeof AssignmentsSchema>;

interface Task {
  name: string;
  due_at: string | null;
  points_possible: number | null;
  grade: string | null;
  posted_at: string | null;
  created_at: string | null;
  url: string | null;
}

async function fetchFromCanvas(url: string) {
  const cookie = process.env.CANVAS_COURSES_COOKIE ?? "";

  if (!cookie) {
    console.error("No cookies are available.");
    return;
  }

  const response = await fetch(url, {
    headers: {
      Accept:
        process.env.CANVAS_COURSES_ACCEPT ??
        "application/json, text/plain, */*",
      "User-Agent": process.env.CANVAS_COURSES_USER_AGENT ?? "Mozilla/5.0",
      Cookie: cookie,
    },
  });
}

async function getDiscussions(courseId: string) {
  // https://dlsu.instructure.com/courses/249326/discussion_topics
}

async function getAssignments(courseId: string): Promise<Assignments> {
  const cookie = process.env.CANVAS_COURSES_COOKIE;

  if (!cookie) {
    throw new Error("CANVAS_COURSES_COOKIE is missing from your environment.");
  }

  const url = new URL(
    `https://dlsu.instructure.com/api/v1/courses/${encodeURIComponent(
      courseId,
    )}/assignments`,
  );

  url.searchParams.set("per_page", "100");

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept:
        process.env.CANVAS_COURSES_ACCEPT ??
        "application/json, text/plain, */*",
      "User-Agent": process.env.CANVAS_COURSES_USER_AGENT ?? "Mozilla/5.0",
      Cookie: cookie,
    },
    redirect: "manual",
  });

  const contentType = response.headers.get("content-type") ?? "";
  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      [
        "Canvas request failed.",
        `Status: ${response.status} ${response.statusText}`,
        `Content-Type: ${contentType}`,
        `Body: ${body.slice(0, 500)}`,
      ].join("\n"),
    );
  }

  if (!contentType.includes("application/json")) {
    throw new Error(
      [
        `Canvas returned ${contentType || "an unknown content type"} instead of JSON.`,
        "Your Canvas cookie may be expired or incomplete.",
        `Response preview: ${body.slice(0, 500)}`,
      ].join("\n"),
    );
  }

  let data: unknown;

  try {
    data = JSON.parse(body);
  } catch {
    throw new Error("Canvas returned a response that was not valid JSON.");
  }

  const result = AssignmentsSchema.safeParse(data);

  if (!result.success) {
    console.error(
      z.prettifyError ? z.prettifyError(result.error) : result.error.issues,
    );

    throw new Error("Canvas returned invalid assignment data.");
  }

  return result.data;
}

async function saveToFile(fileName: string, data: unknown): Promise<void> {
  const outputDir = path.join(process.cwd(), "output");
  const filePath = path.join(outputDir, fileName);

  await mkdir(outputDir, { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf8");

  console.log(`${fileName} saved to ${filePath}`);
}

async function extractFetchAndSaveTasksToFile(): Promise<void> {
  const assignments = await getAssignments("245189");

  const tasks: Task[] = assignments.map(
    (assignment: Assignment): Task => ({
      name: assignment.name,
      due_at: assignment.due_at,
      points_possible: assignment.points_possible,
      grade: null,

      posted_at: assignment.discussion_topic?.posted_at ?? null,

      created_at:
        assignment.discussion_topic?.created_at ??
        assignment.created_at ??
        null,

      url: assignment.html_url,
    }),
  );

  await saveToFile("tasks.json", tasks);
}

async function main(): Promise<void> {
  try {
    await extractFetchAndSaveTasksToFile();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);

    process.exitCode = 1;
  }
}

void main();
