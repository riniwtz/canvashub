## ADDED Requirements

### Requirement: Canvas cache schema is type-safe
The system SHALL expose Canvas cache table and relation definitions that compile under the installed TypeScript and Drizzle versions.

#### Scenario: Schema typecheck succeeds
- **WHEN** the project runs `npx tsc --noEmit --pretty false`
- **THEN** `lib/db/schema.ts` compiles without Drizzle relation import or implicit callback parameter errors

### Requirement: Canvas course records produce route-ready course models
The system SHALL build course models from Canvas cache records using string Canvas IDs as stable identifiers and display names from nickname, course code, original name, or name data.

#### Scenario: Course model is built from cached Canvas data
- **WHEN** an active cached Canvas course has a `canvasId`, `courseCode`, and optional nickname
- **THEN** the course model includes a route key, display label, secondary label, Canvas ID, and source timestamps without converting Canvas IDs to numbers

### Requirement: Canvas course item groups are normalized
The system SHALL normalize cached Canvas course items into course section data for syllabus, modules, assignments, announcements, discussions, grades/submissions, people/enrollments, files, calendar events, and to-do items when those records exist.

#### Scenario: Course item groups are resolved
- **WHEN** a cached course has related modules, module items, assignments, discussion topics, files, calendar events, todo items, enrollments, and submissions
- **THEN** the course data model exposes those records as typed section view data for the course workspace

#### Scenario: Missing course item groups are represented safely
- **WHEN** a cached course has no records for a course item group
- **THEN** the course data model exposes an empty section state rather than throwing or hiding the course

### Requirement: Canvas assignment data includes submission context
The system SHALL join Canvas assignments with assignment groups and the current user's submissions when cached submission data is available.

#### Scenario: Assignment has cached submission
- **WHEN** a cached assignment has a related submission for the current user
- **THEN** the assignment view data includes due date, points, grading type, workflow state, submission state, score or grade, lateness, missing state, and Canvas URLs when available

#### Scenario: Assignment has no cached submission
- **WHEN** a cached assignment has no related submission for the current user
- **THEN** the assignment view data still includes assignment details and marks submission-specific fields as unavailable

### Requirement: Direct Canvas API reads follow DLSU conventions
Any new direct Canvas API read introduced by this change SHALL use the DLSU Canvas API root, bearer authentication, Canvas string IDs, and Link-header pagination.

#### Scenario: New Canvas API reader is added
- **WHEN** implementation adds a Canvas REST request for courses, assignments, submissions, enrollments, modules, discussions, files, calendar events, or to-do items
- **THEN** the request uses `https://dlsu.instructure.com/api/v1`, an `Authorization: Bearer` header, `Accept: application/json+canvas-string-ids`, and follows `rel="next"` links for pagination
