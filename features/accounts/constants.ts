export const TRACKED_ACCOUNT_STATUSES = [
  "active",
  "paused",
  "archived",
  "inactive",
] as const;

export const TRACKED_ACCOUNT_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "archived", label: "Archived" },
  { value: "inactive", label: "Inactive" },
] as const;

export const ACCOUNT_NAME_MIN_LENGTH = 2;
export const ACCOUNT_NAME_MAX_LENGTH = 100;
export const ACCOUNT_EMAIL_MAX_LENGTH = 254;
export const ACCOUNT_PASSWORD_MIN_LENGTH = 1;
export const ACCOUNT_PASSWORD_MAX_LENGTH = 4096;
export const ENCRYPTION_PASSPHRASE_MIN_LENGTH = 15;
export const ENCRYPTION_PASSPHRASE_MAX_LENGTH = 256;
export const ACCOUNT_NOTES_MIN_LENGTH = 3;
export const ACCOUNT_NOTES_MAX_LENGTH = 2000;

export type TrackedAccountStatus =
  (typeof TRACKED_ACCOUNT_STATUSES)[number];
