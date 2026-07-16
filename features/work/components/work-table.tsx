"use client";

import {
  Fragment,
  useEffect,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronRightIcon,
  LoaderCircleIcon,
} from "lucide-react";

import {
  deleteTaskAction,
  getTaskSubtasksAction,
  updateTaskStatusAction,
} from "@/features/work/server/actions";
import { DeleteTaskDialog } from "@/features/work/components/delete-task-dialog";
import {
  AddSubtaskDialog,
  EditTaskDialog,
} from "@/features/work/components/task-dialog";
import { WorkColorDot } from "@/features/work/components/work-color-dot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type {
  WorkTaskActionState,
  WorkTaskFormAction,
} from "@/features/work/action-state";
import { TASK_PRIORITY_COLORS } from "@/features/work/constants";
import type { WorkSortField } from "@/features/work/query";
import type {
  WorkFilterOptions,
  WorkStatusOption,
  WorkTaskItem,
} from "@/features/work/types";

const WORK_TABLE_COLUMN_COUNT = 9;
const TASK_COLUMN_WIDTH_CLASS = "w-64 min-w-64 max-w-64";
const TASK_TREE_INDENT_REM = 1;
const EMPTY_WORK_TASKS: WorkTaskItem[] = [];

const deadlineDateFormatter = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

type WorkTableProps = {
  tasks: WorkTaskItem[];
  options: WorkFilterOptions;
  sort: WorkSortField;
  order: "asc" | "desc";
  sortHrefs: Record<WorkSortField, string>;
  emptyMessage: string;
};

type TaskRowProps = {
  task: WorkTaskItem;
  options: WorkFilterOptions;
  depth: number;
  deleteAction: WorkTaskFormAction;
};

