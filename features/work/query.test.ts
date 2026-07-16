import assert from "node:assert/strict";
import test from "node:test";

import {
  createWorkHref,
  DEFAULT_WORK_QUERY,
  parseWorkQuery,
} from "@/features/work/query";

test("parseWorkQuery normalizes valid URL state", () => {
  const query = parseWorkQuery({
    query: "  animation   project  ",
    type: "study-session",
    status: "in-progress",
    priority: "high",
    category: "organization",
    dueFrom: "2026-07-14",
    dueTo: "2026-07-31",
    sort: "dueDate",
    order: "asc",
    page: "2",
    pageSize: "10",
  });

  assert.equal(query.query, "animation project");
  assert.equal(query.type, "study-session");
  assert.equal(query.status, "in-progress");
  assert.equal(query.priority, "high");
  assert.equal(query.category, "organization");
  assert.equal(query.page, 2);
  assert.equal(query.pageSize, 10);
});

test("parseWorkQuery applies safe defaults to invalid URL state", () => {
  const query = parseWorkQuery({
    type: "../../unsafe",
    priority: "critical",
    sort: "ownerUserId",
    order: "sideways",
    page: "-4",
    pageSize: "10000",
  });

  assert.deepEqual(query, DEFAULT_WORK_QUERY);
});

test("parseWorkQuery uses the first repeated value", () => {
  const query = parseWorkQuery({
    status: ["blocked", "done"],
    page: ["3", "8"],
  });

  assert.equal(query.status, "blocked");
  assert.equal(query.page, 3);
});

test("parseWorkQuery ignores legacy tag filters", () => {
  const query = parseWorkQuery({ tag: "animation" });

  assert.deepEqual(query, DEFAULT_WORK_QUERY);
});

test("createWorkHref resets pagination when table state changes", () => {
  const href = createWorkHref(
    { ...DEFAULT_WORK_QUERY, page: 5, type: "project" },
    { status: "in-progress" },
  );

  assert.equal(href, "/work?type=project&status=in-progress");
});

test("createWorkHref preserves state for pagination", () => {
  const href = createWorkHref(
    {
      ...DEFAULT_WORK_QUERY,
      query: "exam",
      type: "study-session",
      page: 1,
    },
    { page: 2 },
  );

  assert.equal(href, "/work?query=exam&type=study-session&page=2");
});
