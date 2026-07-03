import { request as httpsRequest } from "node:https";
import type { IncomingHttpHeaders } from "node:http";

import { eq } from "drizzle-orm";

import { APP_NAME } from "@/lib/branding";
import { getDb } from "@/lib/db";
import { canvasApiSyncState, canvasCourses } from "@/lib/db/schema";
import type { NewCanvasCourse } from "@/lib/db/schema";
import {
  buildCanvasCoursesUrl,
  coerceCoursePickerCourses,
  combineCanvasCourseLists,
  extractCanvasNextUrl,
  getCanvasCourseCacheExpiresAt,
  isCanvasCourseCacheFresh,
  readCanvasBoolean,
  readCanvasDate,
  readCanvasRecord,
  readCanvasString,
  toCoursePickerCourse,
  type CanvasCourseEnrollmentState,
  type CanvasRawCourse,
  type CoursePickerCourse,
  type NormalizedCanvasCourse,
} from "@/lib/canvas-course-discovery-utils";

const COURSE_PICKER_SYNC_KEY = "courses:student:active-completed";
const COURSE_PICKER_RESOURCE = "courses";
const COURSE_PICKER_STATES = ["active", "completed"] as const;
const CANVAS_REQUEST_TIMEOUT_MS = 30_000;
const CANVAS_AUTH_FAILURE_STATUSES = new Set([401, 403]);
const CANCELLED_COURSE_REQUEST_ERROR = {
  message: "Canvas course request was cancelled.",
  status: 499,
  code: "canvas_request_cancelled",
  publicMessage: "Course loading was cancelled.",
} as const;
const UNREADABLE_COURSE_RESPONSE_MESSAGE =
  `Canvas sent course data ${APP_NAME} could not read. Try again later.`;

export const CANVAS_COURSE_HEADER_ENV_VARS = {
  accept: "CANVAS_COURSES_ACCEPT",
  connection: "CANVAS_COURSES_CONNECTION",
  userAgent: "CANVAS_COURSES_USER_AGENT",
  cookie: "CANVAS_COURSES_COOKIE",
} as const;

type Database = NonNullable<ReturnType<typeof getDb>>;
type CanvasCourseHeaderName = "Accept" | "Connection" | "User-Agent" | "Cookie";
type OptionalCanvasCourseHeaders = Partial<Record<CanvasCourseHeaderName, string>>;

export type CanvasCourseHeaders = Record<CanvasCourseHeaderName, string>;

type CoursePickerCache = {
  courses: CoursePickerCourse[];
  lastSyncedAt: Date | null;
  cacheExpiresAt: Date | null;
};

type CanvasCourseDiscoveryMetadata = {
  version: 1;
  fetchedAt: string;
  states: CanvasCourseEnrollmentState[];
  courses: CanvasRawCourse[];
  pickerCourses: CoursePickerCourse[];
};

export type CoursePickerLoadResult = {
  courses: CoursePickerCourse[];
  source: "cache" | "canvas" | "stale-cache";
  lastSyncedAt: string | null;
  cacheExpiresAt: string | null;
  warning: string | null;
};

type CanvasCourseDiscoveryErrorDetails = {
  message: string;
  status: number;
  code: string;
  publicMessage?: string;
};

export class CanvasCourseDiscoveryError extends Error {
  readonly status: number;
  readonly code: string;
  readonly publicMessage: string;

  constructor(details: CanvasCourseDiscoveryErrorDetails) {
    super(details.message);
    this.name = "CanvasCourseDiscoveryError";
    this.status = details.status;
    this.code = details.code;
    this.publicMessage = details.publicMessage ?? details.message;
  }
}

export function buildCanvasCourseHeaders(
  env: NodeJS.ProcessEnv = process.env,
): CanvasCourseHeaders {
  const headers = {
    Accept: env[CANVAS_COURSE_HEADER_ENV_VARS.accept]?.trim(),
    Connection: env[CANVAS_COURSE_HEADER_ENV_VARS.connection]?.trim(),
    "User-Agent": env[CANVAS_COURSE_HEADER_ENV_VARS.userAgent]?.trim(),
    Cookie: env[CANVAS_COURSE_HEADER_ENV_VARS.cookie]?.trim(),
  };

  assertCanvasCourseHeaders(headers);

  return headers;
}

