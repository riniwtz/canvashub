import {
  ExternalLinkIcon,
  FileTextIcon,
  UsersRoundIcon,
} from "lucide-react"

import type {
  CanvasCalendarItemView,
  CanvasCourseSectionKey,
  CanvasCourseWorkspace,
  CanvasFileView,
  CanvasGradeView,
  CanvasMeetingView,
  CanvasModuleItemView,
  CanvasModuleView,
  CanvasPersonView,
  CanvasTopicView,
} from "@/features/courses/server/course-data"
import { formatOptionalNumber } from "@/lib/formatters"
import { AssignmentExplorer } from "@/features/courses/components/assignment-explorer"
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
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const dateTimeFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
})
const MODULE_ITEM_INDENT_PX = 12

export function CourseWorkspace({
  workspace,
}: {
  workspace: CanvasCourseWorkspace
}) {
  const { course } = workspace
  const openWork = workspace.assignments.filter(
    (assignment) =>
      assignment.status === "upcoming" || assignment.status === "overdue",
  ).length
  const availableSections = workspace.sections.filter(
    (section) => section.key !== "overview" && section.available,
  )

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{course.canvasId}</Badge>
            {course.courseCode ? (
              <Badge variant="outline">{course.courseCode}</Badge>
            ) : null}
            {course.workflowState ? (
              <Badge variant="outline">{course.workflowState}</Badge>
            ) : null}
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-normal">
              {course.label}
            </h1>
            <p className="text-sm text-muted-foreground">
              {[
                course.secondaryLabel,
                course.termName,
                course.instructorNames.length
                  ? course.instructorNames.join(", ")
                  : null,
              ]
                .filter(Boolean)
                .join(" / ")}
            </p>
          </div>
        </div>
        <div className="grid gap-1 text-sm lg:text-right">
          <span className="text-muted-foreground">Last cache update</span>
          <span className="font-medium">
            {formatDateTime(course.updatedAt ?? course.syncedAt)}
          </span>
        </div>
      </div>

      <Tabs defaultValue="overview" className="gap-4">
        <TabsList
          variant="line"
          className="w-full justify-start overflow-x-auto overflow-y-hidden"
        >
          {workspace.sections.map((section) => (
            <TabsTrigger key={section.key} value={section.key}>
              <span>{section.label}</span>
              {section.key !== "overview" ? (
                <span className="text-muted-foreground">{section.count}</span>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview">
          <OverviewSection
            availableSections={availableSections.length}
            openWork={openWork}
            workspace={workspace}
          />
        </TabsContent>

        <TabsContent value="syllabus">
          {workspace.syllabus ? (
            <Card>
              <CardHeader>
                <CardTitle>Syllabus</CardTitle>
                <CardDescription>
                  Cached Canvas syllabus content for this course
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-muted-foreground">
                {workspace.syllabus}
              </CardContent>
            </Card>
          ) : (
            <UnavailableSection
              title="Syllabus"
              description={getEmptyLabel(workspace, "syllabus")}
            />
          )}
        </TabsContent>

        <TabsContent value="modules">
          <ModulesSection modules={workspace.modules} />
        </TabsContent>

        <TabsContent value="announcements">
          <TopicsSection
            title="Announcements"
            emptyLabel={getEmptyLabel(workspace, "announcements")}
            topics={workspace.announcements}
          />
        </TabsContent>

        <TabsContent value="assignments">
          <AssignmentExplorer assignments={workspace.assignments} />
        </TabsContent>

        <TabsContent value="discussions">
          <TopicsSection
            title="Discussions"
            emptyLabel={getEmptyLabel(workspace, "discussions")}
            topics={workspace.discussions}
          />
        </TabsContent>

        <TabsContent value="grades">
          <GradesSection
            emptyLabel={getEmptyLabel(workspace, "grades")}
            grades={workspace.grades}
          />
        </TabsContent>

        <TabsContent value="people">
          <PeopleSection
            emptyLabel={getEmptyLabel(workspace, "people")}
            people={workspace.people}
          />
        </TabsContent>

        <TabsContent value="files">
          <FilesSection
            emptyLabel={getEmptyLabel(workspace, "files")}
            files={workspace.files}
          />
        </TabsContent>

        <TabsContent value="calendar">
          <CalendarSection
            emptyLabel={getEmptyLabel(workspace, "calendar")}
            items={workspace.calendar}
          />
        </TabsContent>

        <TabsContent value="meetings">
          <MeetingsSection
            emptyLabel={getEmptyLabel(workspace, "meetings")}
            meetings={workspace.meetings}
          />
        </TabsContent>
      </Tabs>
    </section>
  )
}

function OverviewSection({
  availableSections,
  openWork,
  workspace,
}: {
  availableSections: number
  openWork: number
  workspace: CanvasCourseWorkspace
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        title="Cached Sections"
        description="Canvas item groups"
        value={availableSections}
      />
      <MetricCard
        title="Open Work"
        description="Upcoming or overdue"
        value={openWork}
      />
      <MetricCard
        title="People"
        description="Cached enrollments"
        value={workspace.people.length}
      />
      <MetricCard
        title="Calendar"
        description="Events and to-do items"
        value={workspace.calendar.length}
      />
      <Card className="md:col-span-2 xl:col-span-4">
        <CardHeader>
          <CardTitle>Course Identity</CardTitle>
          <CardDescription>
            Metadata resolved from the local Canvas cache
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <Field label="Route key" value={workspace.course.routeKey} />
          <Field label="Original name" value={workspace.course.originalName} />
          <Field label="Term" value={workspace.course.termName} />
          <Field
            label="Enrollment"
            value={workspace.course.enrollmentState}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function ModulesSection({ modules }: { modules: CanvasModuleView[] }) {
  if (!modules.length) {
    return (
      <UnavailableSection
        title="Modules"
        description="No cached modules or module items are available for this course."
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {modules.map((module) => (
        <Card key={module.id}>
          <CardHeader>
            <CardTitle>{module.name}</CardTitle>
            <CardDescription>
              {[
                module.position ? `Position ${module.position}` : null,
                module.workflowState,
                module.unlockAt ? `Unlocks ${formatDateTime(module.unlockAt)}` : null,
              ]
                .filter(Boolean)
                .join(" / ") || "Canvas module"}
            </CardDescription>
            <CardAction>
              <Badge variant="secondary">{module.items.length}</Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            {module.items.length ? (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>State</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {module.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="min-w-56 whitespace-normal">
                          <span
                            style={{
                              paddingInlineStart: getModuleItemIndent(item),
                            }}
                          >
                            {item.title}
                          </span>
                        </TableCell>
                        <TableCell>{item.type ?? "Item"}</TableCell>
                        <TableCell>{item.position ?? "-"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              isModuleItemPublished(item)
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {isModuleItemPublished(item)
                              ? "Available"
                              : "Unpublished"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <CompactUnavailableSection
                title="Module items"
                description="This cached module has no cached item records."
              />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function TopicsSection({
  emptyLabel,
  title,
  topics,
}: {
  emptyLabel: string
  title: string
  topics: CanvasTopicView[]
}) {
  if (!topics.length) {
    return <UnavailableSection title={title} description={emptyLabel} />
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {topics.map((topic) => (
        <Card key={topic.id}>
          <CardHeader>
            <CardTitle>{topic.title}</CardTitle>
            <CardDescription>
              {[
                topic.authorName,
                formatDateTime(topic.postedAt),
                topic.workflowState,
              ]
                .filter(Boolean)
                .join(" / ")}
            </CardDescription>
            {topic.htmlUrl ? (
              <CardAction>
                <OpenCanvasButton href={topic.htmlUrl} />
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            {topic.message ? <p>{topic.message}</p> : null}
            <div className="flex flex-wrap gap-2">
              {topic.replyCount !== null ? (
                <Badge variant="outline">{topic.replyCount} replies</Badge>
              ) : null}
              {topic.lastReplyAt ? (
                <Badge variant="outline">
                  Last reply {formatDateTime(topic.lastReplyAt)}
                </Badge>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function GradesSection({
  emptyLabel,
  grades,
}: {
  emptyLabel: string
  grades: CanvasGradeView
}) {
  const hasSummary =
    grades.currentGrade ||
    grades.currentScore !== null ||
    grades.finalGrade ||
    grades.finalScore !== null
  const hasItems = grades.items.some(
    (item) => item.score !== null || item.grade || item.submissionState,
  )

  if (!hasSummary && !hasItems) {
    return <UnavailableSection title="Grades" description={emptyLabel} />
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard
          title="Current Score"
          description={grades.enrollmentRole ?? "Enrollment"}
          value={formatOptionalNumber(grades.currentScore)}
        />
        <MetricCard
          title="Current Grade"
          description="Cached grade"
          value={grades.currentGrade ?? "-"}
        />
        <MetricCard
          title="Final Score"
          description="Canvas final score"
          value={formatOptionalNumber(grades.finalScore)}
        />
        <MetricCard
          title="Final Grade"
          description="Canvas final grade"
          value={grades.finalGrade ?? "-"}
        />
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Assignment</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Points</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grades.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="min-w-56 whitespace-normal">
                  {item.title}
                </TableCell>
                <TableCell>{formatOptionalNumber(item.score)}</TableCell>
                <TableCell>{item.grade ?? "-"}</TableCell>
                <TableCell>{item.submissionState ?? item.workflowState ?? "-"}</TableCell>
                <TableCell>{formatOptionalNumber(item.pointsPossible)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function PeopleSection({
  emptyLabel,
  people,
}: {
  emptyLabel: string
  people: CanvasPersonView[]
}) {
  if (!people.length) {
    return <UnavailableSection title="People" description={emptyLabel} />
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Person</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>State</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Last activity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {people.map((person) => (
            <TableRow key={person.id}>
              <TableCell className="min-w-52 whitespace-normal">
                <div className="flex items-center gap-2">
                  <UsersRoundIcon />
                  <span>{person.name}</span>
                </div>
              </TableCell>
              <TableCell>{person.role ?? person.type ?? "-"}</TableCell>
              <TableCell>{person.enrollmentState ?? "-"}</TableCell>
              <TableCell>{person.email ?? "-"}</TableCell>
              <TableCell>{formatDateTime(person.lastActivityAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function FilesSection({
  emptyLabel,
  files,
}: {
  emptyLabel: string
  files: CanvasFileView[]
}) {
  if (!files.length) {
    return <UnavailableSection title="Files" description={emptyLabel} />
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>File</TableHead>
            <TableHead>Folder</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead>State</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file) => (
            <TableRow key={file.id}>
              <TableCell className="min-w-56 whitespace-normal">
                <div className="flex items-center gap-2">
                  <FileTextIcon />
                  {file.url ? (
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {file.name}
                    </a>
                  ) : (
                    <span className="font-medium">{file.name}</span>
                  )}
                </div>
              </TableCell>
              <TableCell>{file.folderName ?? "-"}</TableCell>
              <TableCell>{file.contentType ?? "-"}</TableCell>
              <TableCell>{formatBytes(file.sizeBytes)}</TableCell>
              <TableCell>{formatDateTime(file.updatedAt)}</TableCell>
              <TableCell>
                <Badge variant={file.hidden || file.locked ? "outline" : "secondary"}>
                  {file.hidden ? "Hidden" : file.locked ? "Locked" : "Available"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function CalendarSection({
  emptyLabel,
  items,
}: {
  emptyLabel: string
  items: CanvasCalendarItemView[]
}) {
  if (!items.length) {
    return <UnavailableSection title="Calendar" description={emptyLabel} />
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <Card key={`${item.source}-${item.id}`} size="sm">
          <CardHeader>
            <CardTitle>{item.title}</CardTitle>
            <CardDescription>
              {[
                item.type ?? item.source,
                formatDateTime(item.startsAt),
                item.location,
              ]
                .filter(Boolean)
                .join(" / ")}
            </CardDescription>
            {item.htmlUrl ? (
              <CardAction>
                <OpenCanvasButton href={item.htmlUrl} />
              </CardAction>
            ) : null}
          </CardHeader>
          {item.endsAt ? (
            <CardContent className="text-sm text-muted-foreground">
              Ends {formatDateTime(item.endsAt)}
            </CardContent>
          ) : null}
        </Card>
      ))}
    </div>
  )
}

function MeetingsSection({
  emptyLabel,
  meetings,
}: {
  emptyLabel: string
  meetings: CanvasMeetingView[]
}) {
  if (!meetings.length) {
    return <UnavailableSection title="Meetings" description={emptyLabel} />
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {meetings.map((meeting) => (
        <Card key={meeting.id}>
          <CardHeader>
            <CardTitle>{meeting.title}</CardTitle>
            <CardDescription>{meeting.type ?? "External link"}</CardDescription>
            {meeting.externalUrl ?? meeting.htmlUrl ? (
              <CardAction>
                <OpenCanvasButton href={(meeting.externalUrl ?? meeting.htmlUrl)!} />
              </CardAction>
            ) : null}
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}

function MetricCard({
  description,
  title,
  value,
}: {
  description: string
  title: string
  value: number | string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  )
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{value ?? "-"}</span>
    </div>
  )
}

function OpenCanvasButton({ href }: { href: string }) {
  return (
    <Button asChild variant="outline" size="sm">
      <a href={href} target="_blank" rel="noreferrer">
        <ExternalLinkIcon data-icon="inline-start" />
        Open
      </a>
    </Button>
  )
}

function getModuleItemIndent(item: CanvasModuleItemView) {
  return item.indent ? item.indent * MODULE_ITEM_INDENT_PX : 0
}

function isModuleItemPublished(item: CanvasModuleItemView) {
  return item.published !== false
}

type UnavailableSectionProps = {
  description: string
  title: string
}

type UnavailableSectionFrameProps = UnavailableSectionProps & {
  cardSize: "default" | "sm"
}

function UnavailableSection(props: UnavailableSectionProps) {
  return <UnavailableSectionFrame {...props} cardSize="default" />
}

function CompactUnavailableSection(props: UnavailableSectionProps) {
  return <UnavailableSectionFrame {...props} cardSize="sm" />
}

function UnavailableSectionFrame({
  cardSize,
  description,
  title,
}: UnavailableSectionFrameProps) {
  return (
    <Card size={cardSize}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </CardContent>
    </Card>
  )
}

function getEmptyLabel(
  workspace: CanvasCourseWorkspace,
  sectionKey: CanvasCourseSectionKey,
) {
  return (
    workspace.sections.find((section) => section.key === sectionKey)
      ?.emptyLabel ?? "No cached Canvas data is available for this section."
  )
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-"

  return dateTimeFormatter.format(new Date(value))
}

function formatBytes(value: number | null | undefined) {
  if (value === null || value === undefined) return "-"

  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`

  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}
