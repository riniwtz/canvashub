import assert from "node:assert/strict";
import test from "node:test";

import {
  NEW_TASK_TYPE_VALUE,
  TASK_DESCRIPTION_MAX_LENGTH,
} from "@/features/work/constants";
import {
  taskStatusUpdateSchema,
  validateTaskFormData,
} from "@/features/work/validation";

const STATUS_ID = "00000000-0000-4000-8000-000000000010";
const TYPE_ID = "00000000-0000-4000-8000-000000000020";
const COURSE_ID = "00000000-0000-4000-8000-000000000030";
const ORGANIZATION_ID = "00000000-0000-4000-8000-000000000040";
const REQUEST_KEY = "00000000-0000-4000-8000-000000000050";

test("validateTaskFormData accepts a date-only academic task", () => {
  const result = validateTaskFormData(
    createTaskFormData({
      workCategory: "academic",
      courseId: COURSE_ID,
      deadlineMode: "date",
      dueDate: "2026-07-18",
    }),
  );

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.dueTime, undefined);
  }
});

test("validateTaskFormData requires an organization for organization work", () => {
  const result = validateTaskFormData(
    createTaskFormData({ workCategory: "organization" }),
  );

  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.error.issues.some((issue) => issue.path[0] === "organizationId"));
  }
});

test("validateTaskFormData accepts organization work with an organization", () => {
  const result = validateTaskFormData(
    createTaskFormData({
      workCategory: "organization",
      organizationId: ORGANIZATION_ID,
    }),
  );

  assert.equal(result.success, true);
});

test("validateTaskFormData rejects a course on non-academic work", () => {
  const result = validateTaskFormData(
    createTaskFormData({ workCategory: "personal", courseId: COURSE_ID }),
  );

  assert.equal(result.success, false);
});

test("validateTaskFormData rejects an organization on non-organization work", () => {
  const result = validateTaskFormData(
    createTaskFormData({ organizationId: ORGANIZATION_ID }),
  );

  assert.equal(result.success, false);
});

test("validateTaskFormData requires time for date-and-time deadlines", () => {
  const result = validateTaskFormData(
    createTaskFormData({ deadlineMode: "datetime", dueDate: "2026-07-18" }),
  );

  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.error.issues.some((issue) => issue.path[0] === "dueTime"));
  }
});

test("validateTaskFormData keeps due-date validation separate from due time", () => {
  const result = validateTaskFormData(
    createTaskFormData({
      deadlineMode: "datetime",
      dueDate: "2026-07-18",
      dueTime: "25:00",
    }),
  );
  const invalidFields = result.success
    ? []
    : result.error.issues.map((issue) => issue.path[0]);

  assert.deepEqual(invalidFields, ["dueTime"]);
});

test("validateTaskFormData validates an inline custom task type", () => {
  const result = validateTaskFormData(
    createTaskFormData({
      taskTypeId: NEW_TASK_TYPE_VALUE,
      newTypeName: "Design Critique",
      newTypeColor: "#7c3aed",
      newTypeIcon: "palette",
    }),
  );

  assert.equal(result.success, true);
});

test("validateTaskFormData rejects deadlines before the start date", () => {
  const result = validateTaskFormData(
    createTaskFormData({
      startDate: "2026-07-20",
      deadlineMode: "date",
      dueDate: "2026-07-18",
    }),
  );

  assert.equal(result.success, false);
});

test("validateTaskFormData rejects overlong task descriptions", () => {
  const result = validateTaskFormData(
    createTaskFormData({
      description: "a".repeat(TASK_DESCRIPTION_MAX_LENGTH + 1),
    }),
  );

  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(
      result.error.issues.some((issue) => issue.path[0] === "description"),
    );
  }
});

test("taskStatusUpdateSchema accepts a valid optimistic status update", () => {
  const result = taskStatusUpdateSchema.safeParse({
    taskId: TYPE_ID,
    statusId: STATUS_ID,
    version: 3,
  });

  assert.equal(result.success, true);
});

test("taskStatusUpdateSchema rejects invalid task versions", () => {
  const result = taskStatusUpdateSchema.safeParse({
    taskId: TYPE_ID,
    statusId: STATUS_ID,
    version: -1,
  });

  assert.equal(result.success, false);
});

function createTaskFormData(
  overrides: Record<string, string> = {},
): FormData {
  const values = {
    title: "Plan the next milestone",
    description: "",
    notes: "",
    statusId: STATUS_ID,
    taskTypeId: TYPE_ID,
    priority: "medium",
    workCategory: "general",
    courseId: "",
    organizationId: "",
    parentTaskId: "",
    startDate: "",
    deadlineMode: "none",
    dueDate: "",
    dueTime: "",
    timezone: "Asia/Manila",
    newTypeName: "",
    newTypeDescription: "",
    newTypeColor: "#737373",
    newTypeIcon: "briefcase",
    requestKey: REQUEST_KEY,
    ...overrides,
  };
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }

  return formData;
}
