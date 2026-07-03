---
name: canvas-lms-api
description: >
  Use this skill whenever a task involves reading from or writing to Canvas LMS
  data for the DLSU instance (dlsu.instructure.com). Triggers include: any
  mention of Canvas, course data, assignments, submissions, grades, enrollments,
  modules, announcements, discussion topics, or files that live in DLSU's LMS.
  Applies to scripting, automation, dashboards, grade checkers, deadline
  aggregators, and any integration built on top of the Canvas REST API.
  Do NOT use for general HTTP/REST tasks unrelated to Canvas.
---

# Canvas LMS API Skill — DLSU

Authoritative reference for making Canvas REST API calls against the De La Salle
University Canvas instance. All paths, auth patterns, pagination rules, and
request examples in this skill are production-ready against the DLSU domain.

---

## 0. Configuration Constants

```python
BASE_URL   = "https://dlsu.instructure.com"
API_ROOT   = "https://dlsu.instructure.com/api/v1"
TOKEN_URL  = "https://dlsu.instructure.com/login/oauth2/token"
AUTH_URL   = "https://dlsu.instructure.com/login/oauth2/auth"
```

```javascript
const BASE_URL  = "https://dlsu.instructure.com";
const API_ROOT  = "https://dlsu.instructure.com/api/v1";
```

The special alias `self` may be substituted for a numeric user ID anywhere the
API accepts `:user_id`, e.g. `/api/v1/users/self`.

---

## 1. Authentication

### 1a. Manual Token (scripts / personal tooling)

For personal scripts that only ever act as yourself, generate a long-lived
personal access token — no OAuth app registration required.

**How to generate:**
1. Navigate to `https://dlsu.instructure.com/profile/settings`
2. Scroll to **Approved Integrations** → **New Access Token**
3. Give it a purpose name and optionally an expiry date
4. Copy the token immediately — Canvas will not show it again

**Store it safely:**
```bash
export CANVAS_TOKEN="<your-token-here>"   # or use a .env / keyring
```

**Use it in every request:**
```bash
# Header (preferred — token never appears in server logs)
curl -H "Authorization: Bearer $CANVAS_TOKEN" \
     "https://dlsu.instructure.com/api/v1/users/self"

# Query string (fallback — avoid in production)
curl "https://dlsu.instructure.com/api/v1/users/self?access_token=$CANVAS_TOKEN"
```

### 1b. OAuth2 Flow (multi-user apps)

Tokens issued via OAuth2 expire after **1 hour**. Always implement the refresh
flow. Developer keys are issued by DLSU admins — contact them if you need a
client ID / secret for an institutional integration.

**Step 1 — Redirect user:**
```
GET https://dlsu.instructure.com/login/oauth2/auth
  ?client_id=<CLIENT_ID>
  &response_type=code
  &redirect_uri=<YOUR_CALLBACK_URI>
  &state=<CSRF_TOKEN>
```

**Step 2 — Exchange code for tokens:**
```bash
curl -X POST "https://dlsu.instructure.com/login/oauth2/token" \
     -F "grant_type=authorization_code" \
     -F "client_id=<CLIENT_ID>" \
     -F "client_secret=<CLIENT_SECRET>" \
     -F "redirect_uri=<YOUR_CALLBACK_URI>" \
     -F "code=<CODE_FROM_STEP_1>"
```

Response:
```json
{
  "access_token": "...",
  "token_type": "Bearer",
  "refresh_token": "...",
  "expires_in": 3600
}
```

**Step 3 — Refresh when expired (401 with `WWW-Authenticate` header):**
```bash
curl -X POST "https://dlsu.instructure.com/login/oauth2/token" \
     -F "grant_type=refresh_token" \
     -F "client_id=<CLIENT_ID>" \
     -F "client_secret=<CLIENT_SECRET>" \
     -F "refresh_token=<REFRESH_TOKEN>"
```

**Revoke / logout:**
```bash
curl -X DELETE "https://dlsu.instructure.com/login/oauth2/token" \
     -H "Authorization: Bearer <ACCESS_TOKEN>"
```

---

## 2. Request Conventions

