import assert from "node:assert/strict";
import test from "node:test";

import {
  ACCOUNT_NOTES_MAX_LENGTH,
  ENCRYPTION_PASSPHRASE_MIN_LENGTH,
} from "@/features/accounts/constants";
import { trackedAccountInputSchema } from "@/features/accounts/validation";

const validAccountInput = {
  accountName: "DLSU Gmail",
  email: "student@example.com",
  password: "password",
  passphrase: "a memorable encryption passphrase",
  notes: "Recovery email is on file.",
  accountByContactId: "",
  status: "active",
};

test("blank optional account fields become null", () => {
  const result = trackedAccountInputSchema.safeParse({
    ...validAccountInput,
    notes: "",
  });

  assert.equal(result.success, true);
  assert.deepEqual(
    result.success
      ? {
          notes: result.data.notes,
          accountByContactId: result.data.accountByContactId,
        }
      : null,
    { notes: null, accountByContactId: null },
  );
});

test("invalid account emails are rejected", () => {
  const result = trackedAccountInputSchema.safeParse({
    ...validAccountInput,
    email: "not-an-email",
  });

  assert.equal(result.success, false);
});

test("short encryption passphrases are rejected", () => {
  const result = trackedAccountInputSchema.safeParse({
    ...validAccountInput,
    passphrase: "x".repeat(ENCRYPTION_PASSPHRASE_MIN_LENGTH - 1),
  });

  assert.equal(result.success, false);
});

test("overlong notes are rejected", () => {
  const result = trackedAccountInputSchema.safeParse({
    ...validAccountInput,
    notes: "x".repeat(ACCOUNT_NOTES_MAX_LENGTH + 1),
  });

  assert.equal(result.success, false);
});