function assertCanvasCourseHeaders(
  headers: OptionalCanvasCourseHeaders,
): asserts headers is CanvasCourseHeaders {
  const missing = Object.entries({
    [CANVAS_COURSE_HEADER_ENV_VARS.accept]: headers.Accept,
    [CANVAS_COURSE_HEADER_ENV_VARS.connection]: headers.Connection,
    [CANVAS_COURSE_HEADER_ENV_VARS.userAgent]: headers["User-Agent"],
    [CANVAS_COURSE_HEADER_ENV_VARS.cookie]: headers.Cookie,
  })
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new CanvasCourseDiscoveryError({
      message: `Missing Canvas course environment variable${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}`,
      status: 500,
      code: "missing_canvas_course_env",
      publicMessage:
        "Canvas course sync is not set up yet. Add your Canvas course connection details, then try again.",
    });
  }
}

export async function getAvailableCanvasCoursesForPicker(options?: {
  signal?: AbortSignal;
  now?: Date;
}): Promise<CoursePickerLoadResult> {
  const db = getDb();

  if (!db) {
    throw new CanvasCourseDiscoveryError({
      message:
        "Missing DATABASE_URL. Configure the database before loading Canvas courses.",
      status: 503,
      code: "missing_database_url",
      publicMessage:
        `Course sync is unavailable because ${APP_NAME} is not connected to its database.`,
    });
  }

  const now = options?.now ?? new Date();
  const cached = await readCoursePickerCache(db);

  if (cached && isCanvasCourseCacheFresh(cached.lastSyncedAt, now)) {
    return buildLoadResult(cached, "cache", null);
  }

  try {
    const headers = buildCanvasCourseHeaders();
    const fetched = await fetchCanvasCourseLists(headers, options?.signal);
    const combinedCourses = combineCanvasCourseLists(fetched);
    const pickerCourses = combinedCourses.map(toCoursePickerCourse);

    await upsertCanvasCourseRows(db, combinedCourses, now);
    await writeCoursePickerCache(db, combinedCourses, pickerCourses, now);

    return {
      courses: pickerCourses,
      source: "canvas",
      lastSyncedAt: now.toISOString(),
      cacheExpiresAt: getCanvasCourseCacheExpiresAt(now)?.toISOString() ?? null,
      warning: null,
    };
  } catch (error) {
    if (cached && cached.courses.length) {
      return buildLoadResult(
        cached,
        "stale-cache",
        getPublicErrorMessage(error),
      );
    }

    throw error;
  }
}

async function fetchCanvasCourseLists(
  headers: CanvasCourseHeaders,
  signal?: AbortSignal,
) {
  return Promise.all(
    COURSE_PICKER_STATES.map(async (state) => ({
      state,
      courses: await fetchCanvasCoursesForState(state, headers, signal),
    })),
  );
}

async function fetchCanvasCoursesForState(
  state: CanvasCourseEnrollmentState,
  headers: CanvasCourseHeaders,
  signal?: AbortSignal,
) {
  const courses: CanvasRawCourse[] = [];
  let nextUrl: string | null = buildCanvasCoursesUrl(state);

  while (nextUrl) {
    const page = await requestCanvasCoursePage(nextUrl, headers, signal);

    courses.push(...page.courses);
    nextUrl = page.nextUrl;
  }

  return courses;
}

