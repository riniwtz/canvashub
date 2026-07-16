export type ContactFieldName =
  | "name"
  | "nickname"
  | "age"
  | "birthday"
  | "phone"
  | "socialLinks";

export type ContactFieldErrors = Partial<Record<ContactFieldName, string[]>>;

export type SocialLinkFieldErrors = {
  platform?: string[];
  value?: string[];
};

export type ContactActionState = {
  status: "idle" | "error" | "success";
  message: string | null;
  fieldErrors: ContactFieldErrors;
  socialLinkErrors: Record<string, SocialLinkFieldErrors>;
  submissionId?: string;
};

export const INITIAL_CONTACT_ACTION_STATE: ContactActionState = {
  status: "idle",
  message: null,
  fieldErrors: {},
  socialLinkErrors: {},
};

export type ContactDeleteActionState = {
  status: "idle" | "error" | "success";
  message: string | null;
  submissionId?: string;
};

export const INITIAL_CONTACT_DELETE_ACTION_STATE: ContactDeleteActionState = {
  status: "idle",
  message: null,
};
