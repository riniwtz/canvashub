## ADDED Requirements

### Requirement: Assignments tab lists mock assignments
The Assignments tab SHALL provide a mock list of exactly 10 assignments for the selected course.

#### Scenario: Assignments tab opens
- **WHEN** a user opens the Assignments tab for `/courses/cssweng`
- **THEN** the assignment experience has 10 mock assignments available to render

### Requirement: Assignment filters are available
The Assignments tab SHALL provide filters named Upcoming, Undated, Past, and Overdue.

#### Scenario: Assignment filters render
- **WHEN** a user views the Assignments tab
- **THEN** the filters Upcoming, Undated, Past, and Overdue are available

### Requirement: Assignment filters limit visible assignments
Selecting an assignment filter SHALL show only assignments matching that filter's category.

#### Scenario: Upcoming assignments are filtered
- **WHEN** a user selects the Upcoming filter
- **THEN** only assignments categorized as upcoming are shown

#### Scenario: Undated assignments are filtered
- **WHEN** a user selects the Undated filter
- **THEN** only assignments categorized as undated are shown

#### Scenario: Past assignments are filtered
- **WHEN** a user selects the Past filter
- **THEN** only assignments categorized as past are shown

#### Scenario: Overdue assignments are filtered
- **WHEN** a user selects the Overdue filter
- **THEN** only assignments categorized as overdue are shown

### Requirement: Assignment search is available
The Assignments tab SHALL provide a search bar that filters visible assignments by user-entered text.

#### Scenario: Search filters assignment results
- **WHEN** a user enters text in the assignment search bar
- **THEN** the visible assignment results are limited to assignments matching the search text

### Requirement: Assignment views are available
The Assignments tab SHALL provide table, kanban board, calendar, and card views.

#### Scenario: Assignment view controls render
- **WHEN** a user views the Assignments tab
- **THEN** controls are available for table, kanban board, calendar, and card views

### Requirement: Table view shows assignment rows
The table view SHALL show assignments in rows with core assignment details.

#### Scenario: User opens table view
- **WHEN** a user selects the table view
- **THEN** matching assignments are displayed as table rows

### Requirement: Kanban board view groups assignments by status
The kanban board view SHALL group assignments by Upcoming, Undated, Past, and Overdue columns.

#### Scenario: User opens kanban board view
- **WHEN** a user selects the kanban board view
- **THEN** matching assignments are displayed in status-based kanban columns

### Requirement: Calendar view places dated assignments by due date
The calendar view SHALL place assignments with due dates on their due-date positions and keep undated assignments discoverable.

#### Scenario: User opens calendar view
- **WHEN** a user selects the calendar view
- **THEN** matching dated assignments are shown by due date and undated assignments remain visible in an undated area

### Requirement: Card view shows assignment summaries
The card view SHALL show assignments as cards with summary details.

#### Scenario: User opens card view
- **WHEN** a user selects the card view
- **THEN** matching assignments are displayed as cards

### Requirement: Search and filters apply across all assignment views
Search and selected filters SHALL apply consistently to table, kanban board, calendar, and card views.

#### Scenario: User switches views after filtering
- **WHEN** a user searches for an assignment, selects Overdue, and switches from table view to card view
- **THEN** the card view shows the same filtered assignment result set as the table view
