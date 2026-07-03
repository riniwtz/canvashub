## 1. Configuration

- [x] 1.1 Add server-only Canvas course header env var names for `CANVAS_COURSES_ACCEPT`, `CANVAS_COURSES_CONNECTION`, `CANVAS_COURSES_USER_AGENT`, and `CANVAS_COURSES_COOKIE`.
- [x] 1.2 Add tracked placeholder documentation for the Canvas course env vars without committing real cookie values.
- [x] 1.3 Implement a server-only helper that validates required Canvas course env vars and builds the outbound request headers.

## 2. Canvas Fetching

- [x] 2.1 Create a Canvas course discovery module for active and completed student course endpoints.
- [x] 2.2 Implement `Link` header pagination for Canvas course responses.
- [x] 2.3 Normalize Canvas course IDs to strings and preserve each raw Canvas course object.
- [x] 2.4 Combine active and completed course arrays, de-duplicate by Canvas course ID, and filter out `access_restricted_by_date === true`.

## 3. Database Cache

- [x] 3.1 Implement database reads for the combined course picker cache and its last successful sync timestamp.
- [x] 3.2 Enforce the 24-hour cache gate so fresh cached data is returned without calling Canvas.
- [x] 3.3 Upsert filtered course records into `canvas_courses` with mapped fields and raw JSON.
- [x] 3.4 Persist the combined filtered picker JSON and successful fetch timestamp in `canvas_api_sync_state`.
- [x] 3.5 Return previously persisted courses when Canvas fetching fails after cached data already exists.

## 4. API Boundary

- [x] 4.1 Add a Node runtime route handler for loading available Canvas courses for the picker.
- [x] 4.2 Ensure the route returns only UI-safe course fields and never returns Canvas cookie or configured request header values.
- [x] 4.3 Return clear error responses for missing database configuration, missing Canvas env vars, and Canvas request failures.

## 5. Picker UI

- [x] 5.1 Replace the static mock course array in `CourseCheckboxList` with data loaded from the route when the picker opens.
- [x] 5.2 Render checkbox rows using `course_code` as the primary label with a safe fallback for missing codes.
- [x] 5.3 Add Fetch and Cancel buttons using lucide icons and existing button styling.
- [x] 5.4 Wire Fetch to start the course load and display loading, disabled, and error states.
- [x] 5.5 Wire Cancel to abort an in-flight request and clear the in-flight loading state.
- [x] 5.6 Preserve checkbox selection behavior against the loaded Canvas course IDs.

## 6. Verification

- [x] 6.1 Add focused tests or mocks for combining, de-duplicating, date-restricted filtering, and the 24-hour cache decision.
- [x] 6.2 Verify the route does not call Canvas when cached data is less than 24 hours old.
- [x] 6.3 Verify the picker renders fetched course codes and hides date-restricted courses.
- [x] 6.4 Run the project lint/build checks relevant to this Next.js app.
