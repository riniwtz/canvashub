"use client";

import { useActionState, useState } from "react";
import { Trash2Icon } from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import {
  INITIAL_WORK_TASK_ACTION_STATE,
  type WorkTaskFormAction,
} from "@/features/work/action-state";

type DeleteTaskDialogProps = {
  taskId: string;
  taskTitle: string;
  directSubtaskCount: number;
  deleteAction: WorkTaskFormAction;
};

export function DeleteTaskDialog(props: DeleteTaskDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="destructive"
          size="icon"
          aria-label={`Delete ${props.taskTitle}`}
        >
          <Trash2Icon />
          <span className="sr-only">Delete {props.taskTitle}</span>
        </Button>
      </AlertDialogTrigger>
      {open ? (
        <DeleteTaskForm {...props} />
      ) : null}
    </AlertDialog>
  );
}

function DeleteTaskForm({
  taskId,
  taskTitle,
  directSubtaskCount,
  deleteAction,
}: DeleteTaskDialogProps) {
  const [state, formAction, isPending] = useActionState(
    deleteAction,
    INITIAL_WORK_TASK_ACTION_STATE,
  );

  return (
    <AlertDialogContent size="sm">
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="taskId" value={taskId} />
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2Icon />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete {taskTitle}?</AlertDialogTitle>
          <AlertDialogDescription>
            {directSubtaskCount
              ? `This task has ${directSubtaskCount} direct ${directSubtaskCount === 1 ? "subtask" : "subtasks"}. It and every descendant will be removed from active Work views, while their records remain available for auditing.`
              : "This task will be removed from active Work views while its record remains available for auditing."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {state.status === "error" && state.message ? (
          <FieldError aria-live="polite">{state.message}</FieldError>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel type="button" disabled={isPending}>
            Cancel
          </AlertDialogCancel>
          <Button type="submit" variant="destructive" disabled={isPending}>
            {isPending ? <Spinner data-icon="inline-start" /> : null}
            {isPending ? "Deleting task" : "Delete task"}
          </Button>
        </AlertDialogFooter>
      </form>
    </AlertDialogContent>
  );
}