| Concern | Behaviour |
|---|---|
| Protocol | HTTPS only — HTTP redirects to HTTPS but exposes credentials |
| Response format | Always JSON |
| Integer IDs | 64-bit — add `Accept: application/json+canvas-string-ids` to coerce all IDs to strings |
| Timestamps | ISO 8601 UTC — `YYYY-MM-DDTHH:MM:SSZ` |
| POST / PUT body | `application/x-www-form-urlencoded` (default) **or** `application/json` (set `Content-Type` header) |
| Booleans | `true`/`false`, `1`/`0`, `yes`/`no`, `on`/`off`, `t`/`f` all accepted |
| Array params (form) | `file_ids[]=1&file_ids[]=2` |

### Recommended base headers

```python
headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/json+canvas-string-ids",  # safe large-int handling
}
```

---

## 3. Pagination

Paginated endpoints return **10 items by default**. Override with `?per_page=N`
(Canvas caps this silently at ~100 for most endpoints).

Pagination state lives in the `Link` response header — **never reconstruct page
URLs manually**:

```
Link: <https://dlsu.instructure.com/api/v1/courses?page=2&per_page=50>; rel="next",
      <https://dlsu.instructure.com/api/v1/courses?page=1&per_page=50>; rel="first",
      <https://dlsu.instructure.com/api/v1/courses?page=5&per_page=50>; rel="last"
```

### Python — generic paginated fetcher

```python
import re, requests

def get_all(url: str, token: str, params: dict = None) -> list:
    """Fetch every page of a Canvas paginated endpoint."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json+canvas-string-ids",
    }
    results = []
    next_url = url

    while next_url:
        r = requests.get(next_url, headers=headers, params=params)
        r.raise_for_status()
        results.extend(r.json())

        # Parse the Link header for the next page URL
        link_header = r.headers.get("Link", "")
        next_match = re.search(r'<([^>]+)>;\s*rel="next"', link_header)
        next_url = next_match.group(1) if next_match else None
        params = None  # params are already baked into the next URL

    return results
```

### JavaScript — async paginated fetcher

```javascript
async function getAll(url, token, params = {}) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json+canvas-string-ids",
  };
  const results = [];
  let nextUrl = url + "?" + new URLSearchParams(params).toString();

  while (nextUrl) {
    const res = await fetch(nextUrl, { headers });
    if (!res.ok) throw new Error(`Canvas API error ${res.status}`);
    results.push(...await res.json());

    const link = res.headers.get("Link") ?? "";
    const match = link.match(/<([^>]+)>;\s*rel="next"/);
    nextUrl = match ? match[1] : null;
  }
  return results;
}
```

---

## 4. Core API Endpoints

All paths are relative to `https://dlsu.instructure.com`.

---

### 4.1 Users

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/users/self` | Current user profile |
| GET | `/api/v1/users/self/profile` | Extended profile (bio, avatar, time zone) |
| GET | `/api/v1/users/self/todo` | Upcoming to-do items (assignments to submit / grade) |
| GET | `/api/v1/users/self/upcoming_events` | Calendar events in the next week |
| GET | `/api/v1/users/self/course_nicknames` | Course nickname overrides |

```bash
# Who am I?
curl -H "Authorization: Bearer $CANVAS_TOKEN" \
     "https://dlsu.instructure.com/api/v1/users/self"
```

---

### 4.2 Courses

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/courses` | All courses for current user |
| GET | `/api/v1/courses/:id` | Single course |
| GET | `/api/v1/courses/:id/settings` | Course settings |

**Key query params for `/api/v1/courses`:**

| Param | Values | Effect |
|-------|--------|--------|
| `enrollment_state` | `active` \| `invited_or_pending` \| `completed` | Filter by state |
| `enrollment_type` | `student` \| `teacher` \| `ta` | Filter by role |
| `include[]` | `syllabus_body`, `needs_grading_count`, `total_scores`, `term` | Include extras |
| `per_page` | integer | Page size (max ~100) |

```python
# All active courses where I am a student
courses = get_all(
    "https://dlsu.instructure.com/api/v1/courses",
    TOKEN,
    params={"enrollment_type": "student", "enrollment_state": "active", "per_page": 50},
)
```

---

