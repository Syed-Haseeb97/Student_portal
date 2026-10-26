# Backend API Contract

All endpoints are under the Next.js origin. Protected endpoints require a Firebase ID token in the header:

`Authorization: Bearer <Firebase ID token>`

The server verifies the token with Firebase Admin. Never send the Admin service-account JSON to a browser. The separate IIITT Firebase project must be configured before using these endpoints.

## Identity and roster claim

### `POST /api/roster/claim`

Call after Firebase email-link sign-in with the Firebase ID token in the Authorization header. The server requires a verified institutional email and exactly one active approved roster match. The request body does not choose a roll number, roster ID, or role. A matching student profile is created or refreshed from the roster; an already-provisioned staff account receives its server-owned role.

### `POST /api/admin/roster/import`

Admin-only atomic import of 1–200 approved roster rows:

```json
{ "rows": [{ "rollNumber": "261161", "email": "student@iiitt.ac.in", "batch": "2026", "programme": "CSE", "active": true }] }
```

All rows are validated before writing. Roll numbers and normalized emails must be unique; changing the email for an existing roll number requires a separately reviewed correction. The import writes the roster, private email index, and an audit event in one transaction.

## Student

### `GET /api/student/dashboard`

Returns the signed-in student's roster-linked identity, attendance summaries grouped by course offering, and the 75% policy. Requires an active student profile and active approved roster entry whose email matches the verified Firebase identity.

Successful response shape:

```json
{
  "student": { "uid": "firebase-uid", "rollNumber": "261161", "batch": "2026", "programme": "CSE" },
  "policy": { "thresholdPercent": 75, "countsOnlyCompletedSessions": true },
  "summaries": [
    {
      "offeringId": "cse101-2026t1",
      "courseId": "cse101",
      "courseCode": "CS101",
      "courseTitle": "Introduction to Programming",
      "term": "2026-S1",
      "attended": 18,
      "missed": 2,
      "total": 20,
      "percentage": 90,
      "status": "compliant",
      "thresholdPercent": 75,
      "latestSessionDate": "2026-10-20"
    }
  ],
  "generatedAt": "ISO-8601 timestamp"
}
```

The values above are illustrative only. Do not treat them as real student records. `status` is one of `compliant`, `shortfall`, or `no_data`; `shortfall` means attendance is below the 75% threshold. Active enrollments with no completed sessions appear with `status: "no_data"`; the approved roster, not cached profile fields, supplies the displayed roll number, batch, and programme.

## Admin

All admin endpoints require an active `staff/{uid}` document with `role: "admin"`.

### `POST /api/admin/staff`

Provision an existing Firebase Authentication account as staff:

```json
{ "email": "lecturer@iiitt.ac.in", "role": "lecturer", "active": true }
```

The target Auth account must already exist with a verified matching institutional email. The change and audit event are transactional. An administrator cannot change their own role through this endpoint. The first administrator is bootstrapped manually according to [the runbook](FIRST_ADMIN_BOOTSTRAP.md).

### `POST /api/admin/academic-data`

Atomic import/update of up to 100 rows per request. Import in dependency order: courses, offerings, enrollments, assignments. The entire request fails if validation or authorization fails.

Courses:

```json
{ "kind": "courses", "rows": [{ "id": "cs101", "code": "CS101", "title": "Introduction to Programming", "credits": 4, "active": true }] }
```

Offering IDs must use letters, digits, or hyphens only (no underscores), because the ID prefixes compound enrollment and assignment document IDs. Offerings reference an existing active course:

```json
{ "kind": "offerings", "rows": [{ "id": "cs101-2026s1", "courseId": "cs101", "term": "2026-S1", "batch": "2026", "programme": "CSE", "active": true }] }
```

Enrollments reference an existing active offering and an active roster-linked student profile:

```json
{ "kind": "enrollments", "rows": [{ "offeringId": "cs101-2026s1", "studentUid": "firebase-student-uid", "active": true }] }
```

Assignments reference an existing active offering and an active lecturer staff record:

```json
{ "kind": "assignments", "rows": [{ "offeringId": "cs101-2026s1", "lecturerUid": "firebase-lecturer-uid", "active": true }] }
```

The server derives enrollment document IDs and roster IDs; clients cannot choose a roster ID or role. Imports create audit events.

### `POST /api/admin/attendance/{attendanceId}/correction`

Corrects a mark on a completed session. Requires `{ "mark": "present" | "absent", "reason": "..." }`; reason must be 5–300 characters. The update and an audit event containing the previous mark, new mark, actor, student, session, and reason are written in one transaction.

## Lecturer

- `POST /api/sessions`: create a scheduled session for an active offering assigned to the lecturer. Body includes `offeringId`, `sessionDate` (`YYYY-MM-DD`), and optional `startTime`, `endTime`, `room`.
- `POST /api/sessions/{sessionId}/attendance`: submit exactly one `present`/`absent` mark for every active enrollee. The transaction writes all marks, marks the session completed, and writes an audit event.
- `POST /api/sessions/{sessionId}/cancel`: cancel a scheduled session with a required 5–300 character reason. Completed sessions cannot be cancelled through this route.

## Status codes and operational boundaries

- `401`: missing or expired Firebase ID token.
- `403`: signed-in identity lacks the required active roster or staff role.
- `400`: invalid payload.
- `409`: invalid workflow transition or dependency conflict.
- `503`: unexpected service failure; check server logs without logging ID tokens or personal roster data.

The first administrator, production Firebase project, approved student roster, academic catalog, and deployment secrets must be provisioned by an authorized human. This repository workflow must not create production resources or import real student data automatically.
