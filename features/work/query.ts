import { z } from "zod";

import {
  TASK_PRIORITY_VALUES,
  TASK_WORK_CATEGORY_VALUES,
  WORK_SEARCH_MAX_LENGTH,
} from "@/features/work/constants";

export const WORK_SORT_FIELDS = [
  "title",
  "dueDate",
  "status",
  "priority",
  "type",
  "createdAt",
  "updatedAt",
] as const;

export const WORK_SORT_ORDERS = ["asc", "desc"] as const;
export const WORK_PAGE_SIZES = [10, 20, 50] as const;
export const WORK_BOOLEAN_FILTERS = ["all", "yes", "no"] as const;
export const WORK_COMPLETION_FILTERS = [
  "all",
  "complete",
  "incomplete",
] as const;
export const WORK_VISIBILITY_FILTERS = ["active", "archived", "all"] as const;

export type WorkSearchParams = Record<
  string,
  string | string[] | undefined
>;

const dynamicSlugSchema = z
  .string()
  .trim()
  .max(96)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .catch("all");

const optionalUuidSchema = z
  .union([z.literal("all"), z.uuid()])
  .catch("all");

const optionalDateSchema = z.iso.date().optional().catch(undefined);

export const workQuerySchema = z
  .object({
    query: z
      .string()
      .transform(normalizeSearchQuery)
      .pipe(z.string().max(WORK_SEARCH_MAX_LENGTH))
      .catch(""),
    type: dynamicSlugSchema,
    status: dynamicSlugSchema,
    priority: z.enum(["all", ...TASK_PRIORITY_VALUES]).catch("all"),
    category: z.enum(["all", ...TASK_WORK_CATEGORY_VALUES]).catch("all"),
    course: optionalUuidSchema,
    organization: optionalUuidSchema,
    dueFrom: optionalDateSchema,
    dueTo: optionalDateSchema,
    hasDeadline: z.enum(WORK_BOOLEAN_FILTERS).catch("all"),
    hasSubtasks: z.enum(WORK_BOOLEAN_FILTERS).catch("all"),
    completion: z.enum(WORK_COMPLETION_FILTERS).catch("all"),
    visibility: z.enum(WORK_VISIBILITY_FILTERS).catch("active"),
    sort: z.enum(WORK_SORT_FIELDS).catch("updatedAt"),
    order: z.enum(WORK_SORT_ORDERS).catch("desc"),
    page: z.coerce.number().int().min(1).catch(1),
    pageSize: z.coerce
      .number()
      .refine(isWorkPageSize)
      .catch(20),
  });

export type WorkQuery = z.output<typeof workQuerySchema>;
export type WorkSortField = WorkQuery["sort"];

export const DEFAULT_WORK_QUERY: WorkQuery = workQuerySchema.parse({
  query: "",
  type: "all",
  status: "all",
  priority: "all",
  category: "all",
  course: "all",
  organization: "all",
  hasDeadline: "all",
  hasSubtasks: "all",
  completion: "all",
  visibility: "active",
  sort: "updatedAt",
  order: "desc",
  page: 1,
  pageSize: 20,
});

const RESET_PAGE_FIELDS = new Set<keyof WorkQuery>([
  "query",
  "type",
  "status",
  "priority",
  "category",
  "course",
  "organization",
  "dueFrom",
  "dueTo",
  "hasDeadline",
  "hasSubtasks",
  "completion",
  "visibility",
  "sort",
  "order",
  "pageSize",
]);

export function parseWorkQuery(searchParams: WorkSearchParams): WorkQuery {
  const values = Object.fromEntries(
    Object.entries(searchParams).map(([key, value]) => [key, firstValue(value)]),
  );

  return workQuerySchema.parse(values);
}

export function createWorkHref(
  currentQuery: WorkQuery,
  updates: Partial<Record<keyof WorkQuery, WorkQuery[keyof WorkQuery] | null>>,
): string {
  const shouldResetPage = Object.keys(updates).some((key) =>
    RESET_PAGE_FIELDS.has(key as keyof WorkQuery),
  );
  const nextQuery = {
    ...currentQuery,
    ...updates,
    page: shouldResetPage ? 1 : (updates.page ?? currentQuery.page),
  } as WorkQuery;
  const params = serializeWorkQuery(nextQuery);
  const queryString = params.toString();

  return queryString ? `/work?${queryString}` : "/work";
}

export function hasActiveWorkFilters(query: WorkQuery): boolean {
  return (
    query.status !== "all" ||
    query.priority !== "all" ||
    query.category !== "all" ||
    query.course !== "all" ||
    query.organization !== "all" ||
    Boolean(query.dueFrom) ||
    Boolean(query.dueTo) ||
    query.hasDeadline !== "all" ||
    query.hasSubtasks !== "all" ||
    query.completion !== "all" ||
    query.visibility !== "active"
  );
}

export function countActiveWorkFilters(query: WorkQuery): number {
  const filterValues = [
    query.status !== "all",
    query.priority !== "all",
    query.category !== "all",
    query.course !== "all",
    query.organization !== "all",
    Boolean(query.dueFrom || query.dueTo),
    query.hasDeadline !== "all",
    query.hasSubtasks !== "all",
    query.completion !== "all",
    query.visibility !== "active",
  ];

  return filterValues.filter(Boolean).length;
}

export function serializeWorkQuery(query: WorkQuery): URLSearchParams {
  const params = new URLSearchParams();
  const setCustomizedValue = (
    key: string,
    value: string | number | undefined,
    defaultValue: string | number | undefined,
  ) => {
    if (value === undefined || value === defaultValue) {
      return;
    }

    params.set(key, String(value));
  };

  setCustomizedValue("query", query.query, "");
  setCustomizedValue("type", query.type, "all");
  setCustomizedValue("status", query.status, "all");
  setCustomizedValue("priority", query.priority, "all");
  setCustomizedValue("category", query.category, "all");
  setCustomizedValue("course", query.course, "all");
  setCustomizedValue("organization", query.organization, "all");
  setCustomizedValue("dueFrom", query.dueFrom, undefined);
  setCustomizedValue("dueTo", query.dueTo, undefined);
  setCustomizedValue("hasDeadline", query.hasDeadline, "all");
  setCustomizedValue("hasSubtasks", query.hasSubtasks, "all");
  setCustomizedValue("completion", query.completion, "all");
  setCustomizedValue("visibility", query.visibility, "active");
  setCustomizedValue("sort", query.sort, "updatedAt");
  setCustomizedValue("order", query.order, "desc");
  setCustomizedValue("page", query.page, 1);
  setCustomizedValue("pageSize", query.pageSize, 20);

  return params;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeSearchQuery(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, WORK_SEARCH_MAX_LENGTH);
}

function isWorkPageSize(value: number): value is (typeof WORK_PAGE_SIZES)[number] {
  return WORK_PAGE_SIZES.some((pageSize) => pageSize === value);
}