### 4.3 Assignments

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/courses/:course_id/assignments` | List assignments |
| GET | `/api/v1/courses/:course_id/assignments/:id` | Single assignment |
| GET | `/api/v1/courses/:course_id/assignment_groups` | Assignment groups with weights |

**Key query params for listing assignments:**

| Param | Values | Effect |
|-------|--------|--------|
| `include[]` | `submission`, `score_statistics`, `overrides` | Include extras |
| `order_by` | `due_at` \| `name` | Sort order |
| `bucket` | `past` \| `overdue` \| `undated` \| `ungraded` \| `upcoming` \| `future` | Pre-filtered buckets |
| `search_term` | string | Filter by name |

```python
# All upcoming assignments in a course
assignments = get_all(
    f"https://dlsu.instructure.com/api/v1/courses/{COURSE_ID}/assignments",
    TOKEN,
    params={"bucket": "upcoming", "include[]": "submission", "order_by": "due_at"},
)
```

```python
# Assignment groups with weights (for GPA simulation)
groups = get_all(
    f"https://dlsu.instructure.com/api/v1/courses/{COURSE_ID}/assignment_groups",
    TOKEN,
    params={"include[]": ["assignments", "submission"]},
)
```

---

### 4.4 Submissions

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/courses/:course_id/assignments/:assignment_id/submissions/:user_id` | Single submission (`user_id` = `self`) |
| GET | `/api/v1/courses/:course_id/assignments/:assignment_id/submissions` | All submissions (teacher) |
| GET | `/api/v1/courses/:course_id/students/submissions` | All my submissions across course |

**Key query params for student submissions:**

| Param | Values | Effect |
|-------|--------|--------|
| `student_ids[]` | `self` | Filter to own submissions |
| `include[]` | `assignment`, `course`, `rubric_assessment` | Include extras |
| `workflow_state` | `submitted` \| `unsubmitted` \| `graded` \| `pending_review` | Filter by state |

```python
# All my graded submissions in a course
my_subs = get_all(
    f"https://dlsu.instructure.com/api/v1/courses/{COURSE_ID}/students/submissions",
    TOKEN,
    params={
        "student_ids[]": "self",
        "workflow_state": "graded",
        "include[]": "assignment",
    },
)
```

```bash
# Fetch my submission for a specific assignment
curl -H "Authorization: Bearer $CANVAS_TOKEN" \
     "https://dlsu.instructure.com/api/v1/courses/${COURSE_ID}/assignments/${ASSIGN_ID}/submissions/self?include[]=rubric_assessment"
```

---

### 4.5 Enrollments & Grades

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/courses/:course_id/enrollments` | List enrollments in course |
| GET | `/api/v1/users/self/enrollments` | All my enrollments across courses |

**Key query params:**

| Param | Values | Effect |
|-------|--------|--------|
| `user_id` | `self` \| numeric id | Filter to a specific user |
| `type[]` | `StudentEnrollment` \| `TeacherEnrollment` | Filter by role |
| `state[]` | `active` \| `completed` \| `invited` | Filter by state |
| `include[]` | `observed_users`, `avatar_url`, `group_ids` | Include extras |

The enrollment object includes nested grade data:
```json
{
  "grades": {
    "current_score": 87.5,
    "current_grade": "B+",
    "final_score": 84.0,
    "final_grade": "B"
  }
}
```

```python
# My current grade in every active course
enrollments = get_all(
    "https://dlsu.instructure.com/api/v1/users/self/enrollments",
    TOKEN,
    params={"type[]": "StudentEnrollment", "state[]": "active"},
)
for e in enrollments:
    print(e["course_id"], e["grades"]["current_grade"], e["grades"]["current_score"])
```

---

### 4.6 Discussion Topics & Announcements

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/courses/:course_id/discussion_topics` | List discussion topics |
| GET | `/api/v1/courses/:course_id/discussion_topics/:topic_id` | Single topic |
| GET | `/api/v1/courses/:course_id/discussion_topics/:topic_id/entries` | Top-level replies |
| GET | `/api/v1/announcements` | Cross-course announcements (paginated) |

**Announcements are discussion topics with `is_announcement: true`.** Either:
- Pass `?only_announcements=true` to the discussion_topics endpoint, or
- Use the dedicated `/api/v1/announcements` endpoint with `context_codes[]`.

```python
# Announcements across specific courses
announcements = get_all(
    "https://dlsu.instructure.com/api/v1/announcements",
    TOKEN,
    params={
        "context_codes[]": [f"course_{cid}" for cid in COURSE_IDS],
        "start_date": "2025-08-01",
        "per_page": 50,
    },
)
```

