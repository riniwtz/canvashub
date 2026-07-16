"use client";

import {
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ComponentProps,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  ListPlusIcon,
  PencilIcon,
  PlusIcon,
} from "lucide-react";

import {
  createTaskAction,
  updateTaskAction,
} from "@/features/work/server/actions";
import { WorkColorDot } from "@/features/work/components/work-color-dot";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  getVisibleWorkTaskFieldErrors,
  INITIAL_WORK_TASK_ACTION_STATE,
} from "@/features/work/action-state";
import {
  DEFAULT_WORK_TIMEZONE,
  NEW_TASK_TYPE_VALUE,
  TASK_DESCRIPTION_MAX_LENGTH,
  TASK_NOTES_MAX_LENGTH,
  TASK_PRIORITY_OPTIONS,
  TASK_TITLE_MAX_LENGTH,
  TASK_TYPE_DESCRIPTION_MAX_LENGTH,
  TASK_TYPE_NAME_MAX_LENGTH,
  TASK_WORK_CATEGORY_OPTIONS,
} from "@/features/work/constants";
import {
  type DeadlineMode,
  withDeadlineModeDefaults,
} from "@/features/work/deadline-defaults";
import type {
  WorkFilterOptions,
  WorkTaskItem,
} from "@/features/work/types";

const NO_SELECTION_VALUE = "no-selection";

type TaskDialogMode = "create" | "edit" | "subtask";

type TaskDialogProps = {
  mode: TaskDialogMode;
  options: WorkFilterOptions;
  task?: WorkTaskItem;
  parentTask?: WorkTaskItem;
  disabled?: boolean;
};

type TaskFormDefaults = {
  title: string;
  description: string;
  notes: string;
  statusId: string;
  taskTypeId: string;
  priority: WorkTaskItem["priority"];
  workCategory: WorkTaskItem["workCategory"];
  courseId: string;
  organizationId: string;
  parentTaskId: string;
  startDate: string;
  deadlineMode: DeadlineMode;
  dueDate: string;
  dueTime: string;
};

type TaskFormValues = TaskFormDefaults & {
  newTypeName: string;
  newTypeDescription: string;
  newTypeColor: string;
  newTypeIcon: string;
};

type TaskTextFieldName =
  | "title"
  | "description"
  | "notes"
  | "startDate"
  | "dueDate"
  | "dueTime"
  | "newTypeName"
  | "newTypeDescription"
  | "newTypeColor"
  | "newTypeIcon";

const VALIDATION_FIELD_DEPENDENCIES: Partial<
  Record<keyof TaskFormValues, readonly string[]>
> = {
  deadlineMode: ["dueDate", "dueTime"],
  startDate: ["dueDate"],
  workCategory: ["courseId", "organizationId"],
};

type SelectOption = {
  value: string;
  label: string;
  color?: string;
  disabled?: boolean;
};

type FormSelectFieldProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  options: readonly SelectOption[];
  onValueChange: (value: string) => void;
  errors?: string[];
  placeholder?: string;
};

export function AddTaskDialog({
  options,
  disabled = false,
}: Pick<TaskDialogProps, "options" | "disabled">) {
  return <TaskDialog mode="create" options={options} disabled={disabled} />;
}

export function EditTaskDialog({
  options,
  task,
}: Pick<TaskDialogProps, "options" | "task"> & { task: WorkTaskItem }) {
  return <TaskDialog mode="edit" options={options} task={task} />;
}

export function AddSubtaskDialog({
  options,
  parentTask,
}: Pick<TaskDialogProps, "options" | "parentTask"> & {
  parentTask: WorkTaskItem;
}) {
  return (
    <TaskDialog mode="subtask" options={options} parentTask={parentTask} />
  );
}

