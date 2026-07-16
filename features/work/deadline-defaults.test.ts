import assert from "node:assert/strict";
import test from "node:test";

import { withDeadlineModeDefaults } from "@/features/work/deadline-defaults";

const NOW = new Date("2026-07-14T05:56:10.000Z");

test("date deadlines default to the current Manila date", () => {
  const values = withDeadlineModeDefaults({
    values: createDeadlineFields(),
    deadlineMode: "date",
    now: NOW,
  });

  assert.deepEqual(values, {
    startDate: "",
    deadlineMode: "date",
    dueDate: "2026-07-14",
    dueTime: "",
  });
});

test("date-time deadlines default to the next half hour", () => {
  const values = withDeadlineModeDefaults({
    values: createDeadlineFields(),
    deadlineMode: "datetime",
    now: NOW,
  });

  assert.deepEqual(values, {
    startDate: "",
    deadlineMode: "datetime",
    dueDate: "2026-07-14",
    dueTime: "14:00",
  });
});

test("deadline defaults roll into the next Manila date at midnight", () => {
  const values = withDeadlineModeDefaults({
    values: createDeadlineFields(),
    deadlineMode: "datetime",
    now: new Date("2026-07-14T15:50:00.000Z"),
  });

  assert.deepEqual(values, {
    startDate: "",
    deadlineMode: "datetime",
    dueDate: "2026-07-15",
    dueTime: "00:00",
  });
});

test("deadline defaults respect a later start date", () => {
  const values = withDeadlineModeDefaults({
    values: createDeadlineFields({ startDate: "2026-07-20" }),
    deadlineMode: "date",
    now: NOW,
  });

  assert.equal(values.dueDate, "2026-07-20");
});

test("deadline defaults preserve existing date and time values", () => {
  const values = withDeadlineModeDefaults({
    values: createDeadlineFields({
      dueDate: "2026-08-01",
      dueTime: "09:15",
    }),
    deadlineMode: "datetime",
    now: NOW,
  });

  assert.deepEqual(values, {
    startDate: "",
    deadlineMode: "datetime",
    dueDate: "2026-08-01",
    dueTime: "09:15",
  });
});

function createDeadlineFields(
  overrides: Partial<{
    startDate: string;
    dueDate: string;
    dueTime: string;
  }> = {},
) {
  return {
    startDate: "",
    deadlineMode: "none" as const,
    dueDate: "",
    dueTime: "",
    ...overrides,
  };
}