```python
# Discussions in a single course (sorted newest first)
topics = get_all(
    f"https://dlsu.instructure.com/api/v1/courses/{COURSE_ID}/discussion_topics",
    TOKEN,
    params={"only_announcements": False, "order_by": "recent_activity"},
)
```

---

### 4.7 Modules

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/courses/:course_id/modules` | List modules |
| GET | `/api/v1/courses/:course_id/modules/:module_id` | Single module |
| GET | `/api/v1/courses/:course_id/modules/:module_id/items` | Items in a module |

**Key query params:**

| Param | Values | Effect |
|-------|--------|--------|
| `include[]` | `items`, `content_details` | Embed items in module response |
| `student_id` | `self` | Include completion status for yourself |

```python
# All modules with their items and my completion status
modules = get_all(
    f"https://dlsu.instructure.com/api/v1/courses/{COURSE_ID}/modules",
    TOKEN,
    params={"include[]": ["items", "content_details"], "student_id": "self"},
)
```

---

### 4.8 Files

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/courses/:course_id/files` | List course files |
| GET | `/api/v1/courses/:course_id/folders` | List course folders |
| GET | `/api/v1/files/:file_id` | File metadata + download URL |
| GET | `/api/v1/users/self/files` | My personal file storage |

```python
# All files in a course, sorted by upload date descending
files = get_all(
    f"https://dlsu.instructure.com/api/v1/courses/{COURSE_ID}/files",
    TOKEN,
    params={"sort": "created_at", "order": "desc", "per_page": 100},
)
# Each file object has a `url` field — use that to download (it's pre-authenticated)
for f in files:
    print(f["display_name"], f["url"])
```

---

### 4.9 Calendar Events

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/calendar_events` | Events and assignment due dates |

**Key query params:**

| Param | Values | Effect |
|-------|--------|--------|
| `type` | `event` \| `assignment` | Limit to one type |
| `context_codes[]` | `course_<id>`, `user_<id>` | Scope to contexts |
| `start_date` | ISO 8601 date | Range start |
| `end_date` | ISO 8601 date | Range end |
| `per_page` | integer | Page size |

```python
from datetime import date, timedelta

today = date.today().isoformat()
two_weeks = (date.today() + timedelta(weeks=2)).isoformat()

# Upcoming assignment due dates across all enrolled courses
events = get_all(
    "https://dlsu.instructure.com/api/v1/calendar_events",
    TOKEN,
    params={
        "type": "assignment",
        "context_codes[]": [f"course_{cid}" for cid in COURSE_IDS],
        "start_date": today,
        "end_date": two_weeks,
        "per_page": 100,
    },
)
```

---

### 4.10 To-Do / Upcoming Summary

```bash
# Quick to-do list (assignments due soon, items to grade, etc.)
curl -H "Authorization: Bearer $CANVAS_TOKEN" \
     "https://dlsu.instructure.com/api/v1/users/self/todo?per_page=50"

# Upcoming calendar events (next 7 days)
curl -H "Authorization: Bearer $CANVAS_TOKEN" \
     "https://dlsu.instructure.com/api/v1/users/self/upcoming_events"
```

---

## 5. Error Handling

| HTTP Code | Meaning | Action |
|-----------|---------|--------|
| 200 | OK | Normal response |
| 201 | Created | Resource was created |
| 204 | No Content | DELETE success |
| 400 | Bad Request | Check request params; response body has details |
| 401 | Unauthorized | Token expired or invalid. If `WWW-Authenticate` is set → refresh/re-auth |
| 403 | Forbidden | Authenticated but insufficient permissions |
| 404 | Not Found | Resource doesn't exist, or you lack read permission |
| 422 | Unprocessable Entity | Validation error; parse `errors` field in response body |
| 429 | Too Many Requests | Back off; check `Retry-After` header |
| 500–503 | Server Error | Canvas-side; retry with exponential back-off |

```python
import time

def safe_get(url, token, params=None, max_retries=3):
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json+canvas-string-ids",
    }
    for attempt in range(max_retries):
        r = requests.get(url, headers=headers, params=params)
        if r.status_code == 429:
            wait = int(r.headers.get("Retry-After", 10))
            time.sleep(wait)
            continue
        if r.status_code in (500, 502, 503):
            time.sleep(2 ** attempt)
            continue
        r.raise_for_status()
        return r
    raise RuntimeError(f"Failed after {max_retries} retries: {url}")
