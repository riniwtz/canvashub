export function formatOptionalNumber(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "-";
  }

  return Number.isInteger(value) ? `${value}` : value.toFixed(2);
}
