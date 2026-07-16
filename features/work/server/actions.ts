"use server";

import "server-only";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import type { WorkTaskActionState } from "@/features/work/action-state";
import { getCurrentWorkUserId } from "@/features/work/server/current-user";
import {
  createWorkTask,
  getTaskSubtasks,
  softDeleteWorkTask,
  updateWorkTask,
  updateWorkTaskStatus,
  WorkDataError,
} from "@/features/work/server/data";
import type { WorkTaskItem } from "@/features/work/types";
import {
  mapTaskValidationErrors,
  taskIdSchema,
  taskStatusUpdateSchema,
  validateTaskFormData,
} from "@/features/work/validation";

export type WorkSubtaskActionResult =
  | { success: true; tasks: WorkTaskItem[] }
  | { success: false; message: string };

export type WorkStatusActionResult =
  | { success: true }
  | { success: false; message: string };

export async function createTaskAction(
  _previousState: WorkTaskActionState,
  formData: FormData,
): Promise<WorkTaskActionState> {
  const validationResult = validateTaskFormData(formData);

  if (!validationResult.success) {
    return validationErrorState(validationResult.error);
  }

  try {
    const ownerUserId = await getCurrentWorkUserId();
    await createWorkTask(ownerUserId, validationResult.data);
  } catch (error) {
    return handleTaskActionError(error, "create");
  }

  revalidatePath("/work");
  return successState("Task added.");
}

export async function updateTaskAction(
  _previousState: WorkTaskActionState,
  formData: FormData,
): Promise<WorkTaskActionState> {
  const taskIdResult = taskIdSchema.safeParse(formData.get("taskId"));

  if (!taskIdResult.success) {
    return errorState("This task no longer exists.");
  }

  const validationResult = validateTaskFormData(formData);

  if (!validationResult.success) {
    return validationErrorState(validationResult.error);
  }

  if (!validationResult.data.version) {
    return errorState("Refresh the page before editing this task.");
  }

  try {
    const ownerUserId = await getCurrentWorkUserId();
    await updateWorkTask(
      ownerUserId,
      taskIdResult.data,
      validationResult.data,
    );
  } catch (error) {
    return handleTaskActionError(error, "update");
  }

  revalidatePath("/work");
  return successState("Task updated.");
}

export async function deleteTaskAction(
  _previousState: WorkTaskActionState,
  formData: FormData,
): Promise<WorkTaskActionState> {
  const taskIdResult = taskIdSchema.safeParse(formData.get("taskId"));

  if (!taskIdResult.success) {
    return errorState("This task no longer exists.");
  }

  try {
    const ownerUserId = await getCurrentWorkUserId();
    const deletedCount = await softDeleteWorkTask(
      ownerUserId,
      taskIdResult.data,
    );
    revalidatePath("/work");

    return successState(
      deletedCount === 1
        ? "Task deleted."
        : `Task and ${deletedCount - 1} subtasks deleted.`,
    );
  } catch (error) {
    return handleTaskActionError(error, "delete");
  }
}

export async function updateTaskStatusAction(
  input: unknown,
): Promise<WorkStatusActionResult> {
  const validationResult = taskStatusUpdateSchema.safeParse(input);

  if (!validationResult.success) {
    return {
      success: false,
      message: "Refresh the page and choose a valid status.",
    };
  }

  try {
    const ownerUserId = await getCurrentWorkUserId();
    await updateWorkTaskStatus(ownerUserId, validationResult.data);
  } catch (error) {
    return {
      success: false,
      message: handleTaskActionError(error, "update").message,
    };
  }

  revalidatePath("/work");
  return { success: true };
}

export async function getTaskSubtasksAction(
  taskId: string,
): Promise<WorkSubtaskActionResult> {
  const taskIdResult = taskIdSchema.safeParse(taskId);

  if (!taskIdResult.success) {
    return { success: false, message: "This task no longer exists." };
  }

  try {
    const ownerUserId = await getCurrentWorkUserId();
    const subtasks = await getTaskSubtasks(ownerUserId, taskIdResult.data);
    return { success: true, tasks: subtasks };
  } catch (error) {
    console.error("Unable to load subtasks.", error);
    return {
      success: false,
      message: "Subtasks could not be loaded. Try again.",
    };
  }
}

function handleTaskActionError(
  error: unknown,
  operation: "create" | "update" | "delete",
): WorkTaskActionState {
  if (error instanceof WorkDataError) {
    if (error.code === "not_found") {
      return errorState("This task no longer exists.");
    }

    if (error.code === "conflict") {
      return errorState(
        "This task changed after you opened it. Refresh the page and try again.",
      );
    }

    if (error.code === "invalid_hierarchy") {
      return {
        ...errorState("Choose a different parent task."),
        fieldErrors: {
          parentTaskId: ["A task cannot be nested below itself or a subtask."],
        },
      };
    }

    if (error.code === "duplicate_type") {
      return {
        ...errorState("A task type with this name already exists."),
        fieldErrors: {
          newType: ["Choose the existing type or enter a different name."],
        },
      };
    }

    if (error.code === "invalid_reference") {
      return errorState(
        "One of the selected options is no longer available. Refresh and try again.",
      );
    }
  }

  console.error(`Unable to ${operation} task.`, error);
  return errorState(
    `The task could not be ${operation === "create" ? "saved" : `${operation}d`}. Check the database connection and try again.`,
  );
}

function validationErrorState(error: Parameters<typeof mapTaskValidationErrors>[0]) {
  return {
    status: "error" as const,
    message: "Check the highlighted fields and try again.",
    fieldErrors: mapTaskValidationErrors(error),
  };
}

function successState(message: string): WorkTaskActionState {
  return {
    status: "success",
    message,
    fieldErrors: {},
    submissionId: randomUUID(),
  };
}

function errorState(message: string): WorkTaskActionState {
  return {
    status: "error",
    message,
    fieldErrors: {},
  };
}
