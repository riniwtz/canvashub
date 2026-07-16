import { z } from "zod";

import {
  DEFAULT_WORK_TIMEZONE,
  NEW_TASK_TYPE_VALUE,
  TASK_DESCRIPTION_MAX_LENGTH,
  TASK_NOTES_MAX_LENGTH,
  TASK_PRIORITY_VALUES,
  TASK_TITLE_MAX_LENGTH,
  TASK_TYPE_DESCRIPTION_MAX_LENGTH,
  TASK_TYPE_NAME_MAX_LENGTH,
  TASK_WORK_CATEGORY_VALUES,
} from "@/features/work/constants";

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const IANA_TIMEZONE_PATTERN = /^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)+$/;
const TASK_TYPE_NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}\s&+/'().-]*$/u;
const DUE_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const optionalString = (maximumLength: number, message: string) =>
  z.preprocess(
    emptyToUndefined,
    z.string().trim().max(maximumLength, message).optional(),
  );

const optionalUuid = z.preprocess(
  emptyToUndefined,
  z.uuid("Select a valid option.").optional(),
);

const optionalDate = z.preprocess(
  emptyToUndefined,
  z.iso.date({ error: "Enter a valid date." }).optional(),
);

const optionalTime = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .regex(DUE_TIME_PATTERN, "Enter a valid time.")
    .optional(),
);

export const taskIdSchema = z.uuid("Task not found.");
export const taskVersionSchema = z.coerce
  .number({ error: "The task version is invalid." })
  .int()
  .positive();

export const taskStatusUpdateSchema = z
  .object({
    taskId: taskIdSchema,
    statusId: z.uuid("Select a valid status."),
    version: taskVersionSchema,
  })
  .strict();

export const taskTypeInputSchema = z
  .object({
    name: z
      .string({ error: "Type name is required." })
      .trim()
      .min(1, "Type name is required.")
      .max(
        TASK_TYPE_NAME_MAX_LENGTH,
        `Type name must be ${TASK_TYPE_NAME_MAX_LENGTH} characters or fewer.`,
      )
      .regex(
        TASK_TYPE_NAME_PATTERN,
        "Use letters, numbers, spaces, and common punctuation only.",
      ),
    description: optionalString(
      TASK_TYPE_DESCRIPTION_MAX_LENGTH,
      `Type description must be ${TASK_TYPE_DESCRIPTION_MAX_LENGTH} characters or fewer.`,
    ),
    color: z
      .string()
      .trim()
      .regex(HEX_COLOR_PATTERN, "Choose a valid color."),
    icon: z
      .string()
      .trim()
      .min(1, "Choose an icon name.")
      .max(40, "Icon name must be 40 characters or fewer."),
  })
  .strict();

const taskTypeDraftSchema = z
  .object({
    name: z.string(),
    description: z.preprocess(emptyToUndefined, z.string().optional()),
    color: z.string(),
    icon: z.string(),
  })
  .strict();

const taskInputBaseSchema = z
  .object({
    title: z
      .string({ error: "Task name is required." })
      .trim()
      .min(1, "Task name is required.")
      .max(
        TASK_TITLE_MAX_LENGTH,
        `Task name must be ${TASK_TITLE_MAX_LENGTH} characters or fewer.`,
      ),
    description: optionalString(
      TASK_DESCRIPTION_MAX_LENGTH,
      `Description must be ${TASK_DESCRIPTION_MAX_LENGTH} characters or fewer.`,
    ),
    notes: optionalString(
      TASK_NOTES_MAX_LENGTH,
      `Notes must be ${TASK_NOTES_MAX_LENGTH} characters or fewer.`,
    ),
    statusId: z.uuid("Select a status."),
    taskTypeId: z.union([
      z.uuid("Select a task type."),
      z.literal(NEW_TASK_TYPE_VALUE),
    ]),
    priority: z.enum(TASK_PRIORITY_VALUES),
    workCategory: z.enum(TASK_WORK_CATEGORY_VALUES),
    courseId: optionalUuid,
    organizationId: optionalUuid,
    parentTaskId: optionalUuid,
    startDate: optionalDate,
    deadlineMode: z.enum(["none", "date", "datetime"]),
    dueDate: optionalDate,
    dueTime: optionalTime,
    timezone: z
      .string()
      .trim()
      .max(64)
      .refine(isValidTimeZone, "Select a valid time zone."),
    newType: taskTypeDraftSchema,
    requestKey: z.uuid("The submission identifier is invalid."),
    version: taskVersionSchema.optional(),
  })
  .strict();

type TaskInputCandidate = z.output<typeof taskInputBaseSchema>;

export const taskInputSchema = taskInputBaseSchema
  .superRefine(validateTaskContext)
  .superRefine(validateTaskDeadline)
  .superRefine(validateNewTaskType)
  .superRefine(validateTaskDateOrder);

