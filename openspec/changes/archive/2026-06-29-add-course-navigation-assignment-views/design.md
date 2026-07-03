## Context

The app is a Next.js App Router project using a shared sidebar layout, shadcn/ui-style primitives, Tailwind CSS, and lucide-react icons. The current sidebar already contains course data and course-related UI, but the course links point to local hash anchors instead of real course routes, and there is no `/courses/[course_id]` page yet.

This change formalizes course navigation and introduces a reusable course workspace page. The initial assignment experience will use mock data only, so no database, API, authentication, or persistence layer is required.

Before implementation, read the relevant Next.js 16 documentation in `node_modules/next/dist/docs/` for App Router dynamic routes and any route/page conventions touched by this change.

## Goals / Non-Goals

**Goals:**

- Make Dashboard, Contacts, and Courses the primary navigation entries.
- Make Courses expandable/collapsible with children for `cssweng`, `csmodel`, `csnetwk`, and `sthciux`.
- Navigate each course child to `/courses/[course_id]`.
- Render a valid course workspace for every supported course id.
- Provide the required course tabs: Home, Syllabus, Modules, Announcements, Assignments, Discussions, Grades, People, and Zoom.
- Implement the Assignments tab with 10 mock assignments, status filters, search, and table, kanban board, calendar, and card views.
- Keep the UI consistent with existing sidebar, tabs, input, button, and layout styling.

**Non-Goals:**

- Persisting assignments or course content.
- Loading real course data from an API.
- Adding authentication or authorization.
- Building complete content for non-assignment course tabs beyond useful placeholder states.
- Adding per-tab URLs unless implementation naturally supports it without broad routing changes.

## Decisions

### Use a small shared course catalog

Define a local catalog for the four supported courses with lower-case ids, display codes, and titles. Use this catalog for both sidebar children and dynamic route validation.

Alternative considered: duplicate course arrays in sidebar and route code. Rejected because duplicated ids increase the chance that navigation routes and route validation drift apart.

### Use `/courses/[course_id]` as the single dynamic route

Create one dynamic route that validates `course_id` against the course catalog. Unsupported course ids should render the framework's not-found behavior.

Alternative considered: one static route per course. Rejected because all four courses share the same page structure and differ only by metadata/mock content.

### Keep course tabs page-local

Use an in-page tab component for Home, Syllabus, Modules, Announcements, Assignments, Discussions, Grades, People, and Zoom. The Assignments tab owns the assignment browser UI.

Alternative considered: nested routes per course tab. Rejected for now because the request only requires tabs in the course page and nested routing would add complexity without current deep-link requirements.

### Keep assignment state client-side

Use a client component for assignment search, filter selection, and view switching. Store the selected filter, view, and search query in component state. Filter the static mock assignments in memory.

Alternative considered: server-render all filter/view combinations. Rejected because the interaction is local, small, and based on mock data.

### Represent assignment categories explicitly

Each mock assignment should include enough fields to drive every view: id, title, course id, status/category (`upcoming`, `undated`, `past`, `overdue`), optional due date, module/unit label, points, submission state, and short description.

Alternative considered: infer categories entirely from dates. Rejected because the mock list must include an undated bucket and predictable overdue/past examples without relying on the current date.

### Build views from one filtered collection

The table, kanban, calendar, and card views should all render the same searched and filtered assignment list. View switching changes presentation only, not the underlying result set.

Alternative considered: separate mock datasets per view. Rejected because search/filter behavior would become inconsistent.

## Risks / Trade-offs

- Mock data can feel real enough to imply persistence -> Make copy and implementation boundaries clear through local constants and avoid API-shaped abstractions until real data exists.
- Page-local tabs are not deep-linkable -> Accept for this iteration; add URL-backed tabs later if navigation requirements expand.
- Calendar view with no calendar library may be basic -> Implement a lightweight month/list grid sufficient for 10 mock assignments, avoiding a new dependency unless design quality requires it.
- Sidebar course links may need active styling across dynamic routes -> Derive active state from `pathname` and course ids so the Courses parent and selected child reflect `/courses/[course_id]`.
