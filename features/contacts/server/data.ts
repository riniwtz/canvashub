import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  exists,
  ilike,
  inArray,
  or,
  sql,
  type AnyColumn,
  type SQL,
} from "drizzle-orm";

import {
  DEFAULT_CONTACT_QUERY,
  type ContactQuery,
  type ContactSortField,
} from "@/features/contacts/query";
import type { ValidatedContactInput } from "@/features/contacts/validation";
import { getDb } from "@/lib/db";
import {
  contacts,
  contactSocialLinks,
  type ContactSocialPlatform,
} from "@/lib/db/schema";

export type ContactListSocialLink = {
  id: string;
  platform: ContactSocialPlatform;
  url: string;
};

export type ContactListItem = {
  id: string;
  name: string;
  nickname: string | null;
  age: number | null;
  birthday: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
  socialLinks: ContactListSocialLink[];
};

export type ContactDataErrorCode = "database_unavailable" | "not_found";

const CONTACT_SORT_COLUMNS = {
  name: contacts.name,
  nickname: contacts.nickname,
  age: contacts.age,
  birthday: contacts.birthday,
  updatedAt: contacts.updatedAt,
  createdAt: contacts.createdAt,
} as const satisfies Record<ContactSortField, AnyColumn>;

export class ContactDataError extends Error {
  constructor(readonly code: ContactDataErrorCode) {
    super(code);
    this.name = "ContactDataError";
  }
}

export async function getContacts(query: ContactQuery = DEFAULT_CONTACT_QUERY) {
  const db = getDb();

  if (!db) {
    return { contacts: [] as ContactListItem[], databaseAvailable: false };
  }

  try {
    const contactRows = await db
      .select({
        id: contacts.id,
        name: contacts.name,
        nickname: contacts.nickname,
        age: contacts.age,
        birthday: contacts.birthday,
        phone: contacts.phone,
        createdAt: contacts.createdAt,
        updatedAt: contacts.updatedAt,
      })
      .from(contacts)
      .where(buildContactWhereCondition(db, query))
      .orderBy(...buildContactOrderBy(query));

    const socialLinkRows = contactRows.length
      ? await db
        .select({
          id: contactSocialLinks.id,
          contactId: contactSocialLinks.contactId,
          platform: contactSocialLinks.platform,
          url: contactSocialLinks.url,
        })
        .from(contactSocialLinks)
        .where(
          inArray(
            contactSocialLinks.contactId,
            contactRows.map((contact) => contact.id),
          ),
        )
        .orderBy(asc(contactSocialLinks.platform), asc(contactSocialLinks.url))
      : [];

    const socialLinksByContact = groupSocialLinksByContact(socialLinkRows);
    const contactItems = contactRows.map((contact) => ({
      ...contact,
      socialLinks: socialLinksByContact.get(contact.id) ?? [],
    }));

    return { contacts: contactItems, databaseAvailable: true };
  } catch (error) {
    console.error("Unable to load contacts.", error);

    return { contacts: [] as ContactListItem[], databaseAvailable: false };
  }
}

type ContactDatabase = NonNullable<ReturnType<typeof getDb>>;

function buildContactWhereCondition(
  db: ContactDatabase,
  query: ContactQuery,
): SQL | undefined {
  return and(
    buildContactSearchCondition(db, query.search),
    buildContactPlatformCondition(db, query.platform),
  );
}

function buildContactSearchCondition(
  db: ContactDatabase,
  search: string,
): SQL | undefined {
  if (!search) {
    return undefined;
  }

  const searchPattern = `%${escapeLikePattern(search)}%`;
  const matchingSocialLink = db
    .select({ id: contactSocialLinks.id })
    .from(contactSocialLinks)
    .where(
      and(
        eq(contactSocialLinks.contactId, contacts.id),
        ilike(contactSocialLinks.url, searchPattern),
      ),
    );

  return or(
    ilike(contacts.name, searchPattern),
    ilike(contacts.nickname, searchPattern),
    ilike(contacts.phone, searchPattern),
    exists(matchingSocialLink),
  );
}

function buildContactPlatformCondition(
  db: ContactDatabase,
  platform: ContactQuery["platform"],
): SQL | undefined {
  if (platform === "all") {
    return undefined;
  }

  return exists(
    db
      .select({ id: contactSocialLinks.id })
      .from(contactSocialLinks)
      .where(
        and(
          eq(contactSocialLinks.contactId, contacts.id),
          eq(contactSocialLinks.platform, platform),
        ),
      ),
  );
}

function buildContactOrderBy(query: ContactQuery): SQL[] {
  const sortColumn = CONTACT_SORT_COLUMNS[query.sortBy];
  const primarySort =
    query.sortDirection === "asc" ? asc(sortColumn) : desc(sortColumn);

  return [
    sql`${primarySort} nulls last`,
    asc(contacts.name),
    asc(contacts.id),
  ];
}

function escapeLikePattern(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("%", "\\%")
    .replaceAll("_", "\\_");
}

export async function createContact(input: ValidatedContactInput) {
  const db = getDb();

  if (!db) {
    throw new ContactDataError("database_unavailable");
  }

  return db.transaction(async (transaction) => {
    const [contact] = await transaction
      .insert(contacts)
      .values({
        name: input.name,
        nickname: input.nickname ?? null,
        age: input.age ?? null,
        birthday: input.birthday ?? null,
        phone: input.phone ?? null,
      })
      .returning({ id: contacts.id });

    if (!contact) {
      throw new ContactDataError("database_unavailable");
    }

    if (input.socialLinks.length) {
      await transaction.insert(contactSocialLinks).values(
        input.socialLinks.map((socialLink) => ({
          contactId: contact.id,
          platform: socialLink.platform,
          url: socialLink.url,
        })),
      );
    }

    return contact.id;
  });
}

export async function updateContact(
  contactId: string,
  input: ValidatedContactInput,
) {
  const db = getDb();

  if (!db) {
    throw new ContactDataError("database_unavailable");
  }

  return db.transaction(async (transaction) => {
    const [contact] = await transaction
      .update(contacts)
      .set({
        name: input.name,
        nickname: input.nickname ?? null,
        age: input.age ?? null,
        birthday: input.birthday ?? null,
        phone: input.phone ?? null,
      })
      .where(eq(contacts.id, contactId))
      .returning({ id: contacts.id });

    if (!contact) {
      throw new ContactDataError("not_found");
    }

    await transaction
      .delete(contactSocialLinks)
      .where(eq(contactSocialLinks.contactId, contactId));

    if (input.socialLinks.length) {
      await transaction.insert(contactSocialLinks).values(
        input.socialLinks.map((socialLink) => ({
          contactId,
          platform: socialLink.platform,
          url: socialLink.url,
        })),
      );
    }
  });
}

export async function deleteContact(contactId: string) {
  const db = getDb();

  if (!db) {
    throw new ContactDataError("database_unavailable");
  }

  const [contact] = await db
    .delete(contacts)
    .where(eq(contacts.id, contactId))
    .returning({ id: contacts.id });

  if (!contact) {
    throw new ContactDataError("not_found");
  }
}

function groupSocialLinksByContact(
  rows: Array<ContactListSocialLink & { contactId: string }>,
) {
  const socialLinksByContact = new Map<string, ContactListSocialLink[]>();

  for (const { contactId, ...socialLink } of rows) {
    const currentLinks = socialLinksByContact.get(contactId) ?? [];
    socialLinksByContact.set(contactId, [...currentLinks, socialLink]);
  }

  return socialLinksByContact;
}
