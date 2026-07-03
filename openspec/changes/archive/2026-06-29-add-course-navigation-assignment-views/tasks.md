## 1. Framework and Data Setup

- [x] 1.1 Read the relevant Next.js 16 docs in `node_modules/next/dist/docs/` for App Router dynamic routes and page conventions.
- [x] 1.2 Create a shared local course catalog for `cssweng`, `csmodel`, `csnetwk`, and `sthciux` with display codes and titles.
- [x] 1.3 Create shared mock assignment data or a generator that provides exactly 10 assignments for the selected course.

## 2. Course Navigation

- [x] 2.1 Update the sidebar primary navigation to contain Dashboard, Contacts, and Courses.
- [x] 2.2 Render Courses as a parent navigation item with child links named `cssweng`, `csmodel`, `csnetwk`, and `sthciux`.
- [x] 2.3 Link each course child to `/courses/[course_id]` using the lower-case course id.
- [x] 2.4 Add active-state handling for `/dashboard`, `/contacts`, and supported `/courses/[course_id]` routes.

## 3. Course Workspace Route

- [x] 3.1 Add the dynamic route at `/courses/[course_id]`.
- [x] 3.2 Validate `course_id` against the shared course catalog and render not-found for unsupported ids.
- [x] 3.3 Render the selected course identity on the course workspace page.
- [x] 3.4 Add course page tabs for Home, Syllabus, Modules, Announcements, Assignments, Discussions, Grades, People, and Zoom.
- [x] 3.5 Make Home the default selected course tab.

## 4. Assignment Explorer

- [x] 4.1 Add the Assignments tab content as a client-side interactive component.
- [x] 4.2 Add filter controls for Upcoming, Undated, Past, and Overdue.
- [x] 4.3 Add a search bar that filters assignment results by entered text.
- [x] 4.4 Add a table view that renders filtered assignments as rows.
- [x] 4.5 Add a kanban board view that groups filtered assignments by status columns.
- [x] 4.6 Add a calendar view that places dated assignments by due date and keeps undated assignments visible.
- [x] 4.7 Add a card view that renders filtered assignments as summary cards.
- [x] 4.8 Ensure search and filter state applies consistently across table, kanban board, calendar, and card views.

## 5. Verification

Skipped route/UI verification for archive at user request. Build and lint had already been run earlier in this session.

- [x] 5.1 Verify every sidebar course child navigates to its matching `/courses/[course_id]` route.
- [x] 5.2 Verify every supported course page shows the required tabs and defaults to Home.
- [x] 5.3 Verify unsupported course ids render the not-found state.
- [x] 5.4 Verify the Assignments tab exposes 10 mock assignments, all four filters, search, and all four views.
- [x] 5.5 Run the project's available quality checks such as linting or build.