function TaskDialog(props: TaskDialogProps) {
  const [open, setOpen] = useState(false);
  const closeDialog = useCallback(() => setOpen(false), []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{getDialogTrigger(props)}</DialogTrigger>
      <DialogContent className="flex h-[min(52rem,calc(100dvh-1rem))] flex-col gap-0 overflow-hidden p-0 sm:h-[min(52rem,calc(100dvh-2rem))] sm:max-w-3xl">
        {open ? <TaskForm {...props} closeDialog={closeDialog} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function TaskForm({
  mode,
  options,
  task,
  parentTask,
  closeDialog,
}: TaskDialogProps & { closeDialog: () => void }) {
  const router = useRouter();
  const defaults = useMemo(
    () => createTaskFormDefaults({ mode, options, task, parentTask }),
    [mode, options, parentTask, task],
  );
  const [state, formAction, isPending] = useActionState(
    mode === "edit" ? updateTaskAction : createTaskAction,
    INITIAL_WORK_TASK_ACTION_STATE,
  );
  const [requestKey, setRequestKey] = useState("");
  const [formValues, setFormValues] = useState(() =>
    createTaskFormValues(defaults),
  );
  const [editedValidationFields, setEditedValidationFields] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const visibleFieldErrors = getVisibleWorkTaskFieldErrors({
    fieldErrors: state.fieldErrors,
    editedFields: editedValidationFields,
    isPending,
  });
  const hasServerFieldErrors = Object.keys(state.fieldErrors).length > 0;
  const hasVisibleFieldErrors = Object.keys(visibleFieldErrors).length > 0;
  const showActionError =
    state.status === "error" &&
    Boolean(state.message) &&
    (!hasServerFieldErrors || hasVisibleFieldErrors);

  useEffect(() => {
    setRequestKey(crypto.randomUUID());
  }, []);

  useEffect(() => {
    if (state.status !== "success" || !state.submissionId) {
      return;
    }

    closeDialog();
    router.refresh();
  }, [closeDialog, router, state.status, state.submissionId]);

  const activeTaskTypeOptions = options.taskTypes.map((taskType) => ({
    value: taskType.id,
    label: taskType.isActive ? taskType.name : `${taskType.name} (archived)`,
    color: taskType.color,
    disabled: !taskType.isActive && taskType.id !== defaults.taskTypeId,
  }));
  const parentOptions = options.parentTasks
    .filter((parentOption) => parentOption.id !== task?.id)
    .map((parentOption) => ({
      value: parentOption.id,
      label: parentOption.title,
    }));

  function changeFormValue<TKey extends keyof TaskFormValues>(
    field: TKey,
    value: TaskFormValues[TKey],
  ) {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
    markValidationFieldsEdited(field);
  }

  function markValidationFieldsEdited(field: keyof TaskFormValues) {
    setEditedValidationFields((currentFields) =>
      addEditedValidationFields(currentFields, field),
    );
  }

  function changeTextField(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    changeFormValue(
      event.currentTarget.name as TaskTextFieldName,
      event.currentTarget.value,
    );
  }

  function changeWorkCategory(value: string) {
    const nextCategory = value as WorkTaskItem["workCategory"];
    setFormValues((currentValues) => ({
      ...currentValues,
      workCategory: nextCategory,
      courseId:
        nextCategory === "academic"
          ? currentValues.courseId
          : NO_SELECTION_VALUE,
      organizationId:
        nextCategory === "organization"
          ? currentValues.organizationId
          : NO_SELECTION_VALUE,
    }));
    markValidationFieldsEdited("workCategory");
  }

  function changeDeadlineMode(value: string) {
    const deadlineMode = value as DeadlineMode;
    const now = new Date();

    setFormValues((currentValues) =>
      withDeadlineModeDefaults({
        values: currentValues,
        deadlineMode,
        now,
      }),
    );
    markValidationFieldsEdited("deadlineMode");
  }

  function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    setEditedValidationFields(new Set());
    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <form
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      noValidate
      onSubmit={submitTask}
    >
      <input type="hidden" name="requestKey" value={requestKey} />
      <input type="hidden" name="timezone" value={DEFAULT_WORK_TIMEZONE} />
      <input
        type="hidden"
        name="workCategory"
        value={formValues.workCategory}
      />
      <input
        type="hidden"
        name="courseId"
        value={
          formValues.workCategory === "academic" &&
          formValues.courseId !== NO_SELECTION_VALUE
            ? formValues.courseId
            : ""
        }
      />
      <input
        type="hidden"
        name="organizationId"
        value={
          formValues.workCategory === "organization" &&
          formValues.organizationId !== NO_SELECTION_VALUE
            ? formValues.organizationId
            : ""
        }
      />
      <input
        type="hidden"
        name="parentTaskId"
        value={
          formValues.parentTaskId === NO_SELECTION_VALUE
            ? ""
            : formValues.parentTaskId
        }
      />
      {task ? <input type="hidden" name="taskId" value={task.id} /> : null}
      {task ? (
        <input type="hidden" name="version" value={task.version} />
      ) : null}

      <DialogHeader className="shrink-0 border-b px-4 py-4 pr-12 sm:px-6 sm:py-5 sm:pr-12">
        <DialogTitle>{getDialogTitle(mode, task, parentTask)}</DialogTitle>
        <DialogDescription>
          {getDialogDescription(mode, parentTask)}
        </DialogDescription>
        {showActionError ? (
          <FieldError aria-live="polite">{state.message}</FieldError>
        ) : null}
      </DialogHeader>

      <ScrollArea className="min-h-0 flex-1 overflow-hidden">
        <FieldGroup className="gap-6 p-4 sm:p-6">
          <FieldSet>
            <FieldLegend>Task</FieldLegend>
            <FieldGroup>
              <ValidatedTextField
                id={`${mode}-task-title`}
                name="title"
                label="Task name"
                value={formValues.title}
                onChange={changeTextField}
                maxLength={TASK_TITLE_MAX_LENGTH}
                placeholder="e.g. Prepare the network presentation"
                required
                errors={visibleFieldErrors.title}
              />
              <Field
                data-invalid={Boolean(visibleFieldErrors.description?.length)}
              >
                <FieldLabel htmlFor={`${mode}-task-description`}>
                  Description
                </FieldLabel>
                <Textarea
                  id={`${mode}-task-description`}
                  name="description"
                  value={formValues.description}
                  onChange={changeTextField}
                  maxLength={TASK_DESCRIPTION_MAX_LENGTH}
                  rows={3}
                  placeholder="Add the goal, requirements, or useful context"
                  aria-invalid={Boolean(
                    visibleFieldErrors.description?.length,
                  )}
                />
                <TaskFieldError errors={visibleFieldErrors.description} />
              </Field>
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Workflow</FieldLegend>
            <FieldGroup className="grid gap-4 sm:grid-cols-3">
              <FormSelectField
                id={`${mode}-task-status`}
                name="statusId"
                label="Status"
                value={formValues.statusId}
                onValueChange={(value) =>
                  changeFormValue("statusId", value)
                }
                options={options.statuses.map((status) => ({
                  value: status.id,
                  label: status.name,
                  color: status.color,
                }))}
                errors={visibleFieldErrors.statusId}
              />
              <FormSelectField
                id={`${mode}-task-priority`}
                name="priority"
                label="Priority"
                value={formValues.priority}
                onValueChange={(value) =>
                  changeFormValue(
                    "priority",
                    value as TaskFormValues["priority"],
                  )
                }
                options={TASK_PRIORITY_OPTIONS}
                errors={visibleFieldErrors.priority}
              />
              <FormSelectField
                id={`${mode}-task-type`}
                name="taskTypeId"
                label="Task type"
                value={formValues.taskTypeId}
                onValueChange={(value) =>
                  changeFormValue("taskTypeId", value)
                }
                options={[
                  ...activeTaskTypeOptions,
                  { value: NEW_TASK_TYPE_VALUE, label: "Create new type" },
                ]}
                errors={visibleFieldErrors.taskTypeId}
              />
            </FieldGroup>
          </FieldSet>

          {formValues.taskTypeId === NEW_TASK_TYPE_VALUE ? (
            <FieldSet>
              <FieldLegend>Create task type</FieldLegend>
              <FieldDescription>
                The new type is saved with this task and appears in the Work
                tabs immediately.
              </FieldDescription>
              <FieldGroup className="grid gap-4 sm:grid-cols-2">
                <ValidatedTextField
                  id={`${mode}-new-type-name`}
                  name="newTypeName"
                  label="Type name"
                  value={formValues.newTypeName}
                  onChange={changeTextField}
                  maxLength={TASK_TYPE_NAME_MAX_LENGTH}
                  placeholder="e.g. Research"
                  required
                  errors={visibleFieldErrors.newType}
                />
                <ValidatedTextField
                  id={`${mode}-new-type-icon`}
                  name="newTypeIcon"
                  label="Icon name"
                  value={formValues.newTypeIcon}
                  onChange={changeTextField}
                  maxLength={40}
                  placeholder="e.g. briefcase"
                  required
                />
                <Field>
                  <FieldLabel htmlFor={`${mode}-new-type-color`}>
                    Color
                  </FieldLabel>
                  <Input
                    id={`${mode}-new-type-color`}
                    name="newTypeColor"
                    type="color"
                    value={formValues.newTypeColor}
                    onChange={changeTextField}
                  />
                </Field>
                <ValidatedTextField
                  id={`${mode}-new-type-description`}
                  name="newTypeDescription"
                  label="Type description"
                  value={formValues.newTypeDescription}
                  onChange={changeTextField}
                  maxLength={TASK_TYPE_DESCRIPTION_MAX_LENGTH}
                  placeholder="Describe when this task type should be used"
                />
              </FieldGroup>
            </FieldSet>
          ) : (
            <input type="hidden" name="newTypeName" value="" />
          )}

          <FieldSet>
            <FieldLegend>Context</FieldLegend>
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <FormSelectField
                id={`${mode}-work-category`}
                name="workCategoryDisplay"
                label="Work category"
                value={formValues.workCategory}
                onValueChange={changeWorkCategory}
                options={TASK_WORK_CATEGORY_OPTIONS}
                errors={visibleFieldErrors.workCategory}
              />
              <FormSelectField
                id={`${mode}-parent-task`}
                name="parentTaskDisplay"
                label="Parent task"
                value={formValues.parentTaskId}
                onValueChange={(value) =>
                  changeFormValue("parentTaskId", value)
                }
                options={[
                  { value: NO_SELECTION_VALUE, label: "No parent task" },
                  ...parentOptions,
                ]}
                errors={visibleFieldErrors.parentTaskId}
              />
              {formValues.workCategory === "academic" ? (
                <FormSelectField
                  id={`${mode}-course`}
                  name="courseDisplay"
                  label="Course"
                  value={formValues.courseId}
                  onValueChange={(value) =>
                    changeFormValue("courseId", value)
                  }
                  options={[
                    { value: NO_SELECTION_VALUE, label: "Select a course" },
                    ...options.courses.map((course) => ({
                      value: course.id,
                      label: `${course.code} — ${course.name}`,
                    })),
                  ]}
                  errors={visibleFieldErrors.courseId}
                />
              ) : null}
              {formValues.workCategory === "organization" ? (
                <FormSelectField
                  id={`${mode}-organization`}
                  name="organizationDisplay"
                  label="Organization"
                  value={formValues.organizationId}
                  onValueChange={(value) =>
                    changeFormValue("organizationId", value)
                  }
                  options={[
                    {
                      value: NO_SELECTION_VALUE,
                      label: "Select an organization",
                    },
                    ...options.organizations.map((organization) => ({
                      value: organization.id,
                      label: organization.name,
                    })),
                  ]}
                  errors={visibleFieldErrors.organizationId}
                />
              ) : null}
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Schedule</FieldLegend>
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <ValidatedTextField
                id={`${mode}-start-date`}
                name="startDate"
                label="Start date"
                type="date"
                value={formValues.startDate}
                onChange={changeTextField}
                placeholder="YYYY-MM-DD"
                errors={visibleFieldErrors.startDate}
              />
              <FormSelectField
                id={`${mode}-deadline-mode`}
                name="deadlineMode"
                label="Deadline"
                value={formValues.deadlineMode}
                onValueChange={changeDeadlineMode}
                options={[
                  { value: "none", label: "No deadline" },
                  { value: "date", label: "Date only" },
                  { value: "datetime", label: "Date and time" },
                ]}
                errors={visibleFieldErrors.deadlineMode}
              />
              {formValues.deadlineMode !== "none" ? (
                <ValidatedTextField
                  id={`${mode}-due-date`}
                  name="dueDate"
                  label="Due date"
                  type="date"
                  value={formValues.dueDate}
                  onChange={changeTextField}
                  placeholder="YYYY-MM-DD"
                  required
                  errors={visibleFieldErrors.dueDate}
                />
              ) : null}
              {formValues.deadlineMode === "datetime" ? (
                <ValidatedTextField
                  id={`${mode}-due-time`}
                  name="dueTime"
                  label="Due time"
                  type="time"
                  value={formValues.dueTime}
                  onChange={changeTextField}
                  placeholder="HH:MM"
                  required
                  errors={visibleFieldErrors.dueTime}
                />
              ) : null}
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Details</FieldLegend>
            <FieldGroup>
              <Field data-invalid={Boolean(visibleFieldErrors.notes?.length)}>
                <FieldLabel htmlFor={`${mode}-task-notes`}>Notes</FieldLabel>
                <Textarea
                  id={`${mode}-task-notes`}
                  name="notes"
                  value={formValues.notes}
                  onChange={changeTextField}
                  maxLength={TASK_NOTES_MAX_LENGTH}
                  rows={3}
                  placeholder="Add reminders or details that do not belong in the description"
                  aria-invalid={Boolean(visibleFieldErrors.notes?.length)}
                />
                <TaskFieldError errors={visibleFieldErrors.notes} />
              </Field>
            </FieldGroup>
          </FieldSet>
        </FieldGroup>
      </ScrollArea>

      <DialogFooter className="mx-0 mb-0 shrink-0 px-4 py-3 sm:px-6">
        <Button type="button" variant="outline" onClick={closeDialog}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || !requestKey}>
          {isPending ? <Spinner data-icon="inline-start" /> : null}
          {isPending ? "Saving task" : getSubmitLabel(mode)}
        </Button>
      </DialogFooter>
    </form>
  );
}

function FormSelectField({
  id,
  name,
  label,
  value,
  options,
  onValueChange,
  errors,
  placeholder,
}: FormSelectFieldProps) {
  const invalid = Boolean(errors?.length);
  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        name={name}
        value={value}
        onValueChange={onValueChange}
        required
      >
        <SelectTrigger id={id} className="w-full" aria-invalid={invalid}>
          <SelectValue
            placeholder={placeholder ?? `Select ${label.toLowerCase()}`}
          />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectGroup>
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.color ? <WorkColorDot color={option.color} /> : null}
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <TaskFieldError errors={errors} />
    </Field>
  );
}

