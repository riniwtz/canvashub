import { z } from "zod";

import {
  ACCOUNT_EMAIL_MAX_LENGTH,
  ACCOUNT_NAME_MAX_LENGTH,
  ACCOUNT_NAME_MIN_LENGTH,
  ACCOUNT_NOTES_MAX_LENGTH,
  ACCOUNT_NOTES_MIN_LENGTH,
  ACCOUNT_PASSWORD_MAX_LENGTH,
  ACCOUNT_PASSWORD_MIN_LENGTH,
  ENCRYPTION_PASSPHRASE_MAX_LENGTH,
  ENCRYPTION_PASSPHRASE_MIN_LENGTH,
  TRACKED_ACCOUNT_STATUSES,
} from "@/features/accounts/constants";

function emptyStringToUndefined(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length ? trimmedValue : undefined;
}

const optionalNotesSchema = z
  .preprocess(
    emptyStringToUndefined,
    z
      .string()
      .min(
        ACCOUNT_NOTES_MIN_LENGTH,
        `Notes must be at least ${ACCOUNT_NOTES_MIN_LENGTH} characters.`,
      )
      .max(
        ACCOUNT_NOTES_MAX_LENGTH,
        `Notes must be at most ${ACCOUNT_NOTES_MAX_LENGTH} characters.`,
      )
      .optional(),
  )
  .transform((value) => value ?? null);

const optionalContactIdSchema = z
  .preprocess(
    emptyStringToUndefined,
    z
      .uuid({ error: "Choose a valid contact." })
      .optional(),
  )
  .transform((value) => value ?? null);

export const trackedAccountInputSchema = z
  .object({
    accountName: z
      .string({ error: "Enter an account name." })
      .trim()
      .min(
        ACCOUNT_NAME_MIN_LENGTH,
        `Account name must be at least ${ACCOUNT_NAME_MIN_LENGTH} characters.`,
      )
      .max(
        ACCOUNT_NAME_MAX_LENGTH,
        `Account name must be at most ${ACCOUNT_NAME_MAX_LENGTH} characters.`,
      ),
    email: z
      .string({ error: "Enter an email address." })
      .trim()
      .max(
        ACCOUNT_EMAIL_MAX_LENGTH,
        `Email must be at most ${ACCOUNT_EMAIL_MAX_LENGTH} characters.`,
      )
      .pipe(z.email({ error: "Enter a valid email address." })),
    password: z
      .string({ error: "Enter the account password." })
      .min(ACCOUNT_PASSWORD_MIN_LENGTH, "Enter the account password.")
      .max(
        ACCOUNT_PASSWORD_MAX_LENGTH,
        `Password must be at most ${ACCOUNT_PASSWORD_MAX_LENGTH} characters.`,
      ),
    passphrase: z
      .string({ error: "Enter an encryption passphrase." })
      .min(
        ENCRYPTION_PASSPHRASE_MIN_LENGTH,
        `Passphrase must be at least ${ENCRYPTION_PASSPHRASE_MIN_LENGTH} characters.`,
      )
      .max(
        ENCRYPTION_PASSPHRASE_MAX_LENGTH,
        `Passphrase must be at most ${ENCRYPTION_PASSPHRASE_MAX_LENGTH} characters.`,
      )
      .refine(
        (value) => value.length === 0 || /\S/u.test(value),
        "Passphrase cannot contain only spaces.",
      ),
    notes: optionalNotesSchema,
    accountByContactId: optionalContactIdSchema,
    status: z.enum(TRACKED_ACCOUNT_STATUSES, {
      error: "Choose a valid account status.",
    }),
  })
  .strict();

export type TrackedAccountInput = z.infer<
  typeof trackedAccountInputSchema
>;
