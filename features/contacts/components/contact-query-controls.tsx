"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { ListFilterIcon, SearchIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { SOCIAL_PLATFORM_DEFINITIONS } from "@/features/contacts/constants";
import {
  CONTACT_SEARCH_MAX_LENGTH,
  DEFAULT_CONTACT_QUERY,
  hasCustomizedContactFilters,
  type ContactQuery,
  type ContactSortField,
} from "@/features/contacts/query";

const CONTACT_SEARCH_DEBOUNCE_MS = 300;

const CONTACT_SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "nickname", label: "Nickname" },
  { value: "age", label: "Age" },
  { value: "birthday", label: "Birthday" },
  { value: "updatedAt", label: "Last updated" },
  { value: "createdAt", label: "Last added" },
] as const satisfies ReadonlyArray<{
  value: ContactSortField;
  label: string;
}>;

type ContactFilterDraft = Pick<
  ContactQuery,
  "platform" | "sortBy" | "sortDirection"
>;

export function ContactQueryControls({ query }: { query: ContactQuery }) {
  return (
    <div className="grid w-full gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <ContactSearch query={query} />
      <ContactFilter query={query} />
    </div>
  );
}

function ContactSearch({ query }: { query: ContactQuery }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState(query.search);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setSearch(query.search);
    }
  }, [query.search]);

  useEffect(() => {
    const normalizedSearch = search.trim();
    const currentSearch = searchParams.get("q")?.trim() ?? "";

    if (normalizedSearch === currentSearch) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const nextSearchParams = createSearchQuery(
        searchParams.toString(),
        normalizedSearch,
      );

      startTransition(() => {
        router.replace(createContactsHref(nextSearchParams), {
          scroll: false,
        });
      });
    }, CONTACT_SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [router, search, searchParams]);

  return (
    <Field className="min-w-0">
      <FieldLabel htmlFor="contact-search" className="sr-only">
        Search contacts
      </FieldLabel>
      <InputGroup aria-busy={isPending}>
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          ref={inputRef}
          id="contact-search"
          type="search"
          maxLength={CONTACT_SEARCH_MAX_LENGTH}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, phone, or social link"
          aria-describedby="contact-search-description"
        />
        {isPending ? (
          <InputGroupAddon align="inline-end">
            <Spinner />
          </InputGroupAddon>
        ) : null}
      </InputGroup>
      <span id="contact-search-description" className="sr-only">
        Results update automatically after you stop typing.
      </span>
    </Field>
  );
}

function ContactFilter({ query }: { query: ContactQuery }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState(() =>
    getContactFilterDraft(query),
  );
  const [isPending, startTransition] = useTransition();
  const hasAppliedFilters = hasCustomizedContactFilters(query);

  function navigateWithFilters(filters: ContactFilterDraft) {
    const nextSearchParams = createFilterQuery(
      searchParams.toString(),
      filters,
    );

    setIsOpen(false);
    startTransition(() => {
      router.replace(createContactsHref(nextSearchParams), { scroll: false });
    });
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigateWithFilters(filterDraft);
  }

  function resetFilters() {
    const defaultFilters = getContactFilterDraft(DEFAULT_CONTACT_QUERY);
    setFilterDraft(defaultFilters);
    navigateWithFilters(defaultFilters);
  }

  return (
    <Popover
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setFilterDraft(getContactFilterDraft(query));
        }

        setIsOpen(nextOpen);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={hasAppliedFilters ? "secondary" : "outline"}
          className="w-full sm:w-auto"
          aria-label={
            hasAppliedFilters ? "Filter contacts, filters applied" : undefined
          }
        >
          {isPending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <ListFilterIcon data-icon="inline-start" />
          )}
          Filter
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)]">
        <PopoverHeader>
          <PopoverTitle>Filter contacts</PopoverTitle>
          <PopoverDescription>
            Narrow by social platform and choose the table order.
          </PopoverDescription>
        </PopoverHeader>

        <form onSubmit={applyFilters}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="contact-platform">Platform</FieldLabel>
              <Select
                value={filterDraft.platform}
                onValueChange={(platform) =>
                  setFilterDraft((current) => ({
                    ...current,
                    platform: platform as ContactQuery["platform"],
                  }))
                }
              >
                <SelectTrigger id="contact-platform" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All platforms</SelectItem>
                    {Object.entries(SOCIAL_PLATFORM_DEFINITIONS).map(
                      ([platform, definition]) => (
                        <SelectItem key={platform} value={platform}>
                          {definition.label}
                        </SelectItem>
                      ),
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="contact-sort">Sort by</FieldLabel>
              <Select
                value={filterDraft.sortBy}
                onValueChange={(sortBy) =>
                  setFilterDraft((current) => ({
                    ...current,
                    sortBy: sortBy as ContactQuery["sortBy"],
                  }))
                }
              >
                <SelectTrigger id="contact-sort" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {CONTACT_SORT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="contact-order">Order</FieldLabel>
              <Select
                value={filterDraft.sortDirection}
                onValueChange={(sortDirection) =>
                  setFilterDraft((current) => ({
                    ...current,
                    sortDirection:
                      sortDirection as ContactQuery["sortDirection"],
                  }))
                }
              >
                <SelectTrigger id="contact-order" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field orientation="horizontal" className="justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={resetFilters}
                disabled={!hasCustomizedFilterDraft(filterDraft)}
              >
                Reset
              </Button>
              <Button type="submit">Apply filters</Button>
            </Field>
          </FieldGroup>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function getContactFilterDraft(query: ContactQuery): ContactFilterDraft {
  return {
    platform: query.platform,
    sortBy: query.sortBy,
    sortDirection: query.sortDirection,
  };
}

function hasCustomizedFilterDraft(filters: ContactFilterDraft): boolean {
  return hasCustomizedContactFilters({
    ...DEFAULT_CONTACT_QUERY,
    ...filters,
  });
}

function createSearchQuery(
  currentQuery: string,
  search: string,
): URLSearchParams {
  return withOptionalSearchParam(
    new URLSearchParams(currentQuery),
    "q",
    search,
  );
}

function createFilterQuery(
  currentQuery: string,
  filters: ContactFilterDraft,
): URLSearchParams {
  const filterParameters = [
    [
      "platform",
      filters.platform === DEFAULT_CONTACT_QUERY.platform
        ? ""
        : filters.platform,
    ],
    [
      "sort",
      filters.sortBy === DEFAULT_CONTACT_QUERY.sortBy ? "" : filters.sortBy,
    ],
    [
      "order",
      filters.sortDirection === DEFAULT_CONTACT_QUERY.sortDirection
        ? ""
        : filters.sortDirection,
    ],
  ] as const;

  return filterParameters.reduce(
    (nextSearchParams, [name, value]) =>
      withOptionalSearchParam(nextSearchParams, name, value),
    new URLSearchParams(currentQuery),
  );
}

function withOptionalSearchParam(
  searchParams: URLSearchParams,
  name: string,
  value: string,
): URLSearchParams {
  const nextSearchParams = new URLSearchParams(searchParams);

  if (value) {
    nextSearchParams.set(name, value);
  } else {
    nextSearchParams.delete(name);
  }

  return nextSearchParams;
}

function createContactsHref(searchParams: URLSearchParams): string {
  const queryString = searchParams.toString();
  return queryString ? `/contacts?${queryString}` : "/contacts";
}
