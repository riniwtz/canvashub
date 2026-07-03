## 1. Schema and Canvas Data Foundation

- [x] 1.1 Fix `lib/db/schema.ts` Drizzle relation imports for the installed `drizzle-orm` version without changing the Canvas table shape.
- [x] 1.2 Run `npx tsc --noEmit --pretty false` and confirm the current schema relation and implicit callback parameter errors are gone.
- [x] 1.3 Add Canvas course data helpers under `lib/` that return serializable course navigation, course workspace, and assignment view models from the Canvas cache schema tables.
- [x] 1.4 Normalize Canvas route keys, display labels, section availability, source timestamps, and empty section states without converting Canvas string IDs to numbers.
- [x] 1.5 Add assignment status derivation from cached due dates, lock/unlock dates, workflow state, and current-user submission data.
- [x] 1.6 If any new direct Canvas API read is added, implement bearer auth, `Accept: application/json+canvas-string-ids`, Link-header pagination, and retry/rate-limit handling.

## 2. shadcn and Next.js Implementation Setup

- [x] 2.1 Run `npx shadcn@latest info --json` and confirm aliases, base, icon library, installed components, and Tailwind CSS path before UI edits.
- [x] 2.2 Run `npx shadcn@latest docs sidebar tabs toggle-group card table badge skeleton sheet tooltip input` and use the returned component docs for affected UI work.
- [x] 2.3 Keep database and Canvas data access in Server Components or server-side helpers, and pass only serializable data into client components.
- [x] 2.4 Preserve the Next.js 16 `params: Promise<{ course_id: string }>` route pattern when updating `/courses/[course_id]`.

## 3. Course Navigation and Routing

- [x] 3.1 Update the app shell/server layer to load Canvas-backed course navigation data and pass it into `AppSidebar`.
- [x] 3.2 Refactor `components/app-sidebar.tsx` to render Canvas-backed course children, item-group availability, labels, links, and active state with shadcn `Sidebar` and `Collapsible` primitives.
- [x] 3.3 Update `app/courses/[course_id]/page.tsx` to resolve courses from Canvas-backed route keys and reject unsupported keys with `notFound()`.
- [x] 3.4 Remove or revise static route generation and `dynamicParams = false` if course availability is no longer compile-time static.
- [x] 3.5 Add navigation empty states for no cached Canvas courses or no cached item groups while keeping supported courses discoverable.

## 4. Course Workspace Layouts

- [x] 4.1 Refactor `components/course-workspace.tsx` to accept the Canvas-backed workspace model instead of static course and mock assignment props.
- [x] 4.2 Render Overview/Home, Syllabus, Modules, Announcements, Assignments, Discussions, Grades, People, Files, Calendar, and Meetings sections based on available Canvas item data.
- [x] 4.3 Implement the Modules section as ordered Canvas module groups with ordered module items.
- [x] 4.4 Split `canvasDiscussionTopics` into Announcements and Discussions using the cached announcement flag.
- [x] 4.5 Render Grades and People from cached enrollments, users, grades, submissions, and rubric data when available.
- [x] 4.6 Render Files and Calendar from cached folders, files, calendar events, and to-do items when available.
- [x] 4.7 Add shadcn `Skeleton`, empty, and unavailable states for missing or stale Canvas section data.

## 5. Assignment Explorer

- [x] 5.1 Refactor `components/assignment-explorer.tsx` to consume Canvas-backed assignment view data rather than `lib/assignments.ts` mock records.
- [x] 5.2 Preserve search, Upcoming, Undated, Past, and Overdue filters across table, kanban, calendar, and card views.
- [x] 5.3 Display Canvas assignment and submission details including due date, points, assignment group, grading type, submission type, workflow state, score/grade, lateness, missing state, and Canvas URL when available.
- [x] 5.4 Render clear empty states when a Canvas-backed course has no cached assignments or filtered results.
- [x] 5.5 Keep all assignment controls and views on installed shadcn primitives and configured lucide icons.

## 6. Verification

- [x] 6.1 Run `npx tsc --noEmit --pretty false`.
- [x] 6.2 Run `npm run lint`.
- [x] 6.3 Run `npm run build`.
- [x] 6.4 Verify the sidebar and course workspace in desktop and mobile viewports, checking active states, no text overlap, and usable empty states.
- [ ] 6.5 Verify a Canvas-backed course with rich cached data and a Canvas-backed course with sparse cached data both render without mock fallback content.
