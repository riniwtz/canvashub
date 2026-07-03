import assert from "node:assert/strict";
import test from "node:test";

import {
  combineCanvasCourseLists,
  extractCanvasNextUrl,
  isCanvasCourseCacheFresh,
} from "./canvas-course-discovery-utils.ts";

test("combines active and completed courses while filtering restricted rows", () => {
  const courses = combineCanvasCourseLists([
    {
      state: "active",
      courses: [
        {
          id: 2,
          course_code: "CSNETWK",
          name: "Computer Networks",
          access_restricted_by_date: true,
        },
        {
          id: 1,
          course_code: "CSSWENG",
          name: "Software Engineering",
          created_at: "2025-01-10T00:00:00Z",
        },
      ],
    },
    {
      state: "completed",
      courses: [
        {
          id: "1",
          course_code: "CSSWENG-OLD",
          name: "Duplicate Software Engineering",
        },
        {
          id: 3,
          course_code: "STHCIUX",
          name: "Human Computer Interaction",
          created_at: "2026-01-10T00:00:00Z",
        },
      ],
    },
  ]);

  assert.deepEqual(
    courses.map((course) => ({
      canvasId: course.canvasId,
      courseCode: course.courseCode,
      enrollmentState: course.enrollmentState,
    })),
    [
      { canvasId: "3", courseCode: "STHCIUX", enrollmentState: "completed" },
      { canvasId: "1", courseCode: "CSSWENG", enrollmentState: "active" },
    ],
  );
});

test("extracts next pagination URL from Canvas Link headers", () => {
  const nextUrl = extractCanvasNextUrl(
    '<https://dlsu.instructure.com/api/v1/courses?page=1>; rel="current", <https://dlsu.instructure.com/api/v1/courses?page=2>; rel="next"',
  );

  assert.equal(
    nextUrl,
    "https://dlsu.instructure.com/api/v1/courses?page=2",
  );
});

test("treats course cache as fresh for less than 24 hours", () => {
  const now = new Date("2026-06-30T08:00:00.000Z");

  assert.equal(
    isCanvasCourseCacheFresh("2026-06-29T08:00:01.000Z", now),
    true,
  );
  assert.equal(
    isCanvasCourseCacheFresh("2026-06-29T08:00:00.000Z", now),
    false,
  );
});
