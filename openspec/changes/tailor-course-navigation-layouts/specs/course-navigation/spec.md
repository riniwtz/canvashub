## MODIFIED Requirements

### Requirement: Courses navigation exposes required course children
The Courses navigation item SHALL expose one child item for each active Canvas-backed course available in the local Canvas cache.

#### Scenario: Canvas-backed course children are visible
- **WHEN** a user views or expands the Courses navigation item and active cached Canvas courses exist
- **THEN** each active Canvas-backed course is available as a Courses child item

#### Scenario: Canvas-backed course labels are readable
- **WHEN** a cached course has a nickname, course code, original name, or name
- **THEN** the Courses child item uses the best available readable label for that course

### Requirement: Course children route to course pages
Each Courses child item SHALL link to `/courses/[course_id]` using the course's resolved Canvas route key as the `course_id`.

#### Scenario: User opens a Canvas-backed course child
- **WHEN** a user clicks a Courses child for a cached Canvas course
- **THEN** the app navigates to `/courses/[course_id]` for that course's resolved route key

#### Scenario: Every active Canvas-backed course child is routable
- **WHEN** active cached Canvas courses are listed in the Courses navigation item
- **THEN** each child item links to a course page route that can resolve the same Canvas-backed course

### Requirement: Course route navigation state is reflected
The navigation SHALL identify the Courses item and the matching Canvas-backed course child as active when the current route is a supported Canvas-backed course route.

#### Scenario: Active Canvas course route is highlighted
- **WHEN** the current path is `/courses/[course_id]` for a cached Canvas-backed course
- **THEN** Courses is treated as the active navigation section and the matching Canvas-backed course child is treated as the active child

## ADDED Requirements

### Requirement: Course navigation reflects available course item groups
The course navigation experience SHALL make each course's available Canvas item groups discoverable from the course entry or course page navigation.

#### Scenario: Course has cached item groups
- **WHEN** a cached Canvas course has modules, assignments, announcements, discussions, files, calendar events, or to-do items
- **THEN** the navigation experience exposes those available item groups for that course

#### Scenario: Course has no cached item groups
- **WHEN** a cached Canvas course has no related course item records
- **THEN** the navigation experience still exposes the course and provides an empty or unavailable state for its item groups

### Requirement: Course navigation uses shadcn components
The course navigation UI SHALL use installed shadcn navigation primitives and the configured lucide icon library.

#### Scenario: Course navigation is rendered
- **WHEN** the app sidebar and course navigation controls render
- **THEN** they use shadcn `Sidebar`, `Collapsible`, `Tooltip`, and related menu primitives with lucide icons rather than custom navigation widgets
