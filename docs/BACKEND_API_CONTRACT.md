# Backend API Contract

All endpoints are under the Next.js origin. Protected endpoints require a Firebase ID token in the header:

`Authorization: Bearer <Firebase ID token>`

The server verifies the token with Firebase Admin. Never send the Admin service-account JSON to a browser. The separate IIITT Firebase project must be configured before using these endpoints.

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

The values above are illustrative only. Do not treat them as real student records.

## Admin

All admin endpoints require an active `staff/{uid}` document with `role: "admin"`.

### `POST /api/admin/academic-data`

Atomic import/update of up to 200 rows per request. Import in dependency order: courses, offerings, enrollments, assignments. The entire request fails if validation or authorization fails.

Courses:

```json
{ "kind": "courses", "rows": [{ "id": "cs101", "code": "CS101", "title": "Introduction to Programming", "credits": 4, "active": true }] }
```

Offerings reference an existing active course:

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
