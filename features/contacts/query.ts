import {
  isSocialPlatform,
  type SocialPlatform,
} from "@/features/contacts/constants";

export const CONTACT_SEARCH_MAX_LENGTH = 120;

export const CONTACT_SORT_FIELDS = [
  "name",
  "nickname",
  "age",
  "birthday",
  "updatedAt",
  "createdAt",
] as const;

export const CONTACT_SORT_DIRECTIONS = ["asc", "desc"] as const;

export type ContactSortField = (typeof CONTACT_SORT_FIELDS)[number];
export type ContactSortDirection =
  (typeof CONTACT_SORT_DIRECTIONS)[number];

export type ContactQuery = {
  search: string;
  platform: SocialPlatform | "all";
  sortBy: ContactSortField;
  sortDirection: ContactSortDirection;
};

export type ContactSearchParams = Record<
  string,
  string | string[] | undefined
>;

export const DEFAULT_CONTACT_QUERY: ContactQuery = {
  search: "",
  platform: "all",
  sortBy: "updatedAt",
  sortDirection: "desc",
};

export function parseContactQuery(
  searchParams: ContactSearchParams,
): ContactQuery {
  const platform = getFirstSearchParam(searchParams.platform);
  const sortBy = getFirstSearchParam(searchParams.sort);
  const sortDirection = getFirstSearchParam(searchParams.order);

  return {
    search: normalizeSearchTerm(getFirstSearchParam(searchParams.q)),
    platform: isSocialPlatform(platform) ? platform : "all",
    sortBy: isContactSortField(sortBy)
      ? sortBy
      : DEFAULT_CONTACT_QUERY.sortBy,
    sortDirection: isContactSortDirection(sortDirection)
      ? sortDirection
      : DEFAULT_CONTACT_QUERY.sortDirection,
  };
}

export function hasActiveContactFilters(query: ContactQuery): boolean {
  return query.platform !== "all";
}

export function hasContactQueryConstraints(query: ContactQuery): boolean {
  return Boolean(query.search) || hasActiveContactFilters(query);
}

export function hasCustomizedContactFilters(query: ContactQuery): boolean {
  return (
    hasActiveContactFilters(query) ||
    query.sortBy !== DEFAULT_CONTACT_QUERY.sortBy ||
    query.sortDirection !== DEFAULT_CONTACT_QUERY.sortDirection
  );
}

function getFirstSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeSearchTerm(value: string | undefined): string {
  return value?.trim().slice(0, CONTACT_SEARCH_MAX_LENGTH) ?? "";
}

function isContactSortField(value: unknown): value is ContactSortField {
  return CONTACT_SORT_FIELDS.some((field) => field === value);
}

function isContactSortDirection(
  value: unknown,
): value is ContactSortDirection {
  return CONTACT_SORT_DIRECTIONS.some((direction) => direction === value);
}