function ValidatedTextField({
  id,
  name,
  label,
  errors,
  ...inputProps
}: Omit<ComponentProps<typeof Input>, "id" | "name"> & {
  id: string;
  name: string;
  label: string;
  errors?: string[];
}) {
  const invalid = Boolean(errors?.length);

  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} name={name} aria-invalid={invalid} {...inputProps} />
      <TaskFieldError errors={errors} />
    </Field>
  );
}

function TaskFieldError({ errors }: { errors?: string[] }) {
  return errors?.length ? (
    <FieldError errors={errors.map((message) => ({ message }))} />
  ) : null;
}

function addEditedValidationFields(
  currentFields: ReadonlySet<string>,
  editedField: keyof TaskFormValues,
): ReadonlySet<string> {
  const nextFields = new Set(currentFields);
  const validationField = editedField.startsWith("newType")
    ? "newType"
    : editedField;

  nextFields.add(validationField);
  for (const dependentField of
    VALIDATION_FIELD_DEPENDENCIES[editedField] ?? []) {
    nextFields.add(dependentField);
  }

  return nextFields;
}

function createTaskFormDefaults({
  mode,
  options,
  task,
  parentTask,
}: Pick<
  TaskDialogProps,
  "mode" | "options" | "task" | "parentTask"
>): TaskFormDefaults {
  const inheritedTask = task ?? parentTask;
  const deadlineMode = task?.dueDate
    ? task.dueTime
      ? "datetime"
      : "date"
    : "none";

  return {
    title: task?.title ?? "",
    description: task?.description ?? "",
    notes: task?.notes ?? "",
    statusId:
      task?.status.id ??
      options.statuses.find((status) => status.slug === "to-do")?.id ??
      options.statuses[0]?.id ??
      "",
    taskTypeId:
      inheritedTask?.taskType.id ??
      options.taskTypes.find((taskType) => taskType.isActive)?.id ??
      NEW_TASK_TYPE_VALUE,
    priority: task?.priority ?? "medium",
    workCategory: inheritedTask?.workCategory ?? "general",
    courseId: inheritedTask?.course?.id ?? "",
    organizationId: inheritedTask?.organization?.id ?? "",
    parentTaskId:
      mode === "subtask"
        ? (parentTask?.id ?? "")
        : (task?.parentTaskId ?? ""),
    startDate: task?.startDate ?? "",
    deadlineMode,
    dueDate: task?.dueDate ?? "",
    dueTime: task?.dueTime ?? "",
  };
}

