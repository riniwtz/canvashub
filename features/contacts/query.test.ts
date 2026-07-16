import assert from "node:assert/strict";
import test from "node:test";

import {
  CONTACT_SEARCH_MAX_LENGTH,
  DEFAULT_CONTACT_QUERY,
  hasActiveContactFilters,
  hasContactQueryConstraints,
  hasCustomizedContactFilters,
  parseContactQuery,
} from "./query";

test("parses supported contact filters and sorting", () => {
  const query = parseContactQuery({
    q: "  student hub  ",
    platform: "github",
    sort: "name",
    order: "asc",
  });

  assert.deepEqual(query, {
    search: "student hub",
    platform: "github",
    sortBy: "name",
    sortDirection: "asc",
  });
  assert.equal(hasActiveContactFilters(query), true);
  assert.equal(hasContactQueryConstraints(query), true);
  assert.equal(hasCustomizedContactFilters(query), true);
});

test("uses safe defaults for unsupported contact query values", () => {
  const query = parseContactQuery({
    platform: "unsupported",
    sort: "unsupported",
    order: "unsupported",
  });

  assert.deepEqual(query, DEFAULT_CONTACT_QUERY);
  assert.equal(hasActiveContactFilters(query), false);
  assert.equal(hasContactQueryConstraints(query), false);
  assert.equal(hasCustomizedContactFilters(query), false);
});

test("treats search separately from filters", () => {
  const query = parseContactQuery({ q: "student" });

  assert.equal(hasActiveContactFilters(query), false);
  assert.equal(hasContactQueryConstraints(query), true);
  assert.equal(hasCustomizedContactFilters(query), false);
});

test("uses the first value when a query parameter is repeated", () => {
  const query = parseContactQuery({
    q: ["first", "second"],
    platform: ["instagram", "github"],
  });

  assert.equal(query.search, "first");
  assert.equal(query.platform, "instagram");
});

test("limits the normalized search term", () => {
  const query = parseContactQuery({
    q: `  ${"a".repeat(CONTACT_SEARCH_MAX_LENGTH + 1)}  `,
  });

  assert.equal(query.search.length, CONTACT_SEARCH_MAX_LENGTH);
});
