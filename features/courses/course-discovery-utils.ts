const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1000;

export const CANVAS_COURSE_CACHE_TTL_MS =
  HOURS_PER_DAY *
  MINUTES_PER_HOUR *
  SECONDS_PER_MINUTE *
  MILLISECONDS_PER_SECOND;
export const CANVAS_API_PAGE_SIZE = "100";

export type CanvasCourseEnrollmentState = "active" | "completed";

export type CanvasRawCourse = Record<string, unknown>;

export type NormalizedCanvasCourse = {
  canvasId: string;
  enrollmentState: CanvasCourseEnrollmentState;
  courseCode: string | null;
  name: string | null;
  originalName: string | null;
  workflowState: string | null;
  termName: string | null;
  createdAt: Date | null;
  label: string;
  secondaryLabel: string | null;
  raw: CanvasRawCourse;
};

export type CoursePickerCourse = {
  id: string;
  canvasId: string;
  courseCode: string | null;
  name: string | null;
  label: string;
  secondaryLabel: string | null;
  enrollmentState: CanvasCourseEnrollmentState;
  workflowState: string | null;
  termName: string | null;
  createdAt: string | null;
};

export type CanvasCourseListForState = {
  state: CanvasCourseEnrollmentState;
  courses: CanvasRawCourse[];
};

export function buildCanvasCoursesUrl(
  state: CanvasCourseEnrollmentState,
  apiRoot = "https://dlsu.instructure.com/api/v1",
) {
  const url = new URL(`${apiRoot}/courses`);

  url.searchParams.set("enrollment_type", "student");
  url.searchParams.set("enrollment_state", state);
  url.searchParams.set("per_page", CANVAS_API_PAGE_SIZE);

  return url.toString();
}

export function combineCanvasCourseLists(
  courseLists: CanvasCourseListForState[],
) {
  const coursesById = new Map<string, NormalizedCanvasCourse>();

  for (const courseList of courseLists) {
    for (const rawCourse of courseList.courses) {
      if (rawCourse.access_restricted_by_date === true) {
        continue;
      }

      const course = normalizeCanvasCourse(rawCourse, courseList.state);

      if (!course || coursesById.has(course.canvasId)) {
        continue;
      }

      coursesById.set(course.canvasId, course);
    }
  }

  return Array.from(coursesById.values()).sort(compareNormalizedCourses);
}

export function normalizeCanvasCourse(
  rawCourse: CanvasRawCourse,
  enrollmentState: CanvasCourseEnrollmentState,
): NormalizedCanvasCourse | null {
  const canvasId = readCanvasString(rawCourse.id);

  if (!canvasId) {
    return null;
  }

  const term = readCanvasRecord(rawCourse.term);
  const courseCode = readCanvasString(rawCourse.course_code);
  const name = readCanvasString(rawCourse.name);
  const originalName = readCanvasString(rawCourse.original_name);
  const workflowState = readCanvasString(rawCourse.workflow_state);
  const termName = readCanvasString(term?.name);
  const createdAt = readCanvasDate(rawCourse.created_at);
  const label = firstText(courseCode, name, originalName, `Course ${canvasId}`);
  const secondaryLabel = name !== label ? name : null;

  return {
    canvasId,
    enrollmentState,
    courseCode,
    name,
    originalName,
    workflowState,
    termName,
    createdAt,
    label,
    secondaryLabel,
    raw: rawCourse,
  };
}

export function toCoursePickerCourse(
  course: NormalizedCanvasCourse,
): CoursePickerCourse {
  return {
    id: course.canvasId,
    canvasId: course.canvasId,
    courseCode: course.courseCode,
    name: course.name,
    label: course.label,
    secondaryLabel: course.secondaryLabel,
    enrollmentState: course.enrollmentState,
    workflowState: course.workflowState,
    termName: course.termName,
    createdAt: course.createdAt?.toISOString() ?? null,
  };
}

