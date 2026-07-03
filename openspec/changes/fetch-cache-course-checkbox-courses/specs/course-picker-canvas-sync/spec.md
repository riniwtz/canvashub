## ADDED Requirements

### Requirement: Course picker loads Canvas-backed courses
The system SHALL load the course checkbox list from DLSU Canvas course data instead of static mock data.

#### Scenario: Picker opens without a fresh cache
- **WHEN** the course checkbox list is opened and no successful course discovery fetch exists from the past 24 hours
- **THEN** the system fetches active student courses and completed student courses from DLSU Canvas
- **AND** the system combines the fetched course arrays into one picker course list

#### Scenario: Picker opens with a fresh cache
- **WHEN** the course checkbox list is opened and a successful course discovery fetch exists from less than 24 hours ago
- **THEN** the system loads the persisted combined course list from the database
- **AND** the system does not request the active or completed courses endpoints from DLSU Canvas

### Requirement: Course discovery filters date-restricted courses
The system SHALL exclude any course where `access_restricted_by_date` is `true` from the combined picker course list.

#### Scenario: Canvas returns a date-restricted course
- **WHEN** active or completed Canvas course results include a course with `access_restricted_by_date` equal to `true`
- **THEN** that course is absent from the checkbox list
- **AND** that course is absent from the persisted combined picker JSON

#### Scenario: Canvas returns unrestricted courses
- **WHEN** active or completed Canvas course results include courses where `access_restricted_by_date` is `false` or missing
- **THEN** those courses remain eligible for the combined picker course list

### Requirement: Course discovery persists fetched JSON
The system SHALL store the combined filtered Canvas course JSON in the database after a successful remote fetch.

#### Scenario: Canvas fetch succeeds
- **WHEN** both active and completed Canvas course requests complete successfully
- **THEN** the system persists the combined filtered JSON result in the database
- **AND** the system records the successful fetch time used for the 24-hour cache window

#### Scenario: Canvas courses are persisted as course records
- **WHEN** a combined filtered course has a Canvas course ID
- **THEN** the system stores or updates a matching database course record using that Canvas course ID
- **AND** the system stores the original Canvas course object in the course record's raw JSON field

### Requirement: Course picker uses course codes
The course checkbox list SHALL use each Canvas course's `course_code` as the primary visible course label.

#### Scenario: Course code is available
- **WHEN** a picker course includes `course_code`
- **THEN** the checkbox row displays that `course_code` as the primary course text

#### Scenario: Course code is missing
- **WHEN** a picker course does not include `course_code`
- **THEN** the checkbox row remains selectable using a safe fallback label

### Requirement: Canvas course requests use environment-backed headers
The system SHALL read Canvas course request headers from server-side environment variables.

#### Scenario: Canvas course request is made
- **WHEN** the system requests active or completed Canvas courses
- **THEN** the request uses environment-derived values for `Accept`, `Connection`, `User-Agent`, and `Cookie`

#### Scenario: Picker is rendered in the browser
- **WHEN** the course checkbox list renders in the client
- **THEN** the Canvas cookie and configured Canvas request header values are not exposed to client-side JavaScript

### Requirement: Course picker exposes fetch and cancel controls
The course checkbox list SHALL include Fetch and Cancel controls that use lucide icons.

#### Scenario: User starts course loading
- **WHEN** the user activates the Fetch control
- **THEN** the picker starts loading the available Canvas-backed course list
- **AND** the Fetch control communicates the loading state

#### Scenario: User cancels course loading
- **WHEN** the user activates the Cancel control during an in-flight course load
- **THEN** the picker cancels the active load request
- **AND** the picker stops showing the in-flight loading state
