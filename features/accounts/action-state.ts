export type AccountFieldName =
  | "accountName"
  | "email"
  | "password"
  | "passphrase"
  | "notes"
  | "accountByContactId"
  | "status";

export type AccountFieldErrors = Partial<
  Record<AccountFieldName, string[]>
>;

export type AccountActionState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors: AccountFieldErrors;
  submissionId?: string;
};

export const INITIAL_ACCOUNT_ACTION_STATE: AccountActionState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};