export function coerceCoursePickerCourses(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    const record = readCanvasRecord(item);

    if (!record) {
      return [];
    }

    const canvasId = readCanvasString(record.canvasId ?? record.id);
    const enrollmentState = readEnrollmentState(record.enrollmentState);

    if (!canvasId || !enrollmentState) {
      return [];
    }

    const courseCode = readCanvasString(record.courseCode);
    const name = readCanvasString(record.name);
    const termName = readCanvasString(record.termName);
    const label = firstText(
      readCanvasString(record.label),
      courseCode,
      name,
      `Course ${canvasId}`,
    );
    const secondaryLabel = name !== label ? name : null;

    return [
      {
        id: canvasId,
        canvasId,
        courseCode,
        name,
        label,
        secondaryLabel,
        enrollmentState,
        workflowState: readCanvasString(record.workflowState),
        termName,
        createdAt: readCanvasString(record.createdAt),
      } satisfies CoursePickerCourse,
    ];
  }).sort(compareCoursePickerCourses);
}

export function isCanvasCourseCacheFresh(
  lastSyncedAt: Date | string | null | undefined,
  now = new Date(),
) {
  const syncedAt = coerceDate(lastSyncedAt);

  if (!syncedAt) {
    return false;
  }

  return now.getTime() - syncedAt.getTime() < CANVAS_COURSE_CACHE_TTL_MS;
}

export function getCanvasCourseCacheExpiresAt(
  lastSyncedAt: Date | string | null | undefined,
) {
  const syncedAt = coerceDate(lastSyncedAt);

  if (!syncedAt) {
    return null;
  }

  return new Date(syncedAt.getTime() + CANVAS_COURSE_CACHE_TTL_MS);
}

export function extractCanvasNextUrl(linkHeader: string | null | undefined) {
  if (!linkHeader) {
    return null;
  }

  for (const part of linkHeader.split(",")) {
    const [rawUrl, ...params] = part.split(";");
    const isNext = params.some((param) => {
      const normalized = param.trim().toLowerCase();

      return normalized === 'rel="next"' || normalized === "rel=next";
    });
    const match = rawUrl.trim().match(/^<(.+)>$/);

    if (isNext && match?.[1]) {
      return match[1];
    }
  }

  return null;
}

export function readCanvasString(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();

    return trimmed || null;
  }

  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }

  return null;
}

export function readCanvasBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

export function readCanvasRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

export function readCanvasDate(value: unknown) {
  const text = readCanvasString(value);

  if (!text) {
    return null;
  }

  const date = new Date(text);

  return Number.isNaN(date.getTime()) ? null : date;
}

function compareNormalizedCourses(
  courseA: NormalizedCanvasCourse,
  courseB: NormalizedCanvasCourse,
) {
  return (
    compareDatesDesc(courseA.createdAt, courseB.createdAt) ||
    courseA.label.localeCompare(courseB.label) ||
    courseA.canvasId.localeCompare(courseB.canvasId)
  );
}

function compareCoursePickerCourses(
  courseA: CoursePickerCourse,
  courseB: CoursePickerCourse,
) {
  return (
    compareDatesDesc(courseA.createdAt, courseB.createdAt) ||
    courseA.label.localeCompare(courseB.label) ||
    courseA.canvasId.localeCompare(courseB.canvasId)
  );
}

function compareDatesDesc(
  valueA: Date | string | null | undefined,
  valueB: Date | string | null | undefined,
) {
  const dateA = coerceDate(valueA);
  const dateB = coerceDate(valueB);

  if (!dateA && !dateB) {
    return 0;
  }

  if (!dateA) {
    return 1;
  }

  if (!dateB) {
    return -1;
  }

  return dateB.getTime() - dateA.getTime();
}

function coerceDate(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function firstText(...values: Array<string | null | undefined>) {
  return values.find((value): value is string => Boolean(value)) ?? "";
}

function readEnrollmentState(value: unknown): CanvasCourseEnrollmentState | null {
  return value === "active" || value === "completed" ? value : null;
}
