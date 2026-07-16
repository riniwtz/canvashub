"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FilterIcon, SearchIcon, XIcon } from "lucide-react";

import { WorkColorDot } from "@/features/work/components/work-color-dot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TASK_PRIORITY_OPTIONS,
  TASK_WORK_CATEGORY_OPTIONS,
  WORK_SEARCH_DEBOUNCE_MS,
  WORK_SEARCH_MAX_LENGTH,
} from "@/features/work/constants";
import {
  countActiveWorkFilters,
  hasActiveWorkFilters,
  WORK_PAGE_SIZES,
  type WorkQuery,
} from "@/features/work/query";
import type {
  WorkFilterOptions,
  WorkTaskTypeTab,
} from "@/features/work/types";

const FILTER_KEYS = [
  "type",
  "status",
  "priority",
  "category",
  "course",
  "organization",
  "dueFrom",
  "dueTo",
  "hasDeadline",
  "hasSubtasks",
  "completion",
  "visibility",
] as const;

type WorkControlsProps = {
  query: WorkQuery;
  taskTypes: WorkTaskTypeTab[];
  options: WorkFilterOptions;
};

type FilterSelectProps = {
  name: string;
  label: string;
  defaultValue: string;
  options: Array<{ value: string; label: string; color?: string }>;
};

