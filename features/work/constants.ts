import type { TaskPriority, TaskWorkCategory } from "@/lib/db/schema";

export const LOCAL_WORK_USER_ID = "00000000-0000-4000-8000-000000000001";
export const DEFAULT_WORK_TIMEZONE = "Asia/Manila";
export const NEW_TASK_TYPE_VALUE = "create-new-type";

export const TASK_TITLE_MAX_LENGTH = 160;
export const TASK_DESCRIPTION_MAX_LENGTH = 1_000;
export const TASK_NOTES_MAX_LENGTH = 5_000;
export const TASK_TYPE_NAME_MAX_LENGTH = 80;
export const TASK_TYPE_DESCRIPTION_MAX_LENGTH = 240;
export const WORK_SEARCH_MAX_LENGTH = 120;
export const WORK_SEARCH_DEBOUNCE_MS = 400;

export const TASK_PRIORITY_VALUES = [
  "low",
  "medium",
  "high",
  "urgent",
] as const satisfies readonly TaskPriority[];

export const TASK_PRIORITY_COLORS = {
  low: "#737373",
  medium: "#2563eb",
  high: "#d97706",
  urgent: "#dc2626",
} as const satisfies Record<TaskPriority, string>;

export const TASK_PRIORITY_OPTIONS: ReadonlyArray<{
  value: TaskPriority;
  label: string;
  color: string;
}> = [
  { value: "low", label: "Low", color: TASK_PRIORITY_COLORS.low },
  { value: "medium", label: "Medium", color: TASK_PRIORITY_COLORS.medium },
  { value: "high", label: "High", color: TASK_PRIORITY_COLORS.high },
  { value: "urgent", label: "Urgent", color: TASK_PRIORITY_COLORS.urgent },
];

export const TASK_WORK_CATEGORY_VALUES = [
  "academic",
  "organization",
  "personal",
  "development",
  "general",
] as const satisfies readonly TaskWorkCategory[];

export const TASK_WORK_CATEGORY_OPTIONS: ReadonlyArray<{
  value: TaskWorkCategory;
  label: string;
}> = [
  { value: "academic", label: "Academic" },
  { value: "organization", label: "Organization" },
  { value: "personal", label: "Personal" },
  { value: "development", label: "Development" },
  { value: "general", label: "General" },
];
