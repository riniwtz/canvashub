## ADDED Requirements

### Requirement: Course page supports every configured course
The system SHALL provide a `/courses/[course_id]` page for `cssweng`, `csmodel`, `csnetwk`, and `sthciux`.

#### Scenario: Supported course page loads
- **WHEN** a user navigates to `/courses/sthciux`
- **THEN** the system renders the STHCIUX course workspace

### Requirement: Unsupported course ids are rejected
The system SHALL reject unsupported `course_id` values for `/courses/[course_id]`.

#### Scenario: Unsupported course page is requested
- **WHEN** a user navigates to `/courses/unknown`
- **THEN** the system renders the not-found state

### Requirement: Course workspace identifies the selected course
The course page SHALL display the selected course identity using the configured course id, code, or title.

#### Scenario: Course identity is visible
- **WHEN** a user views `/courses/cssweng`
- **THEN** the page identifies the selected course as CSSWENG

### Requirement: Course workspace contains required tabs
Every supported course page SHALL contain tabs named Home, Syllabus, Modules, Announcements, Assignments, Discussions, Grades, People, and Zoom.

#### Scenario: Required tabs are rendered
- **WHEN** a user views `/courses/csmodel`
- **THEN** the page displays tabs for Home, Syllabus, Modules, Announcements, Assignments, Discussions, Grades, People, and Zoom

### Requirement: Home tab is the default course tab
The course page SHALL show the Home tab as the initial selected tab when a user opens a supported course route.

#### Scenario: Course route opens to Home
- **WHEN** a user navigates directly to `/courses/csnetwk`
- **THEN** the Home tab is selected by default