export function WorkControls({
  query,
  taskTypes,
  options,
}: WorkControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, startNavigation] = useTransition();
  const allTaskCount = taskTypes.reduce(
    (taskCount, taskType) => taskCount + taskType.taskCount,
    0,
  );
  const selectedType = taskTypes.some(
    (taskType) => taskType.slug === query.type,
  )
    ? query.type
    : "all";

  function updateUrl(updates: Record<string, string | null>) {
    const nextParams = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (shouldRemoveUrlParam(key, value)) {
        nextParams.delete(key);
      } else if (value) {
        nextParams.set(key, value);
      }
    }

    nextParams.delete("page");
    const queryString = nextParams.toString();
    startNavigation(() => {
      router.replace(queryString ? `${pathname}?${queryString}` : pathname);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <ScrollArea className="w-full whitespace-nowrap">
        <Tabs
          value={selectedType}
          onValueChange={(value) => updateUrl({ type: value })}
          className="px-1 pb-3"
        >
          <TabsList variant="line">
            <TabsTrigger value="all">
              All
              <Badge variant="secondary">{allTaskCount}</Badge>
            </TabsTrigger>
            {taskTypes.map((taskType) => (
              <TabsTrigger key={taskType.id} value={taskType.slug}>
                <WorkColorDot color={taskType.color} />
                {taskType.name}
                <Badge variant="secondary">{taskType.taskCount}</Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <WorkSearch
          initialQuery={query.query}
          isNavigating={isNavigating}
          onSearch={(value) => updateUrl({ query: value || null })}
        />
        <div className="flex flex-wrap items-center gap-2">
          <WorkFilterPopover
            query={query}
            options={options}
            onApply={updateUrl}
          />
          {hasActiveWorkFilters(query) ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                updateUrl(Object.fromEntries(FILTER_KEYS.map((key) => [key, null])))
              }
            >
              <XIcon data-icon="inline-start" />
              Clear filters
            </Button>
          ) : null}
          <PageSizeSelect
            value={String(query.pageSize)}
            onValueChange={(pageSize) => updateUrl({ pageSize })}
          />
        </div>
      </div>
    </div>
  );
}

function WorkSearch({
  initialQuery,
  isNavigating,
  onSearch,
}: {
  initialQuery: string;
  isNavigating: boolean;
  onSearch: (value: string) => void;
}) {
  const [value, setValue] = useState(initialQuery);
  const latestSearch = useRef(onSearch);

  useEffect(() => {
    latestSearch.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    setValue(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const normalizedValue = value.trim().replace(/\s+/g, " ");

    if (normalizedValue === initialQuery) {
      return;
    }

    const timeout = window.setTimeout(() => {
      latestSearch.current(normalizedValue);
    }, WORK_SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [initialQuery, value]);

  return (
    <InputGroup className="min-w-0 flex-1 lg:max-w-xl">
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput
        type="search"
        value={value}
        maxLength={WORK_SEARCH_MAX_LENGTH}
        placeholder="Search tasks, courses, organizations, or types"
        aria-label="Search work"
        aria-busy={isNavigating}
        onChange={(event) => setValue(event.target.value)}
      />
    </InputGroup>
  );
}

function WorkFilterPopover({
  query,
  options,
  onApply,
}: {
  query: WorkQuery;
  options: WorkFilterOptions;
  onApply: (updates: Record<string, string | null>) => void;
}) {
  const [open, setOpen] = useState(false);
  const activeFilterCount = countActiveWorkFilters(query);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const updates = Object.fromEntries(
      FILTER_KEYS.map((key) => {
        const value = formData.get(key);
        return [key, typeof value === "string" ? value : null];
      }),
    );

    onApply(updates);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <FilterIcon data-icon="inline-start" />
          Filters
          {activeFilterCount ? (
            <Badge variant="secondary">{activeFilterCount}</Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        collisionPadding={8}
        className="grid h-[min(40rem,var(--radix-popover-content-available-height))] w-[min(36rem,calc(100vw-2rem))] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0"
      >
        <PopoverHeader className="shrink-0 border-b px-4 py-3.5">
          <PopoverTitle>Filter work</PopoverTitle>
          <PopoverDescription>
            Combine filters; results are applied on the server.
          </PopoverDescription>
        </PopoverHeader>
        <form
          onSubmit={applyFilters}
          className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] overflow-hidden"
        >
          <ScrollArea className="min-h-0 overflow-hidden">
            <FieldGroup className="gap-5 p-4">
              <FieldSet>
                <FieldLegend>Classification</FieldLegend>
                <FieldGroup className="grid gap-3 sm:grid-cols-2">
                  <FilterSelect
                    name="type"
                    label="Task type"
                    defaultValue={query.type}
                    options={[
                      { value: "all", label: "All types" },
                      ...options.taskTypes
                        .filter((taskType) => taskType.isActive)
                        .map((taskType) => ({
                          value: taskType.slug,
                          label: taskType.name,
                          color: taskType.color,
                        })),
                    ]}
                  />
                  <FilterSelect
                    name="status"
                    label="Status"
                    defaultValue={query.status}
                    options={[
                      { value: "all", label: "All statuses" },
                      ...options.statuses.map((status) => ({
                        value: status.slug,
                        label: status.name,
                        color: status.color,
                      })),
                    ]}
                  />
                  <FilterSelect
                    name="priority"
                    label="Priority"
                    defaultValue={query.priority}
                    options={[
                      { value: "all", label: "All priorities" },
                      ...TASK_PRIORITY_OPTIONS,
                    ]}
                  />
                  <FilterSelect
                    name="category"
                    label="Work category"
                    defaultValue={query.category}
                    options={[
                      { value: "all", label: "All categories" },
                      ...TASK_WORK_CATEGORY_OPTIONS,
                    ]}
                  />
                  <FilterSelect
                    name="course"
                    label="Course"
                    defaultValue={query.course}
                    options={[
                      { value: "all", label: "All courses" },
                      ...options.courses.map((course) => ({
                        value: course.id,
                        label: `${course.code} — ${course.name}`,
                      })),
                    ]}
                  />
                  <FilterSelect
                    name="organization"
                    label="Organization"
                    defaultValue={query.organization}
                    options={[
                      { value: "all", label: "All organizations" },
                      ...options.organizations.map((organization) => ({
                        value: organization.id,
                        label: organization.name,
                      })),
                    ]}
                  />
                </FieldGroup>
              </FieldSet>

              <FieldSet>
                <FieldLegend>Schedule and progress</FieldLegend>
                <FieldGroup className="grid gap-3 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="work-filter-due-from">
                      Due from
                    </FieldLabel>
                    <Input
                      id="work-filter-due-from"
                      name="dueFrom"
                      type="date"
                      defaultValue={query.dueFrom}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="work-filter-due-to">Due to</FieldLabel>
                    <Input
                      id="work-filter-due-to"
                      name="dueTo"
                      type="date"
                      defaultValue={query.dueTo}
                    />
                  </Field>
                  <FilterSelect
                    name="hasDeadline"
                    label="Deadline"
                    defaultValue={query.hasDeadline}
                    options={[
                      { value: "all", label: "Any deadline" },
                      { value: "yes", label: "Has deadline" },
                      { value: "no", label: "No deadline" },
                    ]}
                  />
                  <FilterSelect
                    name="hasSubtasks"
                    label="Subtasks"
                    defaultValue={query.hasSubtasks}
                    options={[
                      { value: "all", label: "Any task" },
                      { value: "yes", label: "Has subtasks" },
                      { value: "no", label: "No subtasks" },
                    ]}
                  />
                  <FilterSelect
                    name="completion"
                    label="Completion"
                    defaultValue={query.completion}
                    options={[
                      { value: "all", label: "Any progress" },
                      { value: "complete", label: "Completed" },
                      { value: "incomplete", label: "Incomplete" },
                    ]}
                  />
                  <FilterSelect
                    name="visibility"
                    label="Visibility"
                    defaultValue={query.visibility}
                    options={[
                      { value: "active", label: "Active only" },
                      { value: "archived", label: "Archived only" },
                      { value: "all", label: "Active and archived" },
                    ]}
                  />
                </FieldGroup>
              </FieldSet>
            </FieldGroup>
          </ScrollArea>
          <div className="grid shrink-0 grid-cols-2 gap-2 border-t bg-muted/50 p-3 sm:flex sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Apply filters</Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function FilterSelect({
  name,
  label,
  defaultValue,
  options,
}: FilterSelectProps) {
  const id = `work-filter-${name}`;

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select name={name} defaultValue={defaultValue}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.color ? <WorkColorDot color={option.color} /> : null}
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

function PageSizeSelect({
  value,
  onValueChange,
}: {
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger size="sm" aria-label="Tasks per page">
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="end">
        <SelectGroup>
          {WORK_PAGE_SIZES.map((pageSize) => (
            <SelectItem key={pageSize} value={String(pageSize)}>
              {pageSize} per page
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function shouldRemoveUrlParam(key: string, value: string | null): boolean {
  return (
    !value ||
    value === "all" ||
    (key === "pageSize" && value === "20") ||
    (key === "visibility" && value === "active")
  );
}
