import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createWorkHref, type WorkQuery } from "@/features/work/query";

export function WorkPagination({
  query,
  totalCount,
  totalPages,
}: {
  query: WorkQuery;
  totalCount: number;
  totalPages: number;
}) {
  if (!totalCount) {
    return null;
  }

  const firstItem = (query.page - 1) * query.pageSize + 1;
  const lastItem = Math.min(query.page * query.pageSize, totalCount);

  return (
    <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <p className="text-center sm:text-left">
        Showing {firstItem}–{lastItem} of {totalCount}
      </p>
      <nav
        aria-label="Task table pagination"
        className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:w-auto"
      >
        {query.page > 1 ? (
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href={createWorkHref(query, { page: query.page - 1 })}>
              <ChevronLeftIcon data-icon="inline-start" />
              Previous
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="w-full" disabled>
            <ChevronLeftIcon data-icon="inline-start" />
            Previous
          </Button>
        )}
        <span className="px-1 text-center whitespace-nowrap">
          Page {query.page} of {totalPages}
        </span>
        {query.page < totalPages ? (
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href={createWorkHref(query, { page: query.page + 1 })}>
              Next
              <ChevronRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="w-full" disabled>
            Next
            <ChevronRightIcon data-icon="inline-end" />
          </Button>
        )}
      </nav>
    </div>
  );
}