function requestCanvasCoursePage(
  url: string,
  headers: CanvasCourseHeaders,
  signal?: AbortSignal,
) {
  return new Promise<{ courses: CanvasRawCourse[]; nextUrl: string | null }>(
    (resolve, reject) => {
      if (signal?.aborted) {
        reject(createCancelledCourseRequestError());
        return;
      }

      const request = httpsRequest(
        url,
        {
          method: "GET",
          headers,
          timeout: CANVAS_REQUEST_TIMEOUT_MS,
        },
        (response) => {
          const chunks: Buffer[] = [];

          response.on("data", (chunk: Buffer) => chunks.push(chunk));
          response.on("end", () => {
            const body = Buffer.concat(chunks).toString("utf8");

            if (!response.statusCode || response.statusCode >= 400) {
              reject(createCourseRequestStatusError(response.statusCode));
              return;
            }

            try {
              const data = JSON.parse(body) as unknown;

              if (!Array.isArray(data)) {
                reject(
                  createUnreadableCourseResponseError(
                    "Canvas courses response was not a JSON array.",
                    "invalid_canvas_course_response",
                  ),
                );
                return;
              }

              resolve({
                courses: data.flatMap((item) => {
                  const record = readCanvasRecord(item);

                  return record ? [record] : [];
                }),
                nextUrl: extractCanvasNextUrl(
                  getHeader(response.headers, "link"),
                ),
              });
            } catch {
              reject(
                createUnreadableCourseResponseError(
                  "Canvas courses response could not be parsed as JSON.",
                  "invalid_canvas_course_json",
                ),
              );
            }
          });
        },
      );

      const abort = () => {
        request.destroy(createCancelledCourseRequestError());
      };

      signal?.addEventListener("abort", abort, { once: true });
      request.on("timeout", () => {
        request.destroy(
          new CanvasCourseDiscoveryError({
            message: "Canvas courses request timed out.",
            status: 504,
            code: "canvas_course_request_timeout",
            publicMessage:
              "Canvas is taking longer than usual. Try again in a moment.",
          }),
        );
      });
      request.on("error", (error) => {
        signal?.removeEventListener("abort", abort);
        reject(
          error instanceof CanvasCourseDiscoveryError
            ? error
            : new CanvasCourseDiscoveryError({
                message:
                  "Canvas courses request failed before a response was received.",
                status: 502,
                code: "canvas_course_request_error",
                publicMessage:
                  `${APP_NAME} could not reach Canvas. Try again in a moment.`,
              }),
        );
      });
      request.on("close", () => {
        signal?.removeEventListener("abort", abort);
      });
      request.end();
    },
  );
}

function createCancelledCourseRequestError() {
  return new CanvasCourseDiscoveryError(CANCELLED_COURSE_REQUEST_ERROR);
}

function createCourseRequestStatusError(statusCode: number | undefined) {
  const hasAuthenticationFailed =
    statusCode !== undefined && CANVAS_AUTH_FAILURE_STATUSES.has(statusCode);

  return new CanvasCourseDiscoveryError({
    message: `Canvas courses request failed with status ${statusCode ?? "unknown"}.`,
    status: hasAuthenticationFailed ? 401 : 502,
    code: "canvas_course_request_failed",
    publicMessage: hasAuthenticationFailed
      ? "Your saved Canvas session needs to be refreshed before courses can sync."
      : "Canvas could not load courses right now. Try again later.",
  });
}

function createUnreadableCourseResponseError(message: string, code: string) {
  return new CanvasCourseDiscoveryError({
    message,
    status: 502,
    code,
    publicMessage: UNREADABLE_COURSE_RESPONSE_MESSAGE,
  });
}

async function readCoursePickerCache(
  db: Database,
): Promise<CoursePickerCache | null> {
  const [cache] = await db
    .select()
    .from(canvasApiSyncState)
    .where(eq(canvasApiSyncState.key, COURSE_PICKER_SYNC_KEY))
    .limit(1);

  if (!cache) {
    return null;
  }

  const metadata = readCanvasRecord(cache.metadata);
  const courses = coerceCoursePickerCourses(metadata?.pickerCourses);

  return {
    courses,
    lastSyncedAt: cache.lastSyncedAt,
    cacheExpiresAt: getCanvasCourseCacheExpiresAt(cache.lastSyncedAt),
  };
}