```

---

## 6. Rate Limiting

Canvas does not publish a hard rate limit, but burst requests will result in
`429 Too Many Requests`. Safe operating targets:

- **Personal scripts:** 2–5 req/s sustained; burst to ~20/s is usually fine
- **Institutional tools:** Stay well under 10 req/s; be respectful of shared infra

The `X-Rate-Limit-Remaining` and `Retry-After` response headers carry real-time
signal — always read them.

---

## 7. Common Patterns

### Get all course IDs I'm enrolled in

```python
import os, requests, re

TOKEN = os.environ["CANVAS_TOKEN"]
API = "https://dlsu.instructure.com/api/v1"

courses = get_all(
    f"{API}/courses",
    TOKEN,
    params={"enrollment_type": "student", "enrollment_state": "active", "per_page": 50},
)
course_ids = [c["id"] for c in courses]
print(course_ids)
```

### Grade summary across all active courses

```python
enrollments = get_all(
    f"{API}/users/self/enrollments",
    TOKEN,
    params={"type[]": "StudentEnrollment", "state[]": "active"},
)

for e in enrollments:
    grades = e.get("grades", {})
    print(
        f"Course {e['course_id']}: "
        f"{grades.get('current_grade', 'N/A')} "
        f"({grades.get('current_score', 'N/A')}%)"
    )
```

### Upcoming deadlines aggregator

```python
from datetime import date, timedelta

today = date.today().isoformat()
end   = (date.today() + timedelta(days=14)).isoformat()

due_soon = get_all(
    f"{API}/calendar_events",
    TOKEN,
    params={
        "type": "assignment",
        "context_codes[]": [f"course_{cid}" for cid in course_ids],
        "start_date": today,
        "end_date": end,
        "per_page": 100,
    },
)

for item in sorted(due_soon, key=lambda x: x.get("end_at", "")):
    print(f"{item['end_at'][:10]}  {item['title']}")
```

### Fetch latest announcement per course

```python
for cid in course_ids:
    announcements = get_all(
        f"{API}/courses/{cid}/discussion_topics",
        TOKEN,
        params={"only_announcements": "true", "per_page": 1, "order_by": "recent_activity"},
    )
    if announcements:
        a = announcements[0]
        print(f"[Course {cid}] {a['posted_at'][:10]}: {a['title']}")
```

---

## 8. Querying the API Documentation Dynamically

The Canvas developer docs support live queries via the `?ask=` parameter:

```
GET https://developerdocs.instructure.com/services/canvas.md?ask=<question>
```

Use this when you need to look up an endpoint not covered in this skill, e.g.:

```
GET https://developerdocs.instructure.com/services/canvas.md?ask=How do I submit a file upload for an assignment via the API?
```

Endpoint-specific pages also support the pattern:
```
GET https://developerdocs.instructure.com/services/canvas/resources/submissions.md?ask=<question>
```

---

## 9. Key Reference Links

| Resource | URL |
|----------|-----|
| DLSU Canvas | https://dlsu.instructure.com |
| DLSU Profile / Token generation | https://dlsu.instructure.com/profile/settings |
| Canvas API docs home | https://developerdocs.instructure.com/services/canvas |
| Courses API | https://developerdocs.instructure.com/services/canvas/resources/courses |
| Assignments API | https://developerdocs.instructure.com/services/canvas/resources/assignments |
| Submissions API | https://developerdocs.instructure.com/services/canvas/resources/submissions |
| Enrollments API | https://developerdocs.instructure.com/services/canvas/resources/enrollments |
| Files API | https://developerdocs.instructure.com/services/canvas/resources/files |
| Discussion Topics API | https://developerdocs.instructure.com/services/canvas/resources/discussion_topics |
| Modules API | https://developerdocs.instructure.com/services/canvas/resources/modules |
| Calendar Events API | https://developerdocs.instructure.com/services/canvas/resources/calendar_events |
| OAuth2 Guide | https://developerdocs.instructure.com/services/canvas/oauth2/file.oauth |
| Pagination Guide | https://developerdocs.instructure.com/services/canvas/basics/file.pagination |
| Canvas LMS GitHub | https://github.com/instructure/canvas-lms |
