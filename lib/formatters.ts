export const EMPTY_CELL_PLACEHOLDER = "--";

const MANILA_TIME_ZONE = "Asia/Manila";
const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeZone: "UTC",
});
const manilaDateFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeZone: MANILA_TIME_ZONE,
});
const manilaTimeFormatter = new Intl.DateTimeFormat("en-PH", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: MANILA_TIME_ZONE,
});

export function formatOptionalNumber(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return EMPTY_CELL_PLACEHOLDER;
  }

  return Number.isInteger(value) ? `${value}` : value.toFixed(2);
}

export function formatOptionalText(value: string | null | undefined) {
  const normalizedValue = value?.trim();

  return normalizedValue || EMPTY_CELL_PLACEHOLDER;
}

export function formatDateOnly(value: string | null | undefined) {
  if (!value) {
    return EMPTY_CELL_PLACEHOLDER;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime())
    ? EMPTY_CELL_PLACEHOLDER
    : dateFormatter.format(date);
}

export function formatDateTime(
  value: Date | string | null | undefined,
) {
  if (!value) {
    return EMPTY_CELL_PLACEHOLDER;
  }

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime())
    ? EMPTY_CELL_PLACEHOLDER
    : `${manilaDateFormatter.format(date)}, ${manilaTimeFormatter.format(date)}`;
}
