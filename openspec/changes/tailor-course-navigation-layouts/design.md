## Context

The app is a Next.js 16 App Router project with React Server Components enabled and shadcn/radix-nova UI components installed. Course navigation currently comes from `lib/courses.ts`, course routes are precomputed from that static list, and course content uses mock assignment data. The Canvas cache schema in `lib/db/schema.ts` already covers the Canvas entities needed for course pages, but the file fails `npx tsc --noEmit --pretty false` because `relations` is imported from the wrong Drizzle entrypoint for the installed `drizzle-orm@1.0.0-rc.4`.

The target experience is Canvas-backed but should still be a local-cache UI: page rendering should read normalized data from the database/cache tables, while any direct Canvas API fetching or future sync work must follow DLSU Canvas conventions: bearer auth, `Accept: application/json+canvas-string-ids`, Link-header pagination, and respectful retry/rate-limit handling.

## Goals / Non-Goals

**Goals:**
- Build course navigation from active Canvas-backed courses instead of a hardcoded course array.
- Tailor each course workspace from available Canvas records: syllabus, modules/items, assignments/submissions, announcements/discussions, grades, people/enrollments, files, calendar events, and to-do items.
- Keep interactive controls in client components while data access stays in server-side helpers or Server Components.
- Preserve the existing assignment search/filter/view behavior while changing the data source from mocks to Canvas cache records.
- Fix `lib/db/schema.ts` so Canvas table and relation exports compile under strict TypeScript.
- Use installed shadcn components and conventions for all UI work.

**Non-Goals:**
- Implement a full Canvas OAuth flow or background sync scheduler.
- Add write-back actions to Canvas such as submitting assignments, creating discussion replies, or editing grades.
- Replace the whole app shell or introduce a new component registry.

## Decisions

1. **Use local Canvas cache tables as the render-time source of truth.**
   - Implement a data adapter such as `lib/canvas-course-data.ts` that returns serializable view models for course navigation, course workspaces, and assignment explorer rows.
   - Rationale: the schema already stores Canvas IDs as text and includes the entities needed by course pages. Rendering from the local cache avoids exposing Canvas tokens to the browser and avoids live API latency in navigation.
   - Alternative considered: call Canvas REST endpoints directly from page components. This was rejected for the primary UI path because it couples route rendering to network availability and token handling.

2. **Use Canvas `courseCanvasId`/`canvasId` values as stable route identifiers unless a normalized route slug already exists.**
   - `/courses/[course_id]` should resolve `course_id` against the Canvas-backed course key. Unsupported keys still call `notFound()`.
   - Rationale: `schema.ts` stores Canvas IDs as text specifically for large/string Canvas IDs, and every child table already carries `courseCanvasId`.
   - Alternative considered: keep the current hardcoded slugs (`cssweng`, `csmodel`, `csnetwk`, `sthciux`). This does not scale to synced Canvas courses.

3. **Make course routes dynamic and server-backed.**
   - Keep the Next 16 `params: Promise<{ course_id: string }>` pattern.
   - Remove or revise `dynamicParams = false` and static `generateStaticParams()` if course availability comes from user/cache data at runtime.
   - Rationale: course records are no longer a compile-time constant. Next's Server Components can query the database safely without bundling credentials.

4. **Pass serializable navigation data into the client sidebar.**
   - `AppSidebar` needs `usePathname()`, so it remains a client component.
   - Fetch sidebar course data in a server layer such as `app/layout.tsx` or a server wrapper and pass only serializable fields: label, href, course key, secondary label, item counts, and available sections.
   - Rationale: this follows the server/client boundary documented by the installed Next package and keeps database access out of the client bundle.

5. **Use item-aware layout sections instead of one generic placeholder per tab.**
   - Modules should render module groups with ordered module items.
   - Assignments should render Canvas assignments joined with the current user's submission when available.
   - Announcements and discussions should come from `canvasDiscussionTopics` with `isAnnouncement` splitting the views.
   - Grades should use enrollment grade fields plus submissions/rubric data.
   - People should use enrollments/users when present.
   - Files should use folders/files, and calendar/upcoming work should use calendar events and to-do items.
   - Rationale: the user's request is to tailor navigation and layout per course items, not to fill generic placeholder panels.

6. **Fix Drizzle relation imports without changing the schema shape.**
   - `sql` can remain imported from `drizzle-orm`, while relation helpers should be imported from the installed relation entrypoint, expected to be `drizzle-orm/relations`.
   - Verify with `npx tsc --noEmit --pretty false`.
   - Rationale: the current TypeScript failure is import-surface drift in Drizzle, not a data model problem.

7. **Use shadcn/radix-nova primitives for all UI.**
   - Navigation uses `Sidebar`, `Collapsible`, `Tooltip`, and lucide icons.
   - Course sections use `Tabs`, `Card`, `Badge`, `Table`, `Skeleton`, `Sheet`, and `ToggleGroup` where appropriate.
   - Follow local shadcn rules: semantic tokens, `gap-*` spacing, `cn()` for conditional classes, `TabsTrigger` inside `TabsList`, grouped menu/select items, `data-icon` on button icons, and no custom color overrides.

## Risks / Trade-offs

- **Canvas cache can be empty or stale** -> Render clear empty/stale states and keep sync timestamps visible where helpful.
- **Route IDs may change if a better slug strategy is introduced later** -> Keep route-key creation isolated in the Canvas course data adapter.
- **Client sidebar may need server data in a root layout** -> Pass only serializable view models and keep DB clients out of client modules.
- **Assignments and submissions may not have complete joins** -> Build display models that tolerate missing submission, due date, rubric, or assignment group data.
- **Drizzle RC APIs may change again** -> Verify against installed package exports during implementation and keep the schema fix minimal.

## Migration Plan

1. Fix `lib/db/schema.ts` import errors and verify `npx tsc --noEmit --pretty false` passes before UI work.
2. Add Canvas course data helpers that normalize course, navigation, workspace, and assignment view models from the schema tables.
3. Update `/courses/[course_id]` to resolve Canvas-backed course data server-side.
4. Update the app sidebar to consume Canvas-backed course navigation props.
5. Replace mock course panels and assignment rows with Canvas-backed layout sections.
6. Run `npx tsc --noEmit --pretty false`, `npm run lint`, and `npm run build`.

Rollback is straightforward because this change is scoped to data helpers, sidebar/course components, and the course route. Revert those implementation files if the Canvas-backed model is not ready.
