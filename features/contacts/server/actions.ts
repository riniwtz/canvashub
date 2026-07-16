"use server";

import "server-only";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import type {
  ContactActionState,
  ContactDeleteActionState,
} from "@/features/contacts/action-state";
import {
  contactIdSchema,
  mapContactValidationErrors,
  validateContactFormData,
} from "@/features/contacts/validation";
import {
  ContactDataError,
  createContact,
  deleteContact,
  updateContact,
} from "@/features/contacts/server/data";

export async function createContactAction(
  _previousState: ContactActionState,
  formData: FormData,
): Promise<ContactActionState> {
  const validationResult = validateContactFormData(formData);

  if (!validationResult.success) {
    const errors = mapContactValidationErrors(validationResult.error);

    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      ...errors,
    };
  }

  try {
    await createContact(validationResult.data);
  } catch (error) {
    console.error("Unable to create contact.", error);

    return {
      status: "error",
      message:
        "The contact could not be saved. Check the database connection and try again.",
      fieldErrors: {},
      socialLinkErrors: {},
    };
  }

  revalidatePath("/contacts");

  return createContactSuccessState("Contact added.");
}

export async function updateContactAction(
  _previousState: ContactActionState,
  formData: FormData,
): Promise<ContactActionState> {
  const contactIdResult = contactIdSchema.safeParse(formData.get("contactId"));

  if (!contactIdResult.success) {
    return createContactErrorState("This contact no longer exists.");
  }

  const validationResult = validateContactFormData(formData);

  if (!validationResult.success) {
    const errors = mapContactValidationErrors(validationResult.error);

    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      ...errors,
    };
  }

  try {
    await updateContact(contactIdResult.data, validationResult.data);
  } catch (error) {
    if (error instanceof ContactDataError && error.code === "not_found") {
      return createContactErrorState("This contact no longer exists.");
    }

    console.error("Unable to update contact.", error);

    return createContactErrorState(
      "The contact could not be updated. Check the database connection and try again.",
    );
  }

  revalidatePath("/contacts");

  return createContactSuccessState("Contact updated.");
}

export async function deleteContactAction(
  _previousState: ContactDeleteActionState,
  formData: FormData,
): Promise<ContactDeleteActionState> {
  const contactIdResult = contactIdSchema.safeParse(formData.get("contactId"));

  if (!contactIdResult.success) {
    return createDeleteContactErrorState("This contact no longer exists.");
  }

  try {
    await deleteContact(contactIdResult.data);
  } catch (error) {
    if (error instanceof ContactDataError && error.code === "not_found") {
      return createDeleteContactErrorState("This contact no longer exists.");
    }

    console.error("Unable to delete contact.", error);

    return createDeleteContactErrorState(
      "The contact could not be deleted. Check the database connection and try again.",
    );
  }

  revalidatePath("/contacts");

  return {
    status: "success",
    message: "Contact deleted.",
    submissionId: randomUUID(),
  };
}

function createContactSuccessState(message: string): ContactActionState {
  return {
    status: "success",
    message,
    fieldErrors: {},
    socialLinkErrors: {},
    submissionId: randomUUID(),
  };
}

function createContactErrorState(message: string): ContactActionState {
  return {
    status: "error",
    message,
    fieldErrors: {},
    socialLinkErrors: {},
  };
}

function createDeleteContactErrorState(
  message: string,
): ContactDeleteActionState {
  return {
    status: "error",
    message,
  };
}
