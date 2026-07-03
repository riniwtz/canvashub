## Why

Students need a clear path from the app navigation into each active course workspace, and each course needs a consistent place to review assignments in multiple planning formats. This change turns the existing course/sidebar concepts into routable course pages with assignment discovery views that support scanning, filtering, and search.

## What Changes

- Update the primary navigation so it consists of Dashboard, Contacts, and Courses.
- Add the required course children under Courses: CSSWENG, CSMODEL, CSNETWK, and STHCIUX.
- Route course children to `/courses/[course_id]`, using the lower-case course id in the URL.
- Add a dynamic course route page for every supported course.
- Add course page tabs for Home, Syllabus, Modules, Announcements, Assignments, Discussions, Grades, People, and Zoom.
- Add an Assignments tab experience with 10 mock assignments.
- Provide assignment filters for Upcoming, Undated, Past, and Overdue.
- Provide assignment search.
- Provide table, kanban board, calendar, and card views for assignments.

## Capabilities

### New Capabilities

- `course-navigation`: Covers the app-level Dashboard, Contacts, and Courses navigation, including the required course child links and dynamic course routing.
- `course-workspace`: Covers the `/courses/[course_id]` course page shell and required course tabs.
- `assignment-explorer`: Covers the Assignments tab with mock assignment data, filters, search, and table, kanban, calendar, and card views.

### Modified Capabilities

- None.

## Impact

- Affects the sidebar/navigation components, especially the current course navigation behavior.
- Adds the `/courses/[course_id]` route and course workspace UI.
- Adds mock assignment data and client-side filtering/search/view switching for assignment views.
- May use existing shadcn/ui-style primitives such as sidebar, tabs, input, and buttons, plus any needed table/card layout components already available in the project.
