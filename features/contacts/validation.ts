import { z } from "zod";

import type {
  ContactFieldErrors,
  ContactFieldName,
  SocialLinkFieldErrors,
} from "@/features/contacts/action-state";
import {
  CONTACT_AGE_MAX,
  CONTACT_NAME_MAX_LENGTH,
  CONTACT_NICKNAME_MAX_LENGTH,
  CONTACT_PHONE_MAX_LENGTH,
  CONTACT_PHONE_MIN_DIGITS,
  CONTACT_SOCIAL_LINK_MAX_COUNT,
  CONTACT_SOCIAL_URL_MAX_LENGTH,
  SOCIAL_PLATFORM_VALUES,
} from "@/features/contacts/constants";
import { calculateAge, getCurrentManilaDate } from "@/features/contacts/age";
import { normalizeSocialLink } from "@/features/contacts/social-links";

const PHONE_CHARACTER_PATTERN = /^\+?[\d\s().-]+$/;
const INACCURATE_AGE_ERROR = "Age is not accurate for the selected birthday.";

const contactNameSchema = z.preprocess(
  trimString,
  z
    .string({ error: "Name is required." })
    .min(1, "Name is required.")
    .max(
      CONTACT_NAME_MAX_LENGTH,
      `Name must be ${CONTACT_NAME_MAX_LENGTH} characters or fewer.`,
    ),
);

const contactNicknameSchema = optionalTrimmedString(
  CONTACT_NICKNAME_MAX_LENGTH,
  `Nickname must be ${CONTACT_NICKNAME_MAX_LENGTH} characters or fewer.`,
);

const contactAgeSchema = z.preprocess(
  emptyValueToUndefined,
  z.coerce
    .number({ error: "Age must be a number." })
    .int("Age must be a whole number.")
    .min(0, "Age cannot be negative.")
    .max(CONTACT_AGE_MAX, `Age must be ${CONTACT_AGE_MAX} or younger.`)
    .optional(),
);

const contactBirthdaySchema = z.preprocess(
  emptyValueToUndefined,
  z
    .iso
    .date({ error: "Enter a valid birthday." })
    .refine(isCurrentOrPastDate, "Birthday cannot be in the future.")
    .optional(),
);

const contactPhoneSchema = optionalTrimmedString(
  CONTACT_PHONE_MAX_LENGTH,
  `Phone number must be ${CONTACT_PHONE_MAX_LENGTH} characters or fewer.`,
)
  .refine(
    (phone) => phone === undefined || PHONE_CHARACTER_PATTERN.test(phone),
    "Use only digits, spaces, parentheses, periods, hyphens, and an optional leading +.",
  )
  .refine(
    (phone) =>
      phone === undefined || countDigits(phone) >= CONTACT_PHONE_MIN_DIGITS,
    `Phone number must contain at least ${CONTACT_PHONE_MIN_DIGITS} digits.`,
  );

const socialLinkInputSchema = z
  .object({
    platform: z.enum(SOCIAL_PLATFORM_VALUES, {
      error: "Select a social media platform.",
    }),
    value: z
      .string({ error: "Enter a profile link or username." })
      .trim()
      .min(1, "Enter a profile link or username.")
      .max(
        CONTACT_SOCIAL_URL_MAX_LENGTH,
        `Social links must be ${CONTACT_SOCIAL_URL_MAX_LENGTH} characters or fewer.`,
      ),
  })
  .transform((socialLink, context) => {
    const result = normalizeSocialLink(socialLink);

    if (!result.success) {
      context.addIssue({
        code: "custom",
        path: ["value"],
        message: result.message,
      });
      return z.NEVER;
    }

    return result.data;
  });

export const contactIdSchema = z
  .string({ error: "Contact not found." })
  .uuid("Contact not found.");

export const contactInputSchema = z
  .object({
    name: contactNameSchema,
    nickname: contactNicknameSchema,
    age: contactAgeSchema,
    birthday: contactBirthdaySchema,
    phone: contactPhoneSchema,
    socialLinks: z
      .array(socialLinkInputSchema)
      .max(
        CONTACT_SOCIAL_LINK_MAX_COUNT,
        `Add no more than ${CONTACT_SOCIAL_LINK_MAX_COUNT} social links.`,
      ),
  })
  .strict()
  .superRefine((contact, context) => {
    if (!contact.birthday) {
      return;
    }

    const calculatedAge = calculateAge(contact.birthday);

    if (calculatedAge === null || contact.age === calculatedAge) {
      return;
    }

    context.addIssue({
      code: "custom",
      path: ["age"],
      message: INACCURATE_AGE_ERROR,
    });
  });

export type ValidatedContactInput = z.output<typeof contactInputSchema>;

export type ContactValidationErrors = {
  fieldErrors: ContactFieldErrors;
  socialLinkErrors: Record<string, SocialLinkFieldErrors>;
};

export function validateContactFormData(formData: FormData) {
  const platforms = formData.getAll("socialPlatform");
  const socialValues = formData.getAll("socialValue");
  const socialLinkCount = Math.max(platforms.length, socialValues.length);

  return contactInputSchema.safeParse({
    name: formData.get("name"),
    nickname: formData.get("nickname"),
    age: formData.get("age"),
    birthday: formData.get("birthday"),
    phone: formData.get("phone"),
    socialLinks: Array.from({ length: socialLinkCount }, (_, index) => ({
      platform: platforms[index],
      value: socialValues[index],
    })),
  });
}

export function mapContactValidationErrors(
  error: z.ZodError,
): ContactValidationErrors {
  const fieldErrors: ContactFieldErrors = {};
  const socialLinkErrors: Record<string, SocialLinkFieldErrors> = {};

  for (const issue of error.issues) {
    const [rootField, rowIndex, nestedField] = issue.path;

    if (
      rootField === "socialLinks" &&
      typeof rowIndex === "number" &&
      (nestedField === "platform" || nestedField === "value")
    ) {
      const rowKey = String(rowIndex);
      const rowErrors = socialLinkErrors[rowKey] ?? {};
      const currentMessages = rowErrors[nestedField] ?? [];
      socialLinkErrors[rowKey] = {
        ...rowErrors,
        [nestedField]: [...currentMessages, issue.message],
      };
      continue;
    }

    if (isContactFieldName(rootField)) {
      fieldErrors[rootField] = [
        ...(fieldErrors[rootField] ?? []),
        issue.message,
      ];
    }
  }

  return { fieldErrors, socialLinkErrors };
}

function optionalTrimmedString(maxLength: number, errorMessage: string) {
  return z.preprocess(
    emptyValueToUndefined,
    z.string().trim().max(maxLength, errorMessage).optional(),
  );
}

function emptyValueToUndefined(value: unknown) {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "string" && !value.trim()) {
    return undefined;
  }

  return value;
}

function trimString(value: unknown) {
  return typeof value === "string" ? value.trim() : value;
}

function countDigits(value: string) {
  return value.replace(/\D/g, "").length;
}

function isCurrentOrPastDate(value: string) {
  return value <= getCurrentManilaDate();
}

function isContactFieldName(value: PropertyKey): value is ContactFieldName {
  return (
    value === "name" ||
    value === "nickname" ||
    value === "age" ||
    value === "birthday" ||
    value === "phone" ||
    value === "socialLinks"
  );
}
