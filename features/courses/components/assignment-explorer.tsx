"use client"

import * as React from "react"
import {
  CalendarDaysIcon,
  Columns3Icon,
  ExternalLinkIcon,
  LayoutGridIcon,
  PanelRightOpenIcon,
  type LucideIcon,
  Table2Icon,
} from "lucide-react"

import type {
  CanvasAssignmentStatus,
  CanvasAssignmentView,
} from "@/features/courses/server/course-data"
import { formatOptionalNumber } from "@/lib/formatters"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type AssignmentView = "table" | "kanban" | "calendar" | "cards"
type AssignmentFilter = CanvasAssignmentStatus | "all"

const filterOptions = [
  { value: "all", label: "All" },
  { value: "upcoming", label: "Upcoming" },
  { value: "undated", label: "Undated" },
  { value: "past", label: "Past" },
  { value: "overdue", label: "Overdue" },
] as const satisfies readonly { value: AssignmentFilter; label: string }[]

const statusOptions = filterOptions.filter(
  (
    option,
  ): option is Extract<
    (typeof filterOptions)[number],
    { value: CanvasAssignmentStatus }
  > => option.value !== "all",
)

const viewOptions = [
  { value: "table", label: "Table", icon: Table2Icon },
  { value: "kanban", label: "Kanban", icon: Columns3Icon },
  { value: "calendar", label: "Calendar", icon: CalendarDaysIcon },
  { value: "cards", label: "Cards", icon: LayoutGridIcon },
] as const satisfies readonly {
  value: AssignmentView
  label: string
  icon: LucideIcon
}[]

const ASSIGNMENT_TABLE_COLUMN_COUNT = 8

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

const dayFormatter = new Intl.DateTimeFormat("en", {
  weekday: "short",
  month: "short",
  day: "numeric",
})

function formatDate(value: string | null) {
  if (!value) return "No due date"

  return dateFormatter.format(new Date(value))
}

function formatDay(value: string) {
  return dayFormatter.format(new Date(`${value}T00:00:00`))
}

function getStatusLabel(status: CanvasAssignmentStatus) {
  return statusOptions.find((option) => option.value === status)?.label ?? status
}

function getStatusVariant(status: CanvasAssignmentStatus) {
  if (status === "overdue") return "destructive"
  if (status === "past") return "secondary"
  if (status === "undated") return "outline"

  return "default"
}

function AssignmentStatusBadge({
  status,
}: {
  status: CanvasAssignmentStatus
}) {
  return <Badge variant={getStatusVariant(status)}>{getStatusLabel(status)}</Badge>
}