export function WorkTable({
  tasks,
  options,
  sort,
  order,
  sortHrefs,
  emptyMessage,
}: WorkTableProps) {
  const [deleteError, setDeleteError] = useState("");
  const [optimisticTasks, removeOptimisticTask] = useOptimistic<
    WorkTaskItem[],
    string
  >(tasks, removeTaskById);

  async function deleteVisibleTask(
    previousState: WorkTaskActionState,
    formData: FormData,
  ) {
    const taskId = getSubmittedTaskId(formData);

    setDeleteError("");
    if (taskId) {
      removeOptimisticTask(taskId);
    }

    const result = await deleteTaskAction(previousState, formData);
    setDeleteError(result.status === "error" ? result.message : "");
    return result;
  }

  return (
    <div className="flex flex-col gap-2">
      {deleteError ? (
        <p role="alert" className="text-sm text-destructive">
          {deleteError}
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead
                label="Task"
                field="title"
                activeSort={sort}
                order={order}
                href={sortHrefs.title}
                className={cn(TASK_COLUMN_WIDTH_CLASS, "px-0.5")}
              />
              <TableHead className="hidden min-w-36 md:table-cell">
                Context
              </TableHead>
              <SortableHead
                label="Deadline"
                field="dueDate"
                activeSort={sort}
                order={order}
                href={sortHrefs.dueDate}
                className="min-w-10"
              />
              <SortableHead
                label="Status"
                field="status"
                activeSort={sort}
                order={order}
                href={sortHrefs.status}
                className="min-w-40"
              />
              <SortableHead
                label="Priority"
                field="priority"
                activeSort={sort}
                order={order}
                href={sortHrefs.priority}
                className="hidden lg:table-cell"
              />
              <SortableHead
                label="Type"
                field="type"
                activeSort={sort}
                order={order}
                href={sortHrefs.type}
                className="hidden lg:table-cell"
              />
              <TableHead className="hidden min-w-32 xl:table-cell">
                Subtasks
              </TableHead>
              <SortableHead
                label="Updated"
                field="updatedAt"
                activeSort={sort}
                order={order}
                href={sortHrefs.updatedAt}
                className="hidden xl:table-cell"
              />
              <TableHead className="min-w-36 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {optimisticTasks.length ? (
              optimisticTasks.map((task) => (
                <TaskTableRow
                  key={task.id}
                  task={task}
                  options={options}
                  depth={0}
                  deleteAction={deleteVisibleTask}
                />
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={WORK_TABLE_COLUMN_COUNT}
                  className="h-32 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function TaskTableRow({ task, options, depth, deleteAction }: TaskRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [subtasks, setSubtasks] = useState<WorkTaskItem[] | null>(null);
  const [optimisticSubtasks, removeOptimisticSubtask] = useOptimistic<
    WorkTaskItem[],
    string
  >(subtasks ?? EMPTY_WORK_TASKS, removeTaskById);
  const [loadError, setLoadError] = useState("");
  const [isLoading, startLoading] = useTransition();
  const canExpand = task.directSubtaskCount > 0;

  async function deleteLoadedSubtask(
    previousState: WorkTaskActionState,
    formData: FormData,
  ) {
    const taskId = getSubmittedTaskId(formData);

    setLoadError("");
    if (taskId) {
      removeOptimisticSubtask(taskId);
    }

    const result = await deleteTaskAction(previousState, formData);

    if (result.status === "error") {
      setLoadError(result.message);
      return result;
    }

    if (taskId) {
      setSubtasks((currentSubtasks) =>
        currentSubtasks
          ? removeTaskById(currentSubtasks, taskId)
          : currentSubtasks,
      );
    }

    return result;
  }

  function toggleSubtasks() {
    if (expanded) {
      setExpanded(false);
      return;
    }

    setExpanded(true);

    if (subtasks) {
      return;
    }

    startLoading(async () => {
      const result = await getTaskSubtasksAction(task.id);

      if (result.success) {
        setSubtasks(result.tasks);
        setLoadError("");
        return;
      }

      setLoadError(result.message);
    });
  }

  return (
    <Fragment>
      <TableRow data-depth={depth}>
        <TableCell
          className={cn(
            TASK_COLUMN_WIDTH_CLASS,
            "whitespace-normal py-2 pr-2 pl-0",
          )}
        >
          <div
            className="flex min-w-0 items-start gap-1"
            style={{
              paddingInlineStart: `${depth * TASK_TREE_INDENT_REM}rem`,
            }}
          >
            {canExpand ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-expanded={expanded}
                aria-label={`${expanded ? "Collapse" : "Expand"} subtasks for ${task.title}`}
                onClick={toggleSubtasks}
              >
                {isLoading ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : (
                  <ChevronRightIcon
                    className={cn(
                      "transition-transform",
                      expanded && "rotate-90",
                    )}
                  />
                )}
              </Button>
            ) : (
              <span aria-hidden className="size-6 shrink-0" />
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span
                title={task.title}
                className={cn(
                  "break-words font-medium leading-snug whitespace-normal",
                  task.status.isCompleted &&
                    "text-muted-foreground line-through",
                )}
              >
                {task.title}
              </span>
              {task.description ? (
                <span className="line-clamp-2 break-words text-xs whitespace-normal text-muted-foreground">
                  {task.description}
                </span>
              ) : null}
            </div>
          </div>
        </TableCell>
        <TableCell className="hidden md:table-cell">
          {formatTaskContext(task)}
        </TableCell>
        <TableCell>{formatDeadline(task)}</TableCell>
        <TableCell>
          <TaskStatusSelect task={task} statuses={options.statuses} />
        </TableCell>
        <TableCell className="hidden lg:table-cell">
          <Badge
            variant={task.priority === "urgent" ? "destructive" : "outline"}
          >
            <WorkColorDot color={TASK_PRIORITY_COLORS[task.priority]} />
            {capitalize(task.priority)}
          </Badge>
        </TableCell>
        <TableCell className="hidden lg:table-cell">
          <Badge variant="outline">
            <WorkColorDot color={task.taskType.color} />
            {task.taskType.name}
          </Badge>
        </TableCell>
        <TableCell className="hidden xl:table-cell">
          {task.directSubtaskCount
            ? `${task.completedSubtaskCount} / ${task.directSubtaskCount}`
            : "—"}
        </TableCell>
        <TableCell className="hidden xl:table-cell">
          <time dateTime={task.updatedAt}>
            {formatDateTime(task.updatedAt)}
          </time>
        </TableCell>
        <TableCell className="min-w-36">
          <div className="flex justify-end gap-2">
            <EditTaskDialog options={options} task={task} />
            <AddSubtaskDialog options={options} parentTask={task} />
            <DeleteTaskDialog
              taskId={task.id}
              taskTitle={task.title}
              directSubtaskCount={task.directSubtaskCount}
              deleteAction={deleteAction}
            />
          </div>
        </TableCell>
      </TableRow>

      {expanded && isLoading ? (
        <TableRow>
          <TableCell
            colSpan={WORK_TABLE_COLUMN_COUNT}
            className="text-muted-foreground"
          >
            Loading subtasks…
          </TableCell>
        </TableRow>
      ) : null}

      {expanded && loadError ? (
        <TableRow>
          <TableCell
            colSpan={WORK_TABLE_COLUMN_COUNT}
            className="text-destructive"
          >
            {loadError}
          </TableCell>
        </TableRow>
      ) : null}

      {expanded
        ? optimisticSubtasks.map((subtask) => (
            <TaskTableRow
              key={subtask.id}
              task={subtask}
              options={options}
              depth={depth + 1}
              deleteAction={deleteLoadedSubtask}
            />
          ))
        : null}
    </Fragment>
  );
}

function removeTaskById(tasks: WorkTaskItem[], taskId: string) {
  return tasks.filter((task) => task.id !== taskId);
}

function getSubmittedTaskId(formData: FormData) {
  const taskId = formData.get("taskId");

  return typeof taskId === "string" ? taskId : null;
}

function TaskStatusSelect({
  task,
  statuses,
}: {
  task: WorkTaskItem;
  statuses: WorkStatusOption[];
}) {
  const router = useRouter();
  const [selectedStatusId, setSelectedStatusId] = useState(task.status.id);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startStatusUpdate] = useTransition();

  useEffect(() => {
    setSelectedStatusId(task.status.id);
  }, [task.status.id]);

  function changeStatus(statusId: string) {
    if (statusId === selectedStatusId) {
      return;
    }

    const previousStatusId = selectedStatusId;
    setSelectedStatusId(statusId);
    setErrorMessage("");

    startStatusUpdate(async () => {
      const result = await updateTaskStatusAction({
        taskId: task.id,
        statusId,
        version: task.version,
      });

      if (!result.success) {
        setSelectedStatusId(previousStatusId);
        setErrorMessage(result.message);
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="flex min-w-32 flex-col gap-1 px-0 py-4">
      <Select
        value={selectedStatusId}
        onValueChange={changeStatus}
        disabled={isPending}
      >
        <SelectTrigger
          size="sm"
          className="w-full"
          aria-label={`Change status for ${task.title}`}
          aria-invalid={Boolean(errorMessage)}
          aria-busy={isPending}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectGroup>
            {statuses.map((status) => (
              <SelectItem key={status.id} value={status.id}>
                <WorkColorDot color={status.color} />
                {status.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {errorMessage ? (
        <span role="alert" className="text-xs text-destructive">
          {errorMessage}
        </span>
      ) : null}
    </div>
  );
}

function SortableHead({
  label,
  field,
  activeSort,
  order,
  href,
  className,
}: {
  label: string;
  field: WorkSortField;
  activeSort: WorkSortField;
  order: "asc" | "desc";
  href: string;
  className?: string;
}) {
  const isActive = activeSort === field;
  const SortIcon = order === "asc" ? ArrowUpIcon : ArrowDownIcon;

  return (
    <TableHead className={className}>
      <Button asChild variant="ghost" size="xs">
        <Link href={href}>
          {label}
          {isActive ? <SortIcon data-icon="inline-end" /> : null}
        </Link>
      </Button>
    </TableHead>
  );
}

function formatTaskContext(task: WorkTaskItem): string {
  if (task.course) {
    return task.course.code;
  }

  if (task.organization) {
    return task.organization.name;
  }

  return capitalize(task.workCategory);
}

function formatDeadline(task: WorkTaskItem): string {
  if (!task.dueDate) {
    return "No deadline";
  }

  const date = deadlineDateFormatter.format(
    new Date(`${task.dueDate}T00:00:00Z`),
  );

  return task.dueTime ? `${date}, ${formatTime(task.dueTime)}` : date;
}

function formatTime(time: string): string {
  const [hourValue, minute] = time.split(":");
  const hour = Number(hourValue);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${suffix}`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
