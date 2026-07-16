"use server";

import "server-only";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import type {
  AccountActionState,
  AccountFieldErrors,
} from "@/features/accounts/action-state";
import { trackedAccountInputSchema } from "@/features/accounts/validation";
import {
  AccountDataError,
  createTrackedAccount,
} from "@/features/accounts/server/data";

export async function createTrackedAccountAction(
  _previousState: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const validationResult = trackedAccountInputSchema.safeParse({
    accountName: formData.get("accountName"),
    email: formData.get("email"),
    password: formData.get("password"),
    passphrase: formData.get("passphrase"),
    notes: formData.get("notes"),
    accountByContactId: formData.get("accountByContactId"),
    status: formData.get("status"),
  });

  if (!validationResult.success) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      fieldErrors: validationResult.error.flatten()
        .fieldErrors as AccountFieldErrors,
    };
  }

  try {
    await createTrackedAccount(validationResult.data);
  } catch (error) {
    if (
      error instanceof AccountDataError &&
      error.code === "contact_not_found"
    ) {
      return {
        status: "error",
        message: "Choose a contact that still exists.",
        fieldErrors: {
          accountByContactId: ["Choose a contact that still exists."],
        },
      };
    }

    console.error("Unable to create tracked account.", error);

    return {
      status: "error",
      message:
        "The account could not be saved. Check the database connection and try again.",
      fieldErrors: {},
    };
  }

  revalidatePath("/accounts");

  return {
    status: "success",
    message: "Account added.",
    fieldErrors: {},
    submissionId: randomUUID(),
  };
}
