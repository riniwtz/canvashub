## Context

`CourseCheckboxList` is a client component rendered inside the sidebar's "Fetch from Canvas" dialog. It currently displays mock course data and contains incomplete direct calls to the DLSU Canvas courses endpoint. The project already has Drizzle/PostgreSQL tables for Canvas course records, raw JSON payloads, and API sync state, so the implementation can use existing persistence instead of introducing a separate cache store.

The Canvas request must be performed server-side because the Canvas cookie and configured request headers are secrets and must not be exposed to the browser. This app uses the Next App Router, where Route Handlers are valid inside `app/` and are not cached by default, which fits a server-only fetch-and-cache endpoint.

## Goals / Non-Goals

**Goals:**
- Fetch active and completed DLSU Canvas student courses for the checkbox picker.
- Combine both endpoint result sets into one list, de-duplicate by Canvas course ID, and remove entries where `access_restricted_by_date === true`.
- Persist the combined JSON result and course rows in the database.
- Serve cached course picker data until one day has elapsed since the last successful remote fetch.
- Render the checkbox list from the persisted combined course list using `course_code` as the primary label.
- Keep Canvas cookie and all configured Canvas request headers in `.env` and server-only code.
- Add Fetch and Cancel controls with lucide icons and useful loading/error states.

**Non-Goals:**
- Implement Canvas OAuth or multi-user account linking.
- Sync assignments, modules, submissions, files, or other course content.
- Change course workspace behavior beyond making fetched course rows available through existing persistence.

## Decisions

1. Add a server-only course discovery module and expose it through a Node runtime Route Handler.

   The picker should call a route such as `app/api/canvas/courses/available/route.ts`. The handler will read runtime env vars, call the Canvas API only when stale or empty, upsert database records, and return a UI-safe course list. A Route Handler is preferred over direct client fetches because the cookie remains server-only, and it is preferred over a Server Function here because the client can cancel an in-flight HTTP request with `AbortController`.

2. Use the existing Canvas schema for persistence.

   Upsert individual courses into `canvas_courses` using `canvas_id` and save the full raw Canvas object in `raw`. Use `canvas_api_sync_state` with a key such as `courses:student:active-completed` to store `last_synced_at` and the combined filtered JSON in `metadata`. This satisfies the requirement to store the fetched JSON in the database without adding a new table unless implementation finds the metadata payload is too large.

3. Treat the one-day cache window as 24 hours after the last successful remote fetch.

   The route returns the persisted combined list when `last_synced_at` is less than 24 hours old. Opening the checkbox list calls the route, but the route must not call Canvas again while the cache is fresh. A Fetch button can request data through the same route, but the server still enforces the one-day gate.

4. Centralize Canvas request headers in an env-backed header builder.

   Use server-only env vars for the requested headers, for example:
   - `CANVAS_COURSES_ACCEPT`
   - `CANVAS_COURSES_CONNECTION`
   - `CANVAS_COURSES_USER_AGENT`
   - `CANVAS_COURSES_COOKIE`

   Additional Canvas headers should follow the same prefix and be read in one place. The implementation should set `export const runtime = "nodejs"` for the route because the database client and Canvas request behavior require the Node runtime. If the runtime HTTP client rejects hop-by-hop headers such as `Connection`, implementation must resolve that with the Node HTTP client layer rather than moving the secret headers client-side.

5. Follow Canvas pagination and normalize Canvas IDs as strings.

   Fetch both:
   - `/api/v1/courses?enrollment_type=student&enrollment_state=active&per_page=100`
   - `/api/v1/courses?enrollment_type=student&enrollment_state=completed&per_page=100`

   Continue through `Link: rel="next"` pagination for both result sets. Normalize Canvas `id` to a string for storage and UI identifiers, matching the existing schema's 64-bit ID handling.

6. Keep the picker UI state local and minimal.

   On dialog open, load available courses from the route and render checkboxes from the returned list. The label should prioritize `course_code`, with a secondary fallback such as `name` only for courses missing a code. The Cancel button aborts the in-flight request if one exists and closes or resets the picker state according to the dialog wiring. The Fetch button starts the load request and reflects disabled/loading states.

## Risks / Trade-offs

- Canvas cookie expires or becomes invalid -> Return a clear server error to the picker and keep previously persisted courses available if present.
- Canvas pagination is ignored -> Large course histories may be truncated. Mitigate with a reusable `Link` pagination helper and tests for multi-page responses.
- `Connection` header handling differs by runtime -> Keep the route in the Node runtime and verify the header builder/request path during implementation.
- Combined JSON in sync metadata grows unexpectedly -> If the payload becomes too large for practical sync-state metadata, add a narrowly scoped `canvas_course_discovery_cache` table and keep `canvas_api_sync_state` as the freshness tracker.
- One-day server gate can make manual refresh feel inert -> Show cache freshness or disabled state in the picker so users understand why Canvas is not being called again.

## Migration Plan

1. Add the server course discovery module and route handler.
2. Add any required Drizzle migration only if existing `canvas_courses` and `canvas_api_sync_state` cannot store the combined result cleanly.
3. Replace the mock `CourseCheckboxList` data source with the route response.
4. Add `.env.example` entries for the Canvas course header variables without committing real cookie values.
5. Verify fresh, cached, error, and cancel flows.

Rollback is to revert the route/module/UI changes; existing course rows can remain because they use the current Canvas cache schema.

## Open Questions

- Should completed courses be visually distinguished from active courses in the checkbox list, or is a single combined list sufficient for the first implementation?
- Should the Fetch button close the dialog after a successful fetch, or keep it open for course selection?
