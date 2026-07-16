"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useState,
  type ClipboardEvent,
  type ChangeEvent,
  type ComponentProps,
} from "react";
import {
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UserRoundPlusIcon,
} from "lucide-react";

import {
  createContactAction,
  updateContactAction,
} from "@/features/contacts/server/actions";
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
import {
  INITIAL_CONTACT_ACTION_STATE,
  type ContactFieldName,
  type SocialLinkFieldErrors,
} from "@/features/contacts/action-state";
import {
  CONTACT_AGE_MAX,
  CONTACT_NAME_MAX_LENGTH,
  CONTACT_NICKNAME_MAX_LENGTH,
  CONTACT_PHONE_MAX_LENGTH,
  CONTACT_SOCIAL_LINK_MAX_COUNT,
  CONTACT_SOCIAL_URL_MAX_LENGTH,
  SOCIAL_PLATFORM_DEFINITIONS,
  SOCIAL_PLATFORM_OPTIONS,
  isSocialPlatform,
  type SocialPlatform,
} from "@/features/contacts/constants";
import { calculateAge } from "@/features/contacts/age";
import { detectSocialPlatform } from "@/features/contacts/social-links";
import { SOCIAL_PLATFORM_ICONS } from "@/features/contacts/social-platform-icons";

type SocialMediaRow = {
  id: string;
  platform: SocialPlatform;
  value: string;
};

type SocialMediaRowUpdate = Partial<Pick<SocialMediaRow, "platform" | "value">>;

export type EditableContact = {
  id: string;
  name: string;
  nickname: string | null;
  age: number | null;
  birthday: string | null;
  phone: string | null;
  socialLinks: Array<{
    platform: SocialPlatform;
    url: string;
  }>;
};

type ValidatedInputFieldProps = Omit<
  ComponentProps<typeof Input>,
  "id" | "name"
> & {
  id: string;
  name: string;
  label: string;
  errors?: string[];
  fieldClassName?: string;
};

export function AddContactsDialog() {
  return <ContactDialog />;
}

export function EditContactDialog({ contact }: { contact: EditableContact }) {
  return <ContactDialog contact={contact} />;
}

