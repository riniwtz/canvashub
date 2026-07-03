## MODIFIED Requirements

### Requirement: Course page supports every configured course
The system SHALL provide a `/courses/[course_id]` page for every active Canvas-backed course available in the local Canvas cache.

#### Scenario: Canvas-backed course page loads
- **WHEN** a user navigates to `/courses/[course_id]` for an active cached Canvas-backed course
- **THEN** the system renders that course's workspace

### Requirement: Unsupported course ids are rejected
The system SHALL reject `course_id` values for `/courses/[course_id]` that do not resolve to an active cached Canvas-backed course.

#### Scenario: Unsupported course page is requested
- **WHEN** a user navigates to `/courses/unknown`
- **THEN** the system renders the not-found state

### Requirement: Course workspace identifies the selected course
The course page SHALL display the selected Canvas-backed course identity using the best available nickname, course code, original name, title, section, term, or instructor/enrollment data.

#### Scenario: Canvas course identity is visible
- **WHEN** a user views a Canvas-backed course page
- **THEN** the page identifies the selected course using cached Canvas course metadata

### Requirement: Course workspace contains required tabs
Every Canvas-backed course page SHALL contain course item navigation for Overview, Syllabus, Modules, Announcements, Assignments, Discussions, Grades, People, Files, Calendar, and Meetings when those sections are available from cached Canvas data, and SHALL provide clear unavailable states when a section has no cached data.

#### Scenario: Available course item sections are rendered
- **WHEN** a user views a Canvas-backed course with cached modules, assignments, announcements, discussions, files, calendar events, enrollments, and submissions
- **THEN** the page displays navigation for the corresponding course item sections

#### Scenario: Unavailable course item section is rendered
- **WHEN** a user views a Canvas-backed course section with no cached records
- **THEN** the page displays an empty or unavailable state for that section

### Requirement: Home tab is the default course tab
The course page SHALL show the Overview or Home section as the initial selected section when a user opens a supported Canvas-backed course route.

#### Scenario: Course route opens to Overview
- **WHEN** a user navigates directly to `/courses/[course_id]` for an active cached Canvas-backed course
- **THEN** the Overview or Home section is selected by default

## ADDED Requirements

### Requirement: Modules section renders Canvas module item layout
The Modules section SHALL render cached Canvas modules in Canvas position order with their module items grouped under the owning module.

#### Scenario: Course has modules and module items
- **WHEN** a Canvas-backed course has cached modules and module items
- **THEN** the Modules section displays ordered module groups and ordered items for each module

### Requirement: Announcements and discussions use Canvas discussion topics
The workspace SHALL separate Canvas announcements from regular discussions using the cached discussion topic announcement flag.

#### Scenario: Course has announcements and discussions
- **WHEN** cached discussion topics include announcement and non-announcement topics
- **THEN** announcements appear in the Announcements section and non-announcement topics appear in the Discussions section

### Requirement: Grades and people use Canvas enrollment data
The workspace SHALL use cached Canvas enrollment, user, grade, and submission data for Grades and People sections when available.

#### Scenario: Course has enrollment and grade data
- **WHEN** a Canvas-backed course has cached enrollment grades and submissions
- **THEN** the Grades section shows grade and feedback context from the cached records

#### Scenario: Course has people data
- **WHEN** a Canvas-backed course has cached enrollment and user records
- **THEN** the People section shows course participants from those cached records

### Requirement: Files and calendar sections use Canvas files and events
The workspace SHALL use cached Canvas folder, file, calendar event, and to-do item data for Files and Calendar sections.

#### Scenario: Course has files
- **WHEN** a Canvas-backed course has cached folder and file records
- **THEN** the Files section displays the available files with folder context when available

#### Scenario: Course has calendar events or to-do items
- **WHEN** a Canvas-backed course has cached calendar events or to-do items
- **THEN** the Calendar section displays dated course events and upcoming work

### Requirement: Course workspace uses shadcn components
The course workspace UI SHALL use installed shadcn primitives for tabs, cards, badges, tables, loading states, and overlays.

#### Scenario: Course workspace is rendered
- **WHEN** a Canvas-backed course workspace renders
- **THEN** it uses shadcn `Tabs`, `Card`, `Badge`, `Table`, `Skeleton`, `Sheet`, `Tooltip`, and related primitives where those interaction patterns are needed
