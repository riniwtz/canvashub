import assert from "node:assert/strict";
import test from "node:test";

import { EMPTY_CELL_PLACEHOLDER, formatDateTime } from "./formatters";

test("formats timestamps with deterministic punctuation in Manila time", () => {
  assert.equal(
    formatDateTime("2026-07-14T04:28:00.000Z"),
    "Jul 14, 2026, 12:28 PM",
  );
});

test("uses the empty-cell placeholder for invalid timestamps", () => {
  assert.equal(formatDateTime("not-a-date"), EMPTY_CELL_PLACEHOLDER);
});