export function AssignmentExplorer({
  assignments,
}: {
  assignments: CanvasAssignmentView[]
}) {
  const [filter, setFilter] = React.useState<AssignmentFilter>("all")
  const [query, setQuery] = React.useState("")
  const [view, setView] = React.useState<AssignmentView>("table")
  const [selectedAssignment, setSelectedAssignment] =
    React.useState<CanvasAssignmentView | null>(null)

  const filteredAssignments = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return assignments.filter((assignment) => {
      const matchesFilter = filter === "all" || assignment.status === filter
      const searchableText = [
        assignment.title,
        assignment.assignmentGroup,
        assignment.description,
        assignment.submissionLabel,
        assignment.submissionState,
        assignment.workflowState,
        assignment.gradingType,
        assignment.submissionTypes.join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return matchesFilter && searchableText.includes(normalizedQuery)
    })
  }, [assignments, filter, query])

  const statusCounts = React.useMemo(() => {
    return filterOptions.reduce(
      (counts, option) => {
        counts[option.value] =
          option.value === "all"
            ? assignments.length
            : assignments.filter(
                (assignment) => assignment.status === option.value,
              ).length

        return counts
      },
      {} as Record<AssignmentFilter, number>,
    )
  }, [assignments])

  return (
    <Sheet
      open={Boolean(selectedAssignment)}
      onOpenChange={(open) => {
        if (!open) setSelectedAssignment(null)
      }}
    >
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-xl font-semibold tracking-normal">
              Assignments
            </h2>
            <p className="text-sm text-muted-foreground">
              {filteredAssignments.length} of {assignments.length} assignments
            </p>
          </div>
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(nextView) => {
              if (nextView) setView(nextView as AssignmentView)
            }}
            variant="outline"
            size="sm"
            spacing={0}
            className="flex-wrap"
            aria-label="Assignment view"
          >
            {viewOptions.map((option) => (
              <ToggleGroupItem key={option.value} value={option.value}>
                <option.icon data-icon="inline-start" />
                <span>{option.label}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
          <Input
            aria-label="Search assignments"
            placeholder="Search assignments"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <ToggleGroup
            type="single"
            value={filter}
            onValueChange={(nextFilter) => {
              setFilter((nextFilter || "all") as AssignmentFilter)
            }}
            variant="outline"
            size="sm"
            spacing={0}
            className="flex-wrap justify-start"
            aria-label="Assignment filters"
          >
            {filterOptions.map((option) => (
              <ToggleGroupItem key={option.value} value={option.value}>
                <span>{option.label}</span>
                <span className="text-muted-foreground">
                  {statusCounts[option.value]}
                </span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {!assignments.length ? (
          <AssignmentEmptyState />
        ) : null}
        {assignments.length && view === "table" ? (
          <AssignmentTable
            assignments={filteredAssignments}
            onSelect={setSelectedAssignment}
          />
        ) : null}
        {assignments.length && view === "kanban" ? (
          <AssignmentKanban
            assignments={filteredAssignments}
            onSelect={setSelectedAssignment}
          />
        ) : null}
        {assignments.length && view === "calendar" ? (
          <AssignmentCalendar
            assignments={filteredAssignments}
            onSelect={setSelectedAssignment}
          />
        ) : null}
        {assignments.length && view === "cards" ? (
          <AssignmentCards
            assignments={filteredAssignments}
            onSelect={setSelectedAssignment}
          />
        ) : null}
      </section>

      <AssignmentDetailsSheet assignment={selectedAssignment} />
    </Sheet>
  )
}

function AssignmentTable({
  assignments,
  onSelect,
}: {
  assignments: CanvasAssignmentView[]
  onSelect: (assignment: CanvasAssignmentView) => void
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Assignment</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Due</TableHead>
            <TableHead>Group</TableHead>
            <TableHead>Points</TableHead>
            <TableHead>Submission</TableHead>
            <TableHead>Grade</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assignments.length ? (
            assignments.map((assignment) => (
              <TableRow key={assignment.id}>
                <TableCell className="min-w-64 whitespace-normal">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{assignment.title}</span>
                    <span className="text-muted-foreground">
                      {assignment.description ?? "Canvas assignment"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <AssignmentStatusBadge status={assignment.status} />
                </TableCell>
                <TableCell>{formatDate(assignment.dueAt)}</TableCell>
                <TableCell>{assignment.assignmentGroup ?? "-"}</TableCell>
                <TableCell>
                  {formatOptionalNumber(assignment.pointsPossible)}
                </TableCell>
                <TableCell>{assignment.submissionLabel}</TableCell>
                <TableCell>
                  {assignment.grade ?? formatOptionalNumber(assignment.score)}
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelect(assignment)}
                  >
                    <PanelRightOpenIcon data-icon="inline-start" />
                    Open
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={ASSIGNMENT_TABLE_COLUMN_COUNT}
                className="h-24 text-center text-muted-foreground"
              >
                No assignments match the current filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function AssignmentKanban({
  assignments,
  onSelect,
}: {
  assignments: CanvasAssignmentView[]
  onSelect: (assignment: CanvasAssignmentView) => void
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {statusOptions.map((status) => {
        const columnAssignments = assignments.filter(
          (assignment) => assignment.status === status.value,
        )

        return (
          <section
            key={status.value}
            className="flex min-h-64 flex-col gap-3 rounded-lg border bg-muted/30 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium">{status.label}</h3>
              <Badge variant="secondary">{columnAssignments.length}</Badge>
            </div>
            <div className="flex flex-1 flex-col gap-2">
              {columnAssignments.length ? (
                columnAssignments.map((assignment) => (
                  <CompactAssignmentSummaryCard
                    key={assignment.id}
                    assignment={assignment}
                    onSelect={onSelect}
                  />
                ))
              ) : (
                <div className="flex min-h-28 items-center justify-center rounded-lg border border-dashed bg-background px-3 text-center text-sm text-muted-foreground">
                  No assignments
                </div>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function AssignmentCalendar({
  assignments,
  onSelect,
}: {
  assignments: CanvasAssignmentView[]
  onSelect: (assignment: CanvasAssignmentView) => void
}) {
  const datedAssignments = assignments
    .filter(hasDueDate)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const undatedAssignments = assignments.filter(
    (assignment) => !assignment.dueDate,
  )
  const dateGroups = datedAssignments.reduce(
    (groups, assignment) => {
      const { dueDate } = assignment
      groups[dueDate] = [...(groups[dueDate] ?? []), assignment]

      return groups
    },
    {} as Record<string, CanvasAssignmentView[]>,
  )

  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="grid auto-rows-fr gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Object.entries(dateGroups).length ? (
          Object.entries(dateGroups).map(([dueDate, items]) => (
            <Card key={dueDate} size="sm">
              <CardHeader>
                <CardTitle>{formatDay(dueDate)}</CardTitle>
                <CardDescription>{formatDate(dueDate)}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {items.map((assignment) => (
                  <button
                    key={assignment.id}
                    type="button"
                    onClick={() => onSelect(assignment)}
                    className="flex min-h-20 flex-col gap-1 rounded-lg border bg-background p-2 text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{assignment.title}</span>
                      <AssignmentStatusBadge status={assignment.status} />
                    </div>
                    <span className="text-muted-foreground">
                      {assignment.assignmentGroup ?? "Assignments"}
                    </span>
                  </button>
                ))}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
            No dated assignments match the current filters.
          </div>
        )}
      </div>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Undated</CardTitle>
          <CardDescription>
            {undatedAssignments.length} assignments
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {undatedAssignments.length ? (
            undatedAssignments.map((assignment) => (
              <CompactAssignmentSummaryCard
                key={assignment.id}
                assignment={assignment}
                onSelect={onSelect}
              />
            ))
          ) : (
            <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              No undated assignments
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function hasDueDate(
  assignment: CanvasAssignmentView,
): assignment is CanvasAssignmentView & { dueDate: string } {
  return Boolean(assignment.dueDate)
}

function AssignmentCards({
  assignments,
  onSelect,
}: {
  assignments: CanvasAssignmentView[]
  onSelect: (assignment: CanvasAssignmentView) => void
}) {
  if (!assignments.length) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        No assignments match the current filters.
      </div>
    )
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {assignments.map((assignment) => (
        <AssignmentSummaryCard
          key={assignment.id}
          assignment={assignment}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

type AssignmentSummaryCardProps = {
  assignment: CanvasAssignmentView
  onSelect: (assignment: CanvasAssignmentView) => void
}

type AssignmentSummaryCardFrameProps = AssignmentSummaryCardProps & {
  cardSize: "default" | "sm"
  titleClassName?: string
}

function AssignmentSummaryCard(props: AssignmentSummaryCardProps) {
  return <AssignmentSummaryCardFrame {...props} cardSize="default" />
}

function CompactAssignmentSummaryCard(props: AssignmentSummaryCardProps) {
  return (
    <AssignmentSummaryCardFrame
      {...props}
      cardSize="sm"
      titleClassName="text-sm"
    />
  )
}

function AssignmentSummaryCardFrame({
  assignment,
  cardSize,
  onSelect,
  titleClassName,
}: AssignmentSummaryCardFrameProps) {
  return (
    <Card size={cardSize}>
      <CardHeader>
        <CardTitle className={titleClassName}>{assignment.title}</CardTitle>
        <CardDescription>
          {assignment.assignmentGroup ?? assignment.gradingType ?? "Assignment"}
        </CardDescription>
        <CardAction>
          <AssignmentStatusBadge status={assignment.status} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-muted-foreground">
          {assignment.description ?? "Cached Canvas assignment"}
        </p>
        <div className="grid gap-2 text-sm">
          <AssignmentFact label="Due" value={formatDate(assignment.dueAt)} />
          <AssignmentFact
            label="Points"
            value={formatOptionalNumber(assignment.pointsPossible)}
          />
          <AssignmentFact label="Submission" value={assignment.submissionLabel} />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onSelect(assignment)}
        >
          <PanelRightOpenIcon data-icon="inline-start" />
          Details
        </Button>
      </CardContent>
    </Card>
  )
}

function AssignmentDetailsSheet({
  assignment,
}: {
  assignment: CanvasAssignmentView | null
}) {
  return (
    <SheetContent side="right" className="w-full sm:max-w-md">
      <SheetHeader>
        <SheetTitle>{assignment?.title ?? "Assignment details"}</SheetTitle>
        <SheetDescription>
          Cached Canvas assignment and submission details
        </SheetDescription>
      </SheetHeader>
      {assignment ? (
        <div className="flex flex-1 flex-col gap-4 overflow-auto px-4 pb-4">
          <div className="flex flex-wrap gap-2">
            <AssignmentStatusBadge status={assignment.status} />
            {assignment.workflowState ? (
              <Badge variant="outline">{assignment.workflowState}</Badge>
            ) : null}
            {assignment.missing ? (
              <Badge variant="destructive">Missing</Badge>
            ) : null}
            {assignment.late ? (
              <Badge variant="outline">Late</Badge>
            ) : null}
          </div>
          <div className="grid gap-3 text-sm">
            <AssignmentFact label="Due" value={formatDate(assignment.dueAt)} />
            <AssignmentFact
              label="Unlocks"
              value={assignment.unlockAt ? formatDate(assignment.unlockAt) : "-"}
            />
            <AssignmentFact
              label="Locks"
              value={assignment.lockAt ? formatDate(assignment.lockAt) : "-"}
            />
            <AssignmentFact
              label="Assignment group"
              value={assignment.assignmentGroup ?? "-"}
            />
            <AssignmentFact
              label="Points"
              value={formatOptionalNumber(assignment.pointsPossible)}
            />
            <AssignmentFact
              label="Grading"
              value={assignment.gradingType ?? "-"}
            />
            <AssignmentFact
              label="Submission types"
              value={
                assignment.submissionTypes.length
                  ? assignment.submissionTypes.join(", ")
                  : "-"
              }
            />
            <AssignmentFact
              label="Submission state"
              value={assignment.submissionState ?? assignment.submissionLabel}
            />
            <AssignmentFact
              label="Score"
              value={formatOptionalNumber(assignment.score)}
            />
            <AssignmentFact label="Grade" value={assignment.grade ?? "-"} />
          </div>
          {assignment.description ? (
            <p className="text-sm leading-6 text-muted-foreground">
              {assignment.description}
            </p>
          ) : null}
          {assignment.htmlUrl ? (
            <Button asChild variant="outline">
              <a href={assignment.htmlUrl} target="_blank" rel="noreferrer">
                <ExternalLinkIcon data-icon="inline-start" />
                Open in Canvas
              </a>
            </Button>
          ) : null}
        </div>
      ) : null}
    </SheetContent>
  )
}

function AssignmentFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right font-medium">{value}</span>
    </div>
  )
}

function AssignmentEmptyState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>No cached assignments</CardTitle>
        <CardDescription>
          This course has no assignment records in the local Canvas cache.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </CardContent>
    </Card>
  )
}
