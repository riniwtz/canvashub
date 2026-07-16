import "server-only";

import { randomUUID } from "node:crypto";

import { asc, desc, eq } from "drizzle-orm";
import { connection } from "next/server";

import type { TrackedAccountInput } from "@/features/accounts/validation";
import { encryptAccountPassword } from "@/features/accounts/server/credential-encryption";
import { getDb } from "@/lib/db";
import { contacts, trackedAccounts } from "@/lib/db/schema";

export type TrackedAccountListItem = {
  id: string;
  accountName: string;
  email: string;
  notes: string | null;
  accountBy: string | null;
  status: "active" | "paused" | "archived" | "inactive";
  createdAt: Date;
  updatedAt: Date;
};

export type AccountDataErrorCode =
  | "contact_not_found"
  | "database_unavailable";

export class AccountDataError extends Error {
  constructor(readonly code: AccountDataErrorCode) {
    super(code);
    this.name = "AccountDataError";
  }
}

export async function getAccountContactOptions() {
  await connection();

  const db = getDb();

  if (!db) {
    return [];
  }

  try {
    return await db
      .select({
        id: contacts.id,
        name: contacts.name,
        nickname: contacts.nickname,
      })
      .from(contacts)
      .orderBy(asc(contacts.name), asc(contacts.nickname));
  } catch (error) {
    console.error("Unable to load account contact options.", error);
    return [];
  }
}

export async function getTrackedAccounts() {
  await connection();

  const db = getDb();

  if (!db) {
    return {
      accounts: [] as TrackedAccountListItem[],
      databaseAvailable: false,
    };
  }

  try {
    const accountRows = await db
      .select({
        id: trackedAccounts.id,
        accountName: trackedAccounts.accountName,
        email: trackedAccounts.email,
        notes: trackedAccounts.notes,
        accountBy: contacts.name,
        status: trackedAccounts.status,
        createdAt: trackedAccounts.createdAt,
        updatedAt: trackedAccounts.updatedAt,
      })
      .from(trackedAccounts)
      .leftJoin(
        contacts,
        eq(trackedAccounts.accountByContactId, contacts.id),
      )
      .orderBy(
        desc(trackedAccounts.updatedAt),
        desc(trackedAccounts.createdAt),
      );

    return { accounts: accountRows, databaseAvailable: true };
  } catch (error) {
    console.error("Unable to load tracked accounts.", error);

    return {
      accounts: [] as TrackedAccountListItem[],
      databaseAvailable: false,
    };
  }
}

export async function createTrackedAccount(input: TrackedAccountInput) {
  const db = getDb();

  if (!db) {
    throw new AccountDataError("database_unavailable");
  }

  if (input.accountByContactId) {
    const [accountOwner] = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(eq(contacts.id, input.accountByContactId))
      .limit(1);

    if (!accountOwner) {
      throw new AccountDataError("contact_not_found");
    }
  }

  const accountId = randomUUID();
  const encryptedPassword = await encryptAccountPassword({
    accountId,
    password: input.password,
    passphrase: input.passphrase,
  });

  await db.insert(trackedAccounts).values({
    id: accountId,
    accountName: input.accountName,
    email: input.email,
    notes: input.notes,
    accountByContactId: input.accountByContactId,
    status: input.status,
    ...encryptedPassword,
  });
}
