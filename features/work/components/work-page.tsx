import { redirect } from "next/navigation";

import { AddTaskDialog } from "@/features/work/components/task-dialog";
import { WorkControls } from "@/features/work/components/work-controls";
import { WorkPagination } from "@/features/work/components/work-pagination";
import { WorkTable } from "@/features/work/components/work-table";
import { getCurrentWorkUserId } from "@/features/work/server/current-user";
import { getWorkPageData } from "@/features/work/server/data";
import {
  createWorkHref,
  hasActiveWorkFilters,
  parseWorkQuery,
  WORK_SORT_FIELDS,
  type WorkSearchParams,
  type WorkSortField,
} from "@/features/work/query";

type WorkPageProps = {
  searchParams: Promise<WorkSearchParams>;
};

export default async function WorkPage({ searchParams }: WorkPageProps) {
  const query = parseWorkQuery(await searchParams);
  const ownerUserId = await getCurrentWorkUserId();
  const data = await getWorkPageData(ownerUserId, query);

  if (data.totalCount > 0 && query.page > data.totalPages) {
    redirect(createWorkHref(query, { page: data.totalPages }));
  }

  const canCreateTasks =
    data.databaseAvailable && data.options.statuses.length > 0;
  const summary = getWorkSummary({
    databaseAvailable: data.databaseAvailable,
    canCreateTasks,
    totalCount: data.totalCount,
    constrained:
      Boolean(query.query) ||
      query.type !== "all" ||
      hasActiveWorkFilters(query),
  });
  const sortHrefs = Object.fromEntries(
    WORK_SORT_FIELDS.map((field) => [
      field,
      createWorkHref(query, {
        sort: field,
        order:
          query.sort === field && query.order === "asc" ? "desc" : "asc",
      }),
    ]),
  ) as Record<WorkSortField, string>;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-normal">Work</h1>
          <p className="text-sm text-muted-foreground">{summary}</p>
        </div>
        <AddTaskDialog
          options={data.options}
          disabled={!canCreateTasks}
        />
      </div>

      <WorkControls
        query={query}
        taskTypes={data.taskTypes}
        options={data.options}
      />

      <WorkTable
        tasks={data.tasks}
        options={data.options}
        sort={query.sort}
        order={query.order}
        sortHrefs={sortHrefs}
        emptyMessage={getEmptyMessage({
          databaseAvailable: data.databaseAvailable,
          canCreateTasks,
          constrained:
            Boolean(query.query) ||
            query.type !== "all" ||
            hasActiveWorkFilters(query),
        })}
      />

      <WorkPagination query={query} totalCount={data.totalCount} totalPages={data.totalPages} />
    </section>
  );
}

function getWorkSummary({
  databaseAvailable,
  canCreateTasks,
  totalCount,
  constrained,
}: {
  databaseAvailable: boolean;
  canCreateTasks: boolean;
  totalCount: number;
  constrained: boolean;
}) {
  if (!databaseAvailable) {
    return "Work is unavailable until the database migration is applied.";
  }

  if (!canCreateTasks) {
    return "Seed the default workflow statuses to start managing work.";
  }

  if (constrained) {
    return totalCount
      ? `${formatTaskCount(totalCount)} match the current view.`
      : "No tasks match the current view.";
  }

  return totalCount
    ? `${formatTaskCount(totalCount)} across academic, organization, and personal work.`
    : "Plan academic, organization, project, and personal work in one place.";
}

function getEmptyMessage({
  databaseAvailable,
  canCreateTasks,
  constrained,
}: {
  databaseAvailable: boolean;
  canCreateTasks: boolean;
  constrained: boolean;
}) {
  if (!databaseAvailable) {
    return "The Work database is not ready yet.";
  }

  if (!canCreateTasks) {
    return "The Work workflow needs its default statuses before tasks can be added.";
  }

  return constrained
    ? "No tasks match this search, tab, or filter combination."
    : "No tasks yet. Add the first task to start your workstream.";
}

function formatTaskCount(taskCount: number) {
  return `${taskCount} ${taskCount === 1 ? "task" : "tasks"}`;
}

