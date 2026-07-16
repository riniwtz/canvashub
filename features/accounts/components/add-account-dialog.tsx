"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  ChevronsUpDownIcon,
  KeyRoundIcon,
  PlusIcon,
  UserRoundIcon,
} from "lucide-react";

import { createTrackedAccountAction } from "@/features/accounts/server/actions";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogClose,
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
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { Textarea } from "@/components/ui/textarea";
import {
  INITIAL_ACCOUNT_ACTION_STATE,
  type AccountFieldErrors,
  type AccountFieldName,
} from "@/features/accounts/action-state";
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
  TRACKED_ACCOUNT_STATUS_OPTIONS,
} from "@/features/accounts/constants";

export type AccountContactOption = {
  id: string;
  name: string;
  nickname: string | null;
};

type AddAccountDialogProps = {
  contacts: AccountContactOption[];
};

type ContactPickerSelection = {
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
};

type ContactPickerProps = {
  contacts: AccountContactOption[];
  selection: ContactPickerSelection;
};

function toFieldErrors(errors: string[] | undefined) {
  return errors?.map((message) => ({ message }));
}

function getContactLabel(contact: AccountContactOption) {
  return contact.nickname
    ? `${contact.name} (${contact.nickname})`
    : contact.name;
}

function ContactPicker({ contacts, selection }: ContactPickerProps) {
  const [open, setOpen] = useState(false);
  const selectedContact = contacts.find(
    (contact) => contact.id === selection.value,
  );

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          id="account-by-contact"
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={selection.invalid}
          className="w-full justify-between"
        >
          <span className="truncate">
            {selectedContact
              ? getContactLabel(selectedContact)
              : "Choose a contact"}
          </span>
          <ChevronsUpDownIcon data-icon="inline-end" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
      >
        <Command>
          <CommandInput placeholder="Search contacts..." />
          <CommandList className="max-h-56">
            <CommandEmpty>No contacts found.</CommandEmpty>
            <CommandGroup heading="Contacts">
              <CommandItem
                value="No contact unassigned"
                data-checked={!selection.value}
                onSelect={() => {
                  selection.onChange("");
                  setOpen(false);
                }}
              >
                <UserRoundIcon />
                No contact
              </CommandItem>
              {contacts.map((contact) => (
                <CommandItem
                  key={contact.id}
                  value={`${contact.name} ${contact.nickname ?? ""} ${contact.id}`}
                  data-checked={selection.value === contact.id}
                  onSelect={() => {
                    selection.onChange(contact.id);
                    setOpen(false);
                  }}
                >
                  <UserRoundIcon />
                  <span className="truncate">
                    {getContactLabel(contact)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function AccountForm({
  contacts,
  onSaved,
}: AddAccountDialogProps & { onSaved: () => void }) {
  const [state, formAction, pending] = useActionState(
    createTrackedAccountAction,
    INITIAL_ACCOUNT_ACTION_STATE,
  );
  const [accountByContactId, setAccountByContactId] = useState("");
  const [dismissedFieldErrors, setDismissedFieldErrors] = useState<
    Set<AccountFieldName>
  >(new Set());
  const fieldErrors: AccountFieldErrors = state.fieldErrors;

  useEffect(() => {
    setDismissedFieldErrors(new Set());

    if (state.status === "success") {
      onSaved();
    }
  }, [onSaved, state]);

  const dismissFieldError = useCallback((fieldName: AccountFieldName) => {
    setDismissedFieldErrors((dismissedFields) =>
      new Set(dismissedFields).add(fieldName),
    );
  }, []);
  const getFieldErrors = (fieldName: AccountFieldName) =>
    dismissedFieldErrors.has(fieldName) ? undefined : fieldErrors[fieldName];
  const accountNameErrors = getFieldErrors("accountName");
  const emailErrors = getFieldErrors("email");
  const passwordErrors = getFieldErrors("password");
  const passphraseErrors = getFieldErrors("passphrase");
  const accountByErrors = getFieldErrors("accountByContactId");
  const statusErrors = getFieldErrors("status");
  const notesErrors = getFieldErrors("notes");
  const hasValidationErrors = Object.values(fieldErrors).some(
    (errors) => errors?.length,
  );
  const hasVisibleValidationErrors = [
    accountNameErrors,
    emailErrors,
    passwordErrors,
    passphraseErrors,
    accountByErrors,
    statusErrors,
    notesErrors,
  ].some((errors) => errors?.length);
  const showActionError =
    state.status === "error" &&
    state.message &&
    (!hasValidationErrors || hasVisibleValidationErrors);

  return (
    <form action={formAction} className="flex min-h-0 flex-col">
      <input
        type="hidden"
        name="accountByContactId"
        value={accountByContactId}
      />
      <ScrollArea className="h-[min(65dvh,34rem)]">
        <FieldGroup className="grid grid-cols-1 gap-4 p-4 pt-1 sm:grid-cols-2">
          {showActionError ? (
            <FieldError
              className="sm:col-span-2"
              aria-live="polite"
            >
              {state.message}
            </FieldError>
          ) : null}

          <Field data-invalid={Boolean(accountNameErrors)}>
            <FieldLabel htmlFor="account-name">Account name</FieldLabel>
            <Input
              id="account-name"
              name="accountName"
              placeholder="e.g. DLSU Gmail"
              minLength={ACCOUNT_NAME_MIN_LENGTH}
              maxLength={ACCOUNT_NAME_MAX_LENGTH}
              required
              aria-invalid={Boolean(accountNameErrors)}
              onChange={() => dismissFieldError("accountName")}
            />
            <FieldError errors={toFieldErrors(accountNameErrors)} />
          </Field>

          <Field data-invalid={Boolean(emailErrors)}>
            <FieldLabel htmlFor="account-email">Email</FieldLabel>
            <Input
              id="account-email"
              name="email"
              type="email"
              placeholder="name@example.com"
              maxLength={ACCOUNT_EMAIL_MAX_LENGTH}
              required
              aria-invalid={Boolean(emailErrors)}
              onChange={() => dismissFieldError("email")}
            />
            <FieldError errors={toFieldErrors(emailErrors)} />
          </Field>

          <Field data-invalid={Boolean(passwordErrors)}>
            <FieldLabel htmlFor="account-password">Password</FieldLabel>
            <Input
              id="account-password"
              name="password"
              type="password"
              autoComplete="off"
              minLength={ACCOUNT_PASSWORD_MIN_LENGTH}
              maxLength={ACCOUNT_PASSWORD_MAX_LENGTH}
              required
              aria-invalid={Boolean(passwordErrors)}
              onChange={() => dismissFieldError("password")}
            />
            <FieldDescription>
              Stored only as authenticated ciphertext.
            </FieldDescription>
            <FieldError errors={toFieldErrors(passwordErrors)} />
          </Field>

          <Field data-invalid={Boolean(passphraseErrors)}>
            <FieldLabel htmlFor="account-passphrase">
              Encryption passphrase
            </FieldLabel>
            <Input
              id="account-passphrase"
              name="passphrase"
              type="password"
              autoComplete="new-password"
              minLength={ENCRYPTION_PASSPHRASE_MIN_LENGTH}
              maxLength={ENCRYPTION_PASSPHRASE_MAX_LENGTH}
              required
              aria-invalid={Boolean(passphraseErrors)}
              onChange={() => dismissFieldError("passphrase")}
            />
            <FieldDescription>
              Never stored or recoverable. You will need it to decrypt this
              password.
            </FieldDescription>
            <FieldError errors={toFieldErrors(passphraseErrors)} />
          </Field>

          <Field data-invalid={Boolean(accountByErrors)}>
            <FieldLabel htmlFor="account-by-contact">Account by</FieldLabel>
            <ContactPicker
              contacts={contacts}
              selection={{
                value: accountByContactId,
                invalid: Boolean(accountByErrors),
                onChange: (contactId) => {
                  setAccountByContactId(contactId);
                  dismissFieldError("accountByContactId");
                },
              }}
            />
            <FieldDescription>
              Assign this account to someone in Contacts.
            </FieldDescription>
            <FieldError
              errors={toFieldErrors(accountByErrors)}
            />
          </Field>

          <Field data-invalid={Boolean(statusErrors)}>
            <FieldLabel htmlFor="account-status">Status</FieldLabel>
            <Select
              name="status"
              defaultValue="active"
              onValueChange={() => dismissFieldError("status")}
            >
              <SelectTrigger
                id="account-status"
                className="w-full"
                aria-invalid={Boolean(statusErrors)}
              >
                <SelectValue placeholder="Choose a status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {TRACKED_ACCOUNT_STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldError errors={toFieldErrors(statusErrors)} />
          </Field>

          <Field
            className="sm:col-span-2"
            data-invalid={Boolean(notesErrors)}
          >
            <FieldLabel htmlFor="account-notes">Notes</FieldLabel>
            <Textarea
              id="account-notes"
              name="notes"
              placeholder="Recovery details, usage notes, or reminders"
              minLength={ACCOUNT_NOTES_MIN_LENGTH}
              maxLength={ACCOUNT_NOTES_MAX_LENGTH}
              rows={4}
              aria-invalid={Boolean(notesErrors)}
              onChange={() => dismissFieldError("notes")}
            />
            <FieldDescription>
              Optional, {ACCOUNT_NOTES_MIN_LENGTH}–
              {ACCOUNT_NOTES_MAX_LENGTH} characters when provided.
            </FieldDescription>
            <FieldError errors={toFieldErrors(notesErrors)} />
          </Field>
        </FieldGroup>
      </ScrollArea>

      <DialogFooter className="m-0 shrink-0 rounded-none">
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={pending}>
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <KeyRoundIcon data-icon="inline-start" />
          )}
          {pending ? "Encrypting..." : "Add account"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function AddAccountDialog({ contacts }: AddAccountDialogProps) {
  const [open, setOpen] = useState(false);
  const handleSaved = useCallback(() => setOpen(false), []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">
          <PlusIcon data-icon="inline-start" />
          Add account
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="p-4 pb-3">
          <DialogTitle>Add account</DialogTitle>
          <DialogDescription>
            Save an account and encrypt its password with a passphrase only
            you know.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <AccountForm contacts={contacts} onSaved={handleSaved} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
