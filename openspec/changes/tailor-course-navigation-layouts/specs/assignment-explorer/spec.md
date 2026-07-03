## MODIFIED Requirements

### Requirement: Assignments tab lists mock assignments
The Assignments tab SHALL provide Canvas-backed assignments for the selected course from the local Canvas cache instead of mock assignments.

#### Scenario: Assignments tab opens
- **WHEN** a user opens the Assignments tab for a Canvas-backed course with cached assignments
- **THEN** the assignment experience renders the cached assignments available for that course

#### Scenario: Assignments tab has no cached assignments
- **WHEN** a user opens the Assignments tab for a Canvas-backed course with no cached assignments
- **THEN** the assignment experience renders an empty state instead of mock assignments

## ADDED Requirements

### Requirement: Assignment status derives from Canvas data
The Assignments tab SHALL derive assignment status from cached Canvas due dates, lock/unlock dates, workflow state, and submission state.

#### Scenario: Assignment is upcoming
- **WHEN** a cached assignment has a future due date and is not submitted
- **THEN** the assignment can appear in the Upcoming filter

#### Scenario: Assignment is overdue
- **WHEN** a cached assignment has a past due date and the current user's cached submission is missing, late, or unsubmitted
- **THEN** the assignment can appear in the Overdue filter

#### Scenario: Assignment is past
- **WHEN** a cached assignment has a past due date and the current user's cached submission is submitted or graded
- **THEN** the assignment can appear in the Past filter

#### Scenario: Assignment is undated
- **WHEN** a cached assignment has no due date
- **THEN** the assignment can appear in the Undated filter

### Requirement: Assignment views expose Canvas assignment details
The table, kanban board, calendar, and card views SHALL display assignment details from Canvas assignment and submission cache records.

#### Scenario: Canvas-backed assignment details render
- **WHEN** a cached assignment has name, due date, points possible, assignment group, submission type, workflow state, score, grade, lateness, missing state, and Canvas URL data
- **THEN** the assignment views display the available details in their respective layouts

#### Scenario: Partial Canvas-backed assignment details render
- **WHEN** a cached assignment is missing optional Canvas fields
- **THEN** the assignment views display available details and avoid broken or placeholder mock values

### Requirement: Assignment explorer uses shadcn components
The assignment explorer UI SHALL use installed shadcn primitives for search, filters, view switching, tables, cards, badges, loading states, and empty states.

#### Scenario: Assignment controls render
- **WHEN** the assignment explorer renders search, filters, and view controls
- **THEN** it uses shadcn `Input`, `ToggleGroup`, `Table`, `Card`, `Badge`, `Skeleton`, and empty-state primitives where those patterns are needed
