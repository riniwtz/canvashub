import { DEFAULT_WORK_TIMEZONE } from "@/features/work/constants";

const DEADLINE_MINUTE_INCREMENT = 30;
const MILLISECONDS_PER_MINUTE = 60_000;
const DEADLINE_INCREMENT_MS =
  DEADLINE_MINUTE_INCREMENT * MILLISECONDS_PER_MINUTE;

const deadlineDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: DEFAULT_WORK_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export type DeadlineMode = "none" | "date" | "datetime";

type DeadlineFormFields = {
  startDate: string;
  deadlineMode: DeadlineMode;
  dueDate: string;
  dueTime: string;
};

type DeadlineDefaultsInput<TValues extends DeadlineFormFields> = {
  values: TValues;
  deadlineMode: DeadlineMode;
  now?: Date;
};

export function withDeadlineModeDefaults<
  TValues extends DeadlineFormFields,
>({
  values,
  deadlineMode,
  now = new Date(),
}: DeadlineDefaultsInput<TValues>): TValues {
  if (deadlineMode === "none") {
    return { ...values, deadlineMode };
  }

  const defaultDeadline = getNextDeadlineSlot(now);
  const dueDate =
    values.dueDate || latestDate(values.startDate, defaultDeadline.date);
  const dueTime =
    deadlineMode === "datetime"
      ? values.dueTime || defaultDeadline.time
      : values.dueTime;

  return {
    ...values,
    deadlineMode,
    dueDate,
    dueTime,
  };
}

function getNextDeadlineSlot(now: Date) {
  const roundedTimestamp =
    Math.ceil(now.getTime() / DEADLINE_INCREMENT_MS) *
    DEADLINE_INCREMENT_MS;
  const parts = new Map(
    deadlineDateTimeFormatter
      .formatToParts(new Date(roundedTimestamp))
      .map((part) => [part.type, part.value]),
  );

  return {
    date: `${parts.get("year")}-${parts.get("month")}-${parts.get("day")}`,
    time: `${parts.get("hour")}:${parts.get("minute")}`,
  };
}

function latestDate(firstDate: string, secondDate: string) {
  return firstDate > secondDate ? firstDate : secondDate;
}
