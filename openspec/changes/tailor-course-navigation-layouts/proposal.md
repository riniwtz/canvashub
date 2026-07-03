## Why

Course navigation and course pages currently depend on hardcoded course and assignment data, so each course presents the same generic layout instead of reflecting Canvas course items. The Canvas cache schema already models courses, modules, assignments, submissions, discussions, files, calendar events, and to-do items, but the UI does not yet use that data and `schema.ts` currently fails TypeScript checks.

## What Changes

- Replace static course navigation data with Canvas-backed course records derived from the local Canvas cache.
- Tailor each course's navigation and workspace layout from its available Canvas items: syllabus, modules, assignments, announcements, discussions, grades/submissions, people/enrollments, files, calendar events, and meetings/external links where available.
- Replace mock assignment data with Canvas assignment and submission records while preserving search, filter, and view controls.
- Add clear loading, empty, and unavailable states for courses or tabs with missing Canvas data.
- Fix the Drizzle schema TypeScript errors in `lib/db/schema.ts` so the Canvas cache schema compiles under the installed `drizzle-orm` release.

## Capabilities

### New Capabilities
- `canvas-course-data`: Defines how Canvas cache tables are used to build normalized course, navigation, and course-item view data.

### Modified Capabilities
- `course-navigation`: Course navigation changes from a fixed four-course list to Canvas-backed courses with per-course item-aware child navigation.
- `course-workspace`: Course pages change from generic placeholders to layouts tailored to each course's available Canvas items.
- `assignment-explorer`: Assignment views change from mock assignments to Canvas-backed assignments and submissions.

## Impact

- Affected files include `lib/db/schema.ts`, Canvas data access/model helpers under `lib/`, `components/app-sidebar.tsx`, `components/course-workspace.tsx`, `components/assignment-explorer.tsx`, and `app/courses/[course_id]/page.tsx`.
- Uses the existing DLSU Canvas REST/cache model represented by `canvasCourses`, `canvasCourseNicknames`, `canvasEnrollments`, `canvasAssignmentGroups`, `canvasAssignments`, `canvasSubmissions`, `canvasDiscussionTopics`, `canvasModules`, `canvasModuleItems`, `canvasFolders`, `canvasFiles`, `canvasCalendarEvents`, and `canvasTodoItems`.
- UI implementation must use installed shadcn/radix-nova components and conventions, including `Sidebar`, `Tabs`, `ToggleGroup`, `Card`, `Table`, `Badge`, `Skeleton`, `Sheet`, `Tooltip`, and lucide icons.
- No new external dependency is expected unless implementation discovers the installed Drizzle relation API requires a package-level adjustment.