function createTaskFormValues(defaults: TaskFormDefaults): TaskFormValues {
  return {
    ...defaults,
    courseId: defaults.courseId || NO_SELECTION_VALUE,
    organizationId: defaults.organizationId || NO_SELECTION_VALUE,
    parentTaskId: defaults.parentTaskId || NO_SELECTION_VALUE,
    newTypeName: "",
    newTypeDescription: "",
    newTypeColor: "#737373",
    newTypeIcon: "briefcase",
  };
}

function getDialogTrigger({
  mode,
  task,
  parentTask,
  disabled,
}: TaskDialogProps) {
  if (mode === "edit" && task) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`Edit ${task.title}`}
      >
        <PencilIcon />
        <span className="sr-only">Edit {task.title}</span>
      </Button>
    );
  }

  if (mode === "subtask" && parentTask) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`Add subtask to ${parentTask.title}`}
      >
        <ListPlusIcon />
        <span className="sr-only">Add subtask to {parentTask.title}</span>
      </Button>
    );
  }

  return (
    <Button type="button" disabled={disabled}>
      <PlusIcon data-icon="inline-start" />
      Add Task
    </Button>
  );
}

function getDialogTitle(
  mode: TaskDialogMode,
  task?: WorkTaskItem,
  parentTask?: WorkTaskItem,
) {
  if (mode === "edit") {
    return `Edit ${task?.title ?? "task"}`;
  }

  if (mode === "subtask") {
    return `Add a subtask to ${parentTask?.title ?? "task"}`;
  }

  return "Add task";
}

function getDialogDescription(
  mode: TaskDialogMode,
  parentTask?: WorkTaskItem,
) {
  if (mode === "edit") {
    return "Update the task without leaving the Work page.";
  }

  if (mode === "subtask") {
    return `Context is inherited from ${parentTask?.title ?? "the parent"}; schedule and progress start independently.`;
  }

  return "Capture academic, organization, project, or personal work in one place.";
}

function getSubmitLabel(mode: TaskDialogMode) {
  if (mode === "edit") {
    return "Save changes";
  }

  if (mode === "subtask") {
    return "Add subtask";
  }

  return "Add task";
}
