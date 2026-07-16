import {
  AddContactsDialog,
  EditContactDialog,
  type EditableContact,
} from "@/features/contacts/components/contact-dialog";
import { ContactQueryControls } from "@/features/contacts/components/contact-query-controls";
import { DeleteContactDialog } from "@/features/contacts/components/delete-contact-dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  SOCIAL_PLATFORM_DEFINITIONS,
  type SocialPlatform,
} from "@/features/contacts/constants";
import { SOCIAL_PLATFORM_ICONS } from "@/features/contacts/social-platform-icons";
import {
  hasContactQueryConstraints,
  parseContactQuery,
  type ContactSearchParams,
} from "@/features/contacts/query";
import {
  getContacts,
  type ContactListItem,
  type ContactListSocialLink,
} from "@/features/contacts/server/data";

const CONTACT_TABLE_COLUMN_COUNT = 9;
const EMPTY_CELL = "--";

const CONTACT_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "nickname", label: "Nickname" },
  { key: "age", label: "Age" },
  { key: "birthday", label: "Birthday" },
  { key: "phone", label: "Phone Number" },
  { key: "socialMedia", label: "Social Media" },
  { key: "updatedAt", label: "Last Updated" },
  { key: "createdAt", label: "Last Added" },
  { key: "actions", label: "Actions" },
] as const;

const birthdayFormatter = new Intl.DateTimeFormat("en-PH", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const timestampFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Manila",
});

type ContactsPageProps = {
  searchParams: Promise<ContactSearchParams>;
};

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const query = parseContactQuery(await searchParams);
  const { contacts, databaseAvailable } = await getContacts(query);
  const hasQueryConstraints = hasContactQueryConstraints(query);
  const summary = getContactSummary({
    contactCount: contacts.length,
    databaseAvailable,
    hasQueryConstraints,
  });

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-normal">Contacts</h1>
          <p className="text-sm text-muted-foreground">{summary}</p>
        </div>
        <AddContactsDialog />
      </div>

      <ContactQueryControls query={query} />

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {CONTACT_COLUMNS.map((column) => (
                <TableHead key={column.key}>{column.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.length ? (
              contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">
                    {formatOptionalText(contact.name)}
                  </TableCell>
                  <TableCell>{formatOptionalText(contact.nickname)}</TableCell>
                  <TableCell>{formatOptionalNumber(contact.age)}</TableCell>
                  <TableCell>{formatBirthday(contact.birthday)}</TableCell>
                  <TableCell>
                    <PhoneNumber phone={contact.phone} />
                  </TableCell>
                  <TableCell className="min-w-56 whitespace-normal">
                    <SocialLinks links={contact.socialLinks} />
                  </TableCell>
                  <TableCell>{formatTimestamp(contact.updatedAt)}</TableCell>
                  <TableCell>{formatTimestamp(contact.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <EditContactDialog contact={toEditableContact(contact)} />
                      <DeleteContactDialog
                        contactId={contact.id}
                        contactName={contact.name}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={CONTACT_TABLE_COLUMN_COUNT}
                  className="h-24 text-center text-muted-foreground"
                >
                  {getEmptyTableMessage({
                    databaseAvailable,
                    hasQueryConstraints,
                  })}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function getContactSummary({
  contactCount,
  databaseAvailable,
  hasQueryConstraints,
}: {
  contactCount: number;
  databaseAvailable: boolean;
  hasQueryConstraints: boolean;
}): string {
  if (!databaseAvailable) {
    return "Contacts are unavailable until the database is ready.";
  }

  if (hasQueryConstraints) {
    return contactCount
      ? `${formatContactCount(contactCount)} found.`
      : "No contacts match your search or filters.";
  }

  return contactCount
    ? `${formatContactCount(contactCount)} saved.`
    : "No contacts have been added yet.";
}

function getEmptyTableMessage({
  databaseAvailable,
  hasQueryConstraints,
}: {
  databaseAvailable: boolean;
  hasQueryConstraints: boolean;
}): string {
  if (!databaseAvailable) {
    return "The contacts database is currently unavailable.";
  }

  return hasQueryConstraints
    ? "No contacts match your search or filters."
    : "No contacts have been added yet.";
}

function SocialLinks({ links }: { links: ContactListSocialLink[] }) {
  if (!links.length) {
    return EMPTY_CELL;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {links.map((link) => {
        const platform = link.platform as SocialPlatform;
        const definition = SOCIAL_PLATFORM_DEFINITIONS[platform];
        const PlatformIcon = SOCIAL_PLATFORM_ICONS[platform];

        return (
          <Button key={link.id} asChild size="xs" variant="outline">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              title={link.url}
            >
              <PlatformIcon data-icon="inline-start" />
              {definition.label}
            </a>
          </Button>
        );
      })}
    </div>
  );
}

function toEditableContact(contact: ContactListItem): EditableContact {
  return {
    id: contact.id,
    name: contact.name,
    nickname: contact.nickname,
    age: contact.age,
    birthday: contact.birthday,
    phone: contact.phone,
    socialLinks: contact.socialLinks.map((link) => ({
      platform: link.platform,
      url: link.url,
    })),
  };
}

function PhoneNumber({ phone }: { phone: string | null }) {
  const normalizedPhone = phone?.trim();

  if (!normalizedPhone) {
    return EMPTY_CELL;
  }

  return (
    <a
      className="underline-offset-4 hover:underline"
      href={`tel:${normalizedPhone.replace(/[^+\d]/g, "")}`}
    >
      {normalizedPhone}
    </a>
  );
}

function formatOptionalText(value: string | null | undefined) {
  return value?.trim() || EMPTY_CELL;
}

function formatOptionalNumber(value: number | null | undefined) {
  return value === null || value === undefined ? EMPTY_CELL : String(value);
}

function formatBirthday(value: string | null) {
  if (!value) {
    return EMPTY_CELL;
  }

  const birthday = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(birthday.getTime())
    ? EMPTY_CELL
    : birthdayFormatter.format(birthday);
}

function formatTimestamp(value: Date | null | undefined) {
  if (!value || Number.isNaN(value.getTime())) {
    return EMPTY_CELL;
  }

  return timestampFormatter.format(value);
}

function formatContactCount(contactCount: number) {
  return `${contactCount} ${contactCount === 1 ? "contact" : "contacts"}`;
}