function ContactDialog({ contact }: { contact?: EditableContact }) {
  const [open, setOpen] = useState(false);
  const closeDialog = useCallback(() => setOpen(false), []);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {contact ? (
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={`Edit ${contact.name}`}
          >
            <PencilIcon />
            <span className="sr-only">Edit {contact.name}</span>
          </Button>
        ) : (
          <Button type="button">
            <UserRoundPlusIcon data-icon="inline-start" />
            Add Contact
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        {open ? (
          <ContactForm contact={contact} closeDialog={closeDialog} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ContactForm({
  contact,
  closeDialog,
}: {
  contact?: EditableContact;
  closeDialog: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    contact ? updateContactAction : createContactAction,
    INITIAL_CONTACT_ACTION_STATE,
  );
  const [socialRows, setSocialRows] = useState<SocialMediaRow[]>(
    () => contact?.socialLinks.map(createSocialMediaRow) ?? [],
  );
  const [dismissedFieldErrors, setDismissedFieldErrors] = useState<
    Set<ContactFieldName>
  >(new Set());
  const [dismissedSocialRowErrors, setDismissedSocialRowErrors] = useState<
    Set<string>
  >(new Set());
  const [socialErrorsAreStale, setSocialErrorsAreStale] = useState(false);

  useEffect(() => {
    setDismissedFieldErrors(new Set());
    setDismissedSocialRowErrors(new Set());
    setSocialErrorsAreStale(false);
  }, [state]);

  useEffect(() => {
    if (state.status !== "success" || !state.submissionId) {
      return;
    }

    closeDialog();
  }, [closeDialog, state.status, state.submissionId]);

  const addSocialRow = useCallback(() => {
    setSocialRows((currentRows) => {
      if (currentRows.length >= CONTACT_SOCIAL_LINK_MAX_COUNT) {
        return currentRows;
      }

      return [...currentRows, createSocialMediaRow()];
    });
  }, []);

  const removeSocialRow = useCallback((rowId: string) => {
    setSocialErrorsAreStale(true);
    setSocialRows((currentRows) =>
      currentRows.filter((row) => row.id !== rowId),
    );
  }, []);

  const updateSocialRow = useCallback(
    (rowId: string, update: SocialMediaRowUpdate) => {
      setDismissedSocialRowErrors((dismissedRows) =>
        new Set(dismissedRows).add(rowId),
      );
      setSocialRows((currentRows) =>
        currentRows.map((row) =>
          row.id === rowId ? { ...row, ...update } : row,
        ),
      );
    },
    [],
  );

  const dismissFieldError = useCallback((fieldName: ContactFieldName) => {
    setDismissedFieldErrors((dismissedFields) =>
      new Set(dismissedFields).add(fieldName),
    );
  }, []);

  const handleBirthdayChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const calculatedAge = calculateAge(event.target.value);
      const ageInput = event.currentTarget.form?.elements.namedItem("age");

      if (ageInput instanceof HTMLInputElement) {
        ageInput.value = calculatedAge === null ? "" : String(calculatedAge);
      }

      dismissFieldError("age");
      dismissFieldError("birthday");
    },
    [dismissFieldError],
  );

  const detectRowPlatform = useCallback(
    (rowId: string, value: string) => {
      const detectedPlatform = detectSocialPlatform(value);

      if (detectedPlatform) {
        updateSocialRow(rowId, { platform: detectedPlatform });
      }
    },
    [updateSocialRow],
  );

  const hasReachedSocialLinkLimit =
    socialRows.length >= CONTACT_SOCIAL_LINK_MAX_COUNT;
  const socialGroupErrors = socialErrorsAreStale
    ? undefined
    : state.fieldErrors.socialLinks;
  const getFieldErrors = (fieldName: ContactFieldName) =>
    dismissedFieldErrors.has(fieldName)
      ? undefined
      : state.fieldErrors[fieldName];
  const hasValidationErrors =
    Object.values(state.fieldErrors).some(hasMessages) ||
    Object.values(state.socialLinkErrors).some(hasSocialLinkErrors);
  const hasVisibleFieldErrors = Object.entries(state.fieldErrors).some(
    ([fieldName, messages]) =>
      hasMessages(messages) &&
      (fieldName === "socialLinks"
        ? !socialErrorsAreStale
        : !dismissedFieldErrors.has(fieldName as ContactFieldName)),
  );
  const hasVisibleSocialLinkErrors =
    !socialErrorsAreStale &&
    Object.entries(state.socialLinkErrors).some(([rowIndex, errors]) => {
      const row = socialRows[Number(rowIndex)];

      return (
        row &&
        !dismissedSocialRowErrors.has(row.id) &&
        hasSocialLinkErrors(errors)
      );
    });
  const showActionError =
    state.status === "error" &&
    state.message &&
    (!hasValidationErrors ||
      hasVisibleFieldErrors ||
      hasVisibleSocialLinkErrors);

  return (
    <form
      action={formAction}
      className="flex min-h-0 flex-1 flex-col"
      noValidate
    >
      {contact ? (
        <input type="hidden" name="contactId" value={contact.id} />
      ) : null}
      <DialogHeader className="shrink-0 px-6 pt-6 pr-12 pb-4">
        <DialogTitle>{contact ? "Edit contact" : "Add contact"}</DialogTitle>
        <DialogDescription>
          {contact
            ? "Update contact details and social profiles."
            : `Save contact details and up to ${CONTACT_SOCIAL_LINK_MAX_COUNT} social profiles.`}
        </DialogDescription>
      </DialogHeader>

      {showActionError ? (
        <FieldError className="shrink-0 px-6 pb-4" aria-live="polite">
          {state.message}
        </FieldError>
      ) : null}

      <ScrollArea className="min-h-0 flex-1 px-6">
        <FieldGroup className="grid gap-4 p-1 pr-4 pb-5 sm:grid-cols-2">
          <ValidatedInputField
            id="contact-name"
            name="name"
            label="Name"
            placeholder="Enter full name"
            autoComplete="name"
            maxLength={CONTACT_NAME_MAX_LENGTH}
            required
            defaultValue={contact?.name}
            errors={getFieldErrors("name")}
            onChange={() => dismissFieldError("name")}
          />
          <ValidatedInputField
            id="contact-nickname"
            name="nickname"
            label="Nickname"
            placeholder="Enter nickname"
            autoComplete="off"
            maxLength={CONTACT_NICKNAME_MAX_LENGTH}
            defaultValue={contact?.nickname ?? undefined}
            errors={getFieldErrors("nickname")}
            onChange={() => dismissFieldError("nickname")}
          />
          <ValidatedInputField
            id="contact-age"
            name="age"
            label="Age"
            placeholder="Enter age"
            type="number"
            inputMode="numeric"
            min={0}
            max={CONTACT_AGE_MAX}
            defaultValue={contact?.age ?? undefined}
            errors={getFieldErrors("age")}
            onChange={() => dismissFieldError("age")}
          />
          <ValidatedInputField
            id="contact-birthday"
            name="birthday"
            label="Birthday"
            type="date"
            defaultValue={contact?.birthday ?? undefined}
            errors={getFieldErrors("birthday")}
            onChange={handleBirthdayChange}
          />
          <ValidatedInputField
            id="contact-phone"
            name="phone"
            label="Phone Number"
            placeholder="+63 912 345 6789"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={CONTACT_PHONE_MAX_LENGTH}
            defaultValue={contact?.phone ?? undefined}
            errors={getFieldErrors("phone")}
            onChange={() => dismissFieldError("phone")}
            fieldClassName="sm:col-span-2"
          />

          <FieldSet className="sm:col-span-2">
            <FieldLegend className="flex w-full items-center justify-between gap-3">
              <span>Social Media</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSocialRow}
                disabled={isPending || hasReachedSocialLinkLimit}
              >
                <PlusIcon data-icon="inline-start" />
                Add Link
              </Button>
            </FieldLegend>
            <FieldDescription>
              Paste a full profile URL, or choose a platform and enter only the
              username or path after the domain.
            </FieldDescription>
            <ValidationMessages
              id="contact-social-links-error"
              messages={socialGroupErrors}
            />

            {socialRows.length ? (
              <FieldGroup>
                {socialRows.map((row, index) => (
                  <SocialMediaFieldRow
                    key={row.id}
                    row={row}
                    index={index}
                    errors={
                      socialErrorsAreStale ||
                      dismissedSocialRowErrors.has(row.id)
                        ? undefined
                        : state.socialLinkErrors[String(index)]
                    }
                    disabled={isPending}
                    updateRow={updateSocialRow}
                    detectPlatform={detectRowPlatform}
                    removeRow={removeSocialRow}
                  />
                ))}
              </FieldGroup>
            ) : (
              <FieldDescription>No social links added.</FieldDescription>
            )}
          </FieldSet>
        </FieldGroup>
      </ScrollArea>

      <DialogFooter className="mx-0 mb-0 mt-4 shrink-0 rounded-none rounded-b-xl px-6 py-4">
        <Button
          type="button"
          variant="outline"
          onClick={closeDialog}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <UserRoundPlusIcon data-icon="inline-start" />
          )}
          {isPending
            ? contact
              ? "Saving Contact"
              : "Adding Contact"
            : contact
              ? "Save Contact"
              : "Add Contact"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function ValidatedInputField({
  id,
  name,
  label,
  errors,
  fieldClassName,
  ...inputProps
}: ValidatedInputFieldProps) {
  const errorId = `${id}-error`;
  const isInvalid = hasMessages(errors);

  return (
    <Field data-invalid={isInvalid} className={fieldClassName}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        {...inputProps}
        id={id}
        name={name}
        aria-invalid={isInvalid}
        aria-describedby={isInvalid ? errorId : undefined}
      />
      <ValidationMessages id={errorId} messages={errors} />
    </Field>
  );
}

type SocialMediaFieldRowProps = {
  row: SocialMediaRow;
  index: number;
  errors?: SocialLinkFieldErrors;
  disabled: boolean;
  updateRow: (rowId: string, update: SocialMediaRowUpdate) => void;
  detectPlatform: (rowId: string, value: string) => void;
  removeRow: (rowId: string) => void;
};

function SocialMediaFieldRow({
  row,
  index,
  errors,
  disabled,
  updateRow,
  detectPlatform,
  removeRow,
}: SocialMediaFieldRowProps) {
  const platformInputId = `social-platform-${row.id}`;
  const valueInputId = `social-value-${row.id}`;
  const platformErrorId = `${platformInputId}-error`;
  const valueErrorId = `${valueInputId}-error`;
  const platformInvalid = hasMessages(errors?.platform);
  const valueInvalid = hasMessages(errors?.value);
  const selectedPlatform = SOCIAL_PLATFORM_DEFINITIONS[row.platform];

  function handlePlatformChange(value: string) {
    if (isSocialPlatform(value)) {
      updateRow(row.id, { platform: value });
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    detectPlatform(row.id, event.clipboardData.getData("text"));
  }

  return (
    <FieldGroup className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[11rem_minmax(0,1fr)_auto]">
      <Field data-invalid={platformInvalid}>
        <FieldLabel htmlFor={platformInputId}>Platform</FieldLabel>
        <Select
          name="socialPlatform"
          value={row.platform}
          onValueChange={handlePlatformChange}
          disabled={disabled}
        >
          <SelectTrigger
            id={platformInputId}
            className="w-full"
            aria-invalid={platformInvalid}
            aria-describedby={platformInvalid ? platformErrorId : undefined}
          >
            <SelectValue placeholder="Select platform" />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectGroup>
              {SOCIAL_PLATFORM_OPTIONS.map((platform) => {
                const PlatformIcon = SOCIAL_PLATFORM_ICONS[platform.value];

                return (
                  <SelectItem key={platform.value} value={platform.value}>
                    <PlatformIcon />
                    <span>{platform.label}</span>
                  </SelectItem>
                );
              })}
            </SelectGroup>
          </SelectContent>
        </Select>
        <ValidationMessages id={platformErrorId} messages={errors?.platform} />
      </Field>

      <Field data-invalid={valueInvalid}>
        <FieldLabel htmlFor={valueInputId}>Profile Link or Username</FieldLabel>
        <Input
          id={valueInputId}
          name="socialValue"
          type="text"
          inputMode="url"
          value={row.value}
          placeholder={selectedPlatform.placeholder}
          maxLength={CONTACT_SOCIAL_URL_MAX_LENGTH}
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          aria-invalid={valueInvalid}
          aria-describedby={valueInvalid ? valueErrorId : undefined}
          onChange={(event) => updateRow(row.id, { value: event.target.value })}
          onPaste={handlePaste}
          onBlur={() => detectPlatform(row.id, row.value)}
        />
        <ValidationMessages id={valueErrorId} messages={errors?.value} />
      </Field>

      <Field className="w-auto self-end">
        <FieldLabel className="sr-only" htmlFor={`remove-social-${row.id}`}>
          Remove social link {index + 1}
        </FieldLabel>
        <Button
          id={`remove-social-${row.id}`}
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Remove social link ${index + 1}`}
          onClick={() => removeRow(row.id)}
          disabled={disabled}
        >
          <Trash2Icon />
        </Button>
      </Field>
    </FieldGroup>
  );
}

function ValidationMessages({
  id,
  messages,
}: {
  id: string;
  messages?: string[];
}) {
  return (
    <FieldError id={id} errors={messages?.map((message) => ({ message }))} />
  );
}

function hasMessages(messages: string[] | undefined) {
  return Boolean(messages?.length);
}

function hasSocialLinkErrors(errors: SocialLinkFieldErrors | undefined) {
  return hasMessages(errors?.platform) || hasMessages(errors?.value);
}

function createSocialMediaRow(
  socialLink?: Pick<EditableContact["socialLinks"][number], "platform" | "url">,
): SocialMediaRow {
  return {
    id: crypto.randomUUID(),
    platform: socialLink?.platform ?? "instagram",
    value: socialLink?.url ?? "",
  };
}