async function writeCoursePickerCache(
  db: Database,
  normalizedCourses: NormalizedCanvasCourse[],
  pickerCourses: CoursePickerCourse[],
  syncedAt: Date,
) {
  const metadata = {
    version: 1,
    fetchedAt: syncedAt.toISOString(),
    states: [...COURSE_PICKER_STATES],
    courses: normalizedCourses.map((course) => course.raw),
    pickerCourses,
  } satisfies CanvasCourseDiscoveryMetadata;

  await db
    .insert(canvasApiSyncState)
    .values({
      key: COURSE_PICKER_SYNC_KEY,
      resource: COURSE_PICKER_RESOURCE,
      lastSyncedAt: syncedAt,
      metadata,
      updatedAt: syncedAt,
    })
    .onConflictDoUpdate({
      target: canvasApiSyncState.key,
      set: {
        resource: COURSE_PICKER_RESOURCE,
        lastSyncedAt: syncedAt,
        metadata,
        updatedAt: syncedAt,
      },
    });
}

async function upsertCanvasCourseRows(
  db: Database,
  courses: NormalizedCanvasCourse[],
  syncedAt: Date,
) {
  const values = courses.map((course) =>
    mapCanvasCourseToInsert(course, syncedAt),
  );

  if (!values.length) {
    return;
  }

  for (const value of values) {
    await db
      .insert(canvasCourses)
      .values(value)
      .onConflictDoUpdate({
        target: canvasCourses.canvasId,
        set: {
          name: value.name,
          courseCode: value.courseCode,
          originalName: value.originalName,
          workflowState: value.workflowState,
          enrollmentState: value.enrollmentState,
          enrollmentTermId: value.enrollmentTermId,
          termName: value.termName,
          accountId: value.accountId,
          rootAccountId: value.rootAccountId,
          startAt: value.startAt,
          endAt: value.endAt,
          isPublic: value.isPublic,
          syllabusBody: value.syllabusBody,
          raw: value.raw,
          syncedAt,
          updatedAt: syncedAt,
        },
      });
  }
}

function mapCanvasCourseToInsert(
  course: NormalizedCanvasCourse,
  syncedAt: Date,
): NewCanvasCourse {
  const rawCourse = course.raw;
  const term = readCanvasRecord(rawCourse.term);

  return {
    canvasId: course.canvasId,
    name: course.name,
    courseCode: course.courseCode,
    originalName: course.originalName,
    workflowState: course.workflowState,
    enrollmentState: course.enrollmentState,
    enrollmentTermId: readCanvasString(
      rawCourse.enrollment_term_id ?? term?.id,
    ),
    termName: readCanvasString(term?.name),
    accountId: readCanvasString(rawCourse.account_id),
    rootAccountId: readCanvasString(rawCourse.root_account_id),
    startAt: readCanvasDate(rawCourse.start_at),
    endAt: readCanvasDate(rawCourse.end_at),
    isPublic: readCanvasBoolean(rawCourse.is_public),
    syllabusBody: readCanvasString(rawCourse.syllabus_body),
    raw: rawCourse,
    syncedAt,
    updatedAt: syncedAt,
  };
}

function buildLoadResult(
  cache: CoursePickerCache,
  source: CoursePickerLoadResult["source"],
  warning: string | null,
): CoursePickerLoadResult {
  return {
    courses: cache.courses,
    source,
    lastSyncedAt: cache.lastSyncedAt?.toISOString() ?? null,
    cacheExpiresAt: cache.cacheExpiresAt?.toISOString() ?? null,
    warning,
  };
}

function getHeader(headers: IncomingHttpHeaders, key: string) {
  const value = headers[key.toLowerCase()];

  return Array.isArray(value) ? value.join(",") : (value ?? null);
}

function getPublicErrorMessage(error: unknown) {
  if (error instanceof CanvasCourseDiscoveryError) {
    return error.publicMessage;
  }

  return "Courses could not be refreshed right now.";
}