export type ValidatedTaskInput = z.output<typeof taskInputSchema>;
export type ValidatedTaskTypeInput = z.output<typeof taskTypeInputSchema>;
export type ValidatedTaskStatusUpdate = z.output<
  typeof taskStatusUpdateSchema
>;

export function validateTaskFormData(formData: FormData) {
  return taskInputSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    notes: formData.get("notes"),
    statusId: formData.get("statusId"),
    taskTypeId: formData.get("taskTypeId"),
    priority: formData.get("priority"),
    workCategory: formData.get("workCategory"),
    courseId: formData.get("courseId"),
    organizationId: formData.get("organizationId"),
    parentTaskId: formData.get("parentTaskId"),
    startDate: formData.get("startDate"),
    deadlineMode: formData.get("deadlineMode"),
    dueDate: formData.get("dueDate"),
    dueTime: formData.get("dueTime"),
    timezone: formData.get("timezone") ?? DEFAULT_WORK_TIMEZONE,
    newType: {
      name: formData.get("newTypeName") ?? "",
      description: formData.get("newTypeDescription"),
      color: formData.get("newTypeColor") ?? "#737373",
      icon: formData.get("newTypeIcon") ?? "briefcase",
    },
    requestKey: formData.get("requestKey"),
    version: formData.get("version") || undefined,
  });
}

export function mapTaskValidationErrors(error: z.ZodError) {
  const fieldErrors: Partial<Record<string, string[]>> = {};

  for (const issue of error.issues) {
    const fieldName = String(issue.path[0] ?? "form");
    fieldErrors[fieldName] = [
      ...(fieldErrors[fieldName] ?? []),
      issue.message,
    ];
  }

  return fieldErrors;
}

export function normalizeWorkName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
}

export function createStableSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function validateTaskContext(
  task: TaskInputCandidate,
  context: z.RefinementCtx,
) {
  if (task.workCategory === "academic" && !task.courseId) {
    context.addIssue({
      code: "custom",
      path: ["courseId"],
      message: "Select a course for academic work.",
    });
  }

  if (task.workCategory === "organization" && !task.organizationId) {
    context.addIssue({
      code: "custom",
      path: ["organizationId"],
      message: "Select an organization for organization work.",
    });
  }

  if (task.workCategory !== "academic" && task.courseId) {
    context.addIssue({
      code: "custom",
      path: ["courseId"],
      message: "Courses can only be assigned to academic work.",
    });
  }

  if (task.workCategory !== "organization" && task.organizationId) {
    context.addIssue({
      code: "custom",
      path: ["organizationId"],
      message: "Organizations can only be assigned to organization work.",
    });
  }
}

function validateTaskDeadline(
  task: TaskInputCandidate,
  context: z.RefinementCtx,
) {
  if (task.deadlineMode === "none" && (task.dueDate || task.dueTime)) {
    context.addIssue({
      code: "custom",
      path: ["dueDate"],
      message: "Remove the deadline date and time or choose a deadline mode.",
    });
  }

  if (task.deadlineMode !== "none" && !task.dueDate) {
    context.addIssue({
      code: "custom",
      path: ["dueDate"],
      message: "Choose a deadline date.",
    });
  }

  if (task.deadlineMode === "datetime" && !task.dueTime) {
    context.addIssue({
      code: "custom",
      path: ["dueTime"],
      message: "Choose a deadline time.",
    });
  }

  if (task.deadlineMode === "date" && task.dueTime) {
    context.addIssue({
      code: "custom",
      path: ["dueTime"],
      message: "Date-only deadlines cannot include a time.",
    });
  }
}

function validateNewTaskType(
  task: TaskInputCandidate,
  context: z.RefinementCtx,
) {
  if (task.taskTypeId !== NEW_TASK_TYPE_VALUE) {
    return;
  }

  const typeResult = taskTypeInputSchema.safeParse(task.newType);

  if (typeResult.success) {
    return;
  }

  for (const issue of typeResult.error.issues) {
    context.addIssue({
      code: "custom",
      path: ["newType", ...issue.path],
      message: issue.message,
    });
  }
}

function validateTaskDateOrder(
  task: TaskInputCandidate,
  context: z.RefinementCtx,
) {
  if (!task.startDate || !task.dueDate || task.startDate <= task.dueDate) {
    return;
  }

  context.addIssue({
    code: "custom",
    path: ["dueDate"],
    message: "Deadline cannot be before the start date.",
  });
}

function emptyToUndefined(value: unknown) {
  if (value === null || value === undefined) {
    return undefined;
  }

  return typeof value === "string" && !value.trim() ? undefined : value;
}

function isValidTimeZone(value: string): boolean {
  if (value !== "UTC" && !IANA_TIMEZONE_PATTERN.test(value)) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}
