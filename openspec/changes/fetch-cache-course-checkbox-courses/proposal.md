## Why

The course checkbox list currently relies on static mock data and cannot reliably reflect the user's Canvas course availability. The picker needs a Canvas-backed discovery flow that fetches active and completed courses, hides date-restricted courses, persists the result, and avoids repeated Canvas calls within a one-day cache window.

## What Changes

- Fetch active student courses and completed student courses from DLSU Canvas when the course checkbox list is opened and a refresh is needed.
- Combine both course responses into one persisted JSON-backed course list.
- Exclude courses where `access_restricted_by_date` is `true`.
- Use the Canvas `course_code` field as the checkbox list's primary display label.
- Cache the fetched course list in the database and prevent another Canvas fetch until the stored result is at least one day old.
- Move Canvas request headers, including `Accept`, `Connection`, `User-Agent`, and `Cookie`, to environment-backed configuration.
- Add Cancel and Fetch actions with lucide icons to the checkbox list.

## Capabilities

### New Capabilities
- `course-picker-canvas-sync`: Canvas-backed course discovery, filtering, caching, persistence, and checkbox picker controls.

### Modified Capabilities

## Impact

- Affects the course picker UI in `components/course-picker.tsx`.
- Adds or updates server-side Canvas course fetch logic, database persistence, and cache freshness checks.
- Uses existing Canvas course database tables or adds a narrowly scoped cache/persistence model if needed.
- Requires `.env` entries for Canvas request header values, especially the Canvas cookie.
