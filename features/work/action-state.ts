export type WorkTaskFieldErrors = Partial<Record<string, string[]>>;

export type WorkTaskActionState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors: WorkTaskFieldErrors;
  submissionId?: string;
};

export type WorkTaskFormAction = (
  previousState: WorkTaskActionState,
  formData: FormData,
) => Promise<WorkTaskActionState>;

type VisibleFieldErrorsInput = {
  fieldErrors: WorkTaskFieldErrors;
  editedFields: ReadonlySet<string>;
  isPending: boolean;
};

export function getVisibleWorkTaskFieldErrors({
  fieldErrors,
  editedFields,
  isPending,
}: VisibleFieldErrorsInput): WorkTaskFieldErrors {
  if (isPending) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(fieldErrors).filter(
      ([fieldName]) => !editedFields.has(fieldName),
    ),
  );
}

export const INITIAL_WORK_TASK_ACTION_STATE: WorkTaskActionState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};
