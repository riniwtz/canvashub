"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { Trash2Icon } from "lucide-react";

import { deleteContactAction } from "@/features/contacts/server/actions";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { INITIAL_CONTACT_DELETE_ACTION_STATE } from "@/features/contacts/action-state";

type DeleteContactDialogProps = {
  contactId: string;
  contactName: string;
};

export function DeleteContactDialog({
  contactId,
  contactName,
}: DeleteContactDialogProps) {
  const [open, setOpen] = useState(false);
  const closeDialog = useCallback(() => setOpen(false), []);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete ${contactName}`}
        >
          <Trash2Icon />
          <span className="sr-only">Delete {contactName}</span>
        </Button>
      </AlertDialogTrigger>
      {open ? (
        <DeleteContactForm
          contactId={contactId}
          contactName={contactName}
          closeDialog={closeDialog}
        />
      ) : null}
    </AlertDialog>
  );
}

function DeleteContactForm({
  contactId,
  contactName,
  closeDialog,
}: DeleteContactDialogProps & { closeDialog: () => void }) {
  const [state, formAction, isPending] = useActionState(
    deleteContactAction,
    INITIAL_CONTACT_DELETE_ACTION_STATE,
  );

  useEffect(() => {
    if (state.status === "success" && state.submissionId) {
      closeDialog();
    }
  }, [closeDialog, state.status, state.submissionId]);

  return (
    <AlertDialogContent size="sm">
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="contactId" value={contactId} />
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2Icon />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete {contactName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the contact and all of their social links.
            Accounts assigned to this contact will remain, but no longer have
            an owner.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {state.status === "error" && state.message ? (
          <FieldError aria-live="polite">{state.message}</FieldError>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel type="button" disabled={isPending}>
            Cancel
          </AlertDialogCancel>
          <Button type="submit" variant="destructive" disabled={isPending}>
            {isPending ? <Spinner data-icon="inline-start" /> : null}
            {isPending ? "Deleting Contact" : "Delete Contact"}
          </Button>
        </AlertDialogFooter>
      </form>
    </AlertDialogContent>
  );
}
