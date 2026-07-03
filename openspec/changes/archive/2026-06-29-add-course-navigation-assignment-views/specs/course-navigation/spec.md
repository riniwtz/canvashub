## ADDED Requirements

### Requirement: Primary navigation contains required items
The system SHALL present the primary navigation with Dashboard, Contacts, and Courses as the navigation items.

#### Scenario: Primary navigation is rendered
- **WHEN** a user views the application sidebar
- **THEN** the navigation displays Dashboard, Contacts, and Courses

### Requirement: Courses navigation exposes required course children
The Courses navigation item SHALL expose child items called `cssweng`, `csmodel`, `csnetwk`, and `sthciux`.

#### Scenario: Courses children are visible
- **WHEN** a user expands or views the Courses navigation item
- **THEN** the child items `cssweng`, `csmodel`, `csnetwk`, and `sthciux` are available

### Requirement: Course children route to course pages
Each Courses child item SHALL link to `/courses/[course_id]` using its child name as the `course_id`.

#### Scenario: User opens a course child
- **WHEN** a user clicks the `cssweng` course child
- **THEN** the app navigates to `/courses/cssweng`

#### Scenario: User opens every supported course child
- **WHEN** a user clicks `csmodel`, `csnetwk`, or `sthciux`
- **THEN** the app navigates to `/courses/csmodel`, `/courses/csnetwk`, or `/courses/sthciux` respectively

### Requirement: Course route navigation state is reflected
The navigation SHALL identify the Courses item and the matching course child as active when the current route is a supported course route.

#### Scenario: Active course route is highlighted
- **WHEN** the current path is `/courses/csnetwk`
- **THEN** Courses is treated as the active navigation section and `csnetwk` is treated as the active child
