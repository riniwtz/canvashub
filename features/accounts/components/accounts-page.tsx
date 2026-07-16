import { LockKeyholeIcon } from "lucide-react";

import { AddAccountDialog } from "@/features/accounts/components/add-account-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TrackedAccountStatus } from "@/features/accounts/constants";
import {
  getAccountContactOptions,
  getTrackedAccounts,
} from "@/features/accounts/server/data";
import {
  EMPTY_CELL_PLACEHOLDER,
  formatDateTime,
  formatOptionalText,
} from "@/lib/formatters";

const STATUS_BADGE_VARIANTS = {
  active: "default",
  paused: "secondary",
  archived: "outline",
  inactive: "secondary",
} as const satisfies Record<
  TrackedAccountStatus,
  "default" | "secondary" | "outline"
>;

function formatStatus(status: TrackedAccountStatus) {
  return `${status.charAt(0).toUpperCase()}${status.slice(1)}`;
}

export default async function AccountsPage() {
  const [{ accounts, databaseAvailable }, contacts] = await Promise.all([
    getTrackedAccounts(),
    getAccountContactOptions(),
  ]);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-normal">Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Track account ownership and encrypted credentials.
          </p>
        </div>
        <AddAccountDialog contacts={contacts} />
      </div>

      {!databaseAvailable ? (
        <p className="text-sm text-destructive" role="alert">
          Accounts are unavailable. Check the PostgreSQL connection and apply
          the latest Drizzle schema.
        </p>
      ) : null}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Password</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Last Added</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Account By</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.length ? (
              accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">
                    {account.accountName}
                  </TableCell>
                  <TableCell>
                    <a
                      href={`mailto:${account.email}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {account.email}
                    </a>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      <LockKeyholeIcon data-icon="inline-start" />
                      Encrypted
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDateTime(account.updatedAt)}</TableCell>
                  <TableCell>{formatDateTime(account.createdAt)}</TableCell>
                  <TableCell className="max-w-80 whitespace-normal">
                    {formatOptionalText(account.notes)}
                  </TableCell>
                  <TableCell>{formatOptionalText(account.accountBy)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE_VARIANTS[account.status]}>
                      {formatStatus(account.status)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-24 text-center text-muted-foreground"
                >
                  {databaseAvailable
                    ? "No accounts have been added yet."
                    : EMPTY_CELL_PLACEHOLDER}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
