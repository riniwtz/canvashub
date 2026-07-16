const MANILA_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

export function calculateAge(
  birthday: string,
  referenceDate = getCurrentManilaDate(),
) {
  const birthDate = parseCalendarDate(birthday);
  const currentDate = parseCalendarDate(referenceDate);

  if (!birthDate || !currentDate) {
    return null;
  }

  const hasHadBirthday =
    currentDate.month > birthDate.month ||
    (currentDate.month === birthDate.month && currentDate.day >= birthDate.day);

  return currentDate.year - birthDate.year - Number(!hasHadBirthday);
}

export function getCurrentManilaDate() {
  const dateParts = new Map(
    MANILA_DATE_FORMATTER.formatToParts(new Date()).map((part) => [
      part.type,
      part.value,
    ]),
  );

  return `${dateParts.get("year")}-${dateParts.get("month")}-${dateParts.get("day")}`;
}

function parseCalendarDate(value: string): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;

  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
  };
}
