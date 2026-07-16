import assert from "node:assert/strict";
import test from "node:test";

import { getVisibleWorkTaskFieldErrors } from "@/features/work/action-state";

const FIELD_ERRORS = {
  dueDate: ["Choose a deadline date."],
  dueTime: ["Choose a deadline time."],
};

test("edited fields no longer show stale server errors", () => {
  const visibleErrors = getVisibleWorkTaskFieldErrors({
    fieldErrors: FIELD_ERRORS,
    editedFields: new Set(["dueDate"]),
    isPending: false,
  });

  assert.deepEqual(visibleErrors, {
    dueTime: ["Choose a deadline time."],
  });
});

test("previous server errors are hidden while resubmitting", () => {
  const visibleErrors = getVisibleWorkTaskFieldErrors({
    fieldErrors: FIELD_ERRORS,
    editedFields: new Set(),
    isPending: true,
  });

  assert.deepEqual(visibleErrors, {});
});
