import "server-only";

import {
  buildCanvasCourseHeaders,
  CanvasCourseDiscoveryError,
  type CanvasCourseHeaders,
} from "@/features/courses/server/course-discovery";
import { APP_NAME } from "@/lib/branding";
import {
  buildCanvasCoursesUrl,
  CANVAS_API_PAGE_SIZE,
  extractCanvasNextUrl,
  type CanvasCourseEnrollmentState,
} from "@/features/courses/course-discovery-utils";

const CANVAS_API_ROOT = "https://dlsu.instructure.com/api/v1";
const TARGET_COURSE_TOKENS = [
  "sthciux",
  "csmodel",
  "cssweng",
  "lcfaith",
  "csnetwk",
] as const;
const COURSE_ENROLLMENT_STATES = [
  "active",
  "completed",
] as const satisfies readonly CanvasCourseEnrollmentState[];

type CanvasCourse = {
  id: string | number;
  name?: string;
  course_code?: string;
};

type CanvasAssignment = {
  id: string | number;
  name: string;
  due_at?: string | null;
  unlock_at?: string | null;
  lock_at?: string | null;
  points_possible?: number | null;
  html_url?: string;
  submission?: unknown;
};

export async function GET() {
  try {
    const headers = buildCanvasCourseHeaders();
    const matchedCourses = await loadTargetCourses(headers);
    const coursesWithAssignments = await Promise.all(
      matchedCourses.map((course) => loadCourseAssignments(course, headers)),
    );

    return Response.json({
      courses_found: matchedCourses.length,
      courses: coursesWithAssignments,
      assignments: coursesWithAssignments.flatMap(
        (course) => course.assignments,
      ),
    });
  } catch (error) {
    const response = getAssignmentErrorResponse(error);

    return Response.json(response.body, { status: response.status });
  }
}

async function loadTargetCourses(headers: CanvasCourseHeaders) {
  const courseLists = await Promise.all(
    COURSE_ENROLLMENT_STATES.map((state) =>
      fetchCanvasPages<CanvasCourse>(buildCanvasCoursesUrl(state), headers),
    ),
  );

  return courseLists.flat().filter(matchesTargetCourse);
}

async function loadCourseAssignments(
  course: CanvasCourse,
  headers: CanvasCourseHeaders,
) {
  const assignments = await fetchCanvasPages<CanvasAssignment>(
    buildCanvasAssignmentsUrl(course.id),
    headers,
  );

  return {
    course_id: course.id,
    course_name: course.name,
    course_code: course.course_code,
    assignments: assignments.map((assignment) =>
      toAssignmentResponse(course, assignment),
    ),
  };
}

async function fetchCanvasPages<TItem>(
  initialUrl: string,
  headers: CanvasCourseHeaders,
) {
  const results: TItem[] = [];
  let nextUrl: string | null = initialUrl;

  while (nextUrl) {
    const response = await fetch(nextUrl, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      throw createCanvasRequestError(response);
    }

    results.push(...(await readCanvasArray<TItem>(response)));
    nextUrl = extractCanvasNextUrl(response.headers.get("Link"));
  }

  return results;
}

async function readCanvasArray<TItem>(response: Response) {
  const data = (await response.json()) as unknown;

  if (!Array.isArray(data)) {
    throw new CanvasCourseDiscoveryError({
      message: "Canvas assignments response was not a JSON array.",
      status: 502,
      code: "invalid_canvas_assignment_response",
      publicMessage:
        `Canvas sent assignment data ${APP_NAME} could not read. Try again later.`,
    });
  }

  return data as TItem[];
}

function createCanvasRequestError(response: Response) {
  const hasAuthenticationFailed =
    response.status === 401 || response.status === 403;

  return new CanvasCourseDiscoveryError({
    message: `Canvas assignments request failed with status ${response.status}.`,
    status: hasAuthenticationFailed ? 401 : 502,
    code: "canvas_assignment_request_failed",
    publicMessage: hasAuthenticationFailed
      ? "Your saved Canvas session needs to be refreshed before assignments can sync."
      : "Canvas could not load assignments right now. Try again later.",
  });
}

function buildCanvasAssignmentsUrl(courseId: CanvasCourse["id"]) {
  const url = new URL(
    `${CANVAS_API_ROOT}/courses/${encodeURIComponent(String(courseId))}/assignments`,
  );

  url.searchParams.append("include[]", "submission");
  url.searchParams.set("order_by", "due_at");
  url.searchParams.set("per_page", CANVAS_API_PAGE_SIZE);

  return url.toString();
}

function matchesTargetCourse(course: CanvasCourse) {
  const searchable = normalizeCourseSearchText(course);

  return TARGET_COURSE_TOKENS.some((target) => searchable.includes(target));
}

function normalizeCourseSearchText(course: CanvasCourse) {
  return `${course.course_code ?? ""} ${course.name ?? ""}`
    .toLowerCase()
    .replace(/\s+/g, "");
}

function toAssignmentResponse(
  course: CanvasCourse,
  assignment: CanvasAssignment,
) {
  return {
    id: assignment.id,
    course_id: course.id,
    course_name: course.name,
    course_code: course.course_code,
    name: assignment.name,
    due_at: assignment.due_at,
    unlock_at: assignment.unlock_at,
    lock_at: assignment.lock_at,
    points_possible: assignment.points_possible,
    html_url: assignment.html_url,
    submission: assignment.submission,
  };
}

function getAssignmentErrorResponse(error: unknown) {
  if (error instanceof CanvasCourseDiscoveryError) {
    return {
      status: error.status,
      body: {
        error: error.publicMessage,
        code: error.code,
      },
    };
  }

  return {
    status: 500,
    body: {
      error: "Assignments could not be loaded right now.",
      code: "canvas_assignment_error",
    },
  };
}
