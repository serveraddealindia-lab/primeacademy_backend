# REST API Documentation

## Authentication

All endpoints except `/api/auth/register` and `/api/auth/login` require authentication.
Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-token>
```

## Batch APIs

### POST /api/batches

Create a new batch (Admin/Superadmin only).

**Request Body:**
```json
{
  "title": "Digital Art Fundamentals - Batch 1",
  "software": "Photoshop, Illustrator",
  "mode": "online",
  "startDate": "2024-02-01",
  "endDate": "2024-05-31",
  "maxCapacity": 30,
  "schedule": {
    "days": ["Monday", "Wednesday", "Friday"],
    "time": "10:00-12:00"
  },
  "status": "active"
}
```

**Response (201):**
```json
{
  "status": "success",
  "message": "Batch created successfully",
  "data": {
    "batch": {
      "id": 1,
      "title": "Digital Art Fundamentals - Batch 1",
      "software": "Photoshop, Illustrator",
      "mode": "online",
      "startDate": "2024-02-01T00:00:00.000Z",
      "endDate": "2024-05-31T00:00:00.000Z",
      "maxCapacity": 30,
      "schedule": { ... },
      "status": "active",
      "createdByAdminId": 1,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### GET /api/batches/:id/candidates/suggest

Suggest eligible students for a batch based on schedule/time availability.

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "batch": {
      "id": 1,
      "title": "Digital Art Fundamentals - Batch 1",
      "schedule": { ... }
    },
    "candidates": [
      {
        "id": 10,
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1234567890",
        "enrollmentDate": "2024-01-15T00:00:00.000Z",
        "enrollmentStatus": "active"
      }
    ],
    "totalCount": 1
  }
}
```

## Session APIs

### POST /api/sessions

Create a new session (Faculty/Admin/Superadmin only).

**Request Body:**
```json
{
  "batchId": 1,
  "facultyId": 5,
  "date": "2024-02-05",
  "startTime": "10:00",
  "endTime": "12:00",
  "topic": "Introduction to Digital Art",
  "isBackup": false
}
```

**Response (201):**
```json
{
  "status": "success",
  "message": "Session created successfully",
  "data": {
    "session": {
      "id": 1,
      "batchId": 1,
      "facultyId": 5,
      "date": "2024-02-05",
      "startTime": "10:00",
      "endTime": "12:00",
      "topic": "Introduction to Digital Art",
      "isBackup": false,
      "status": "scheduled",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### POST /api/sessions/:id/checkin

Check-in to start a session. Only works if status is "scheduled" and faculty is available.

**Business Rules:**
- Cannot check-in without faculty (faculty must exist and be active)
- Session status must be "scheduled"
- Only assigned faculty or admin can check-in

**Response (200):**
```json
{
  "status": "success",
  "message": "Session checked in successfully",
  "data": {
    "session": {
      "id": 1,
      "status": "ongoing",
      "actualStartAt": "2024-02-05T10:05:00.000Z",
      "updatedAt": "2024-02-05T10:05:00.000Z"
    }
  }
}
```

### POST /api/sessions/:id/checkout

Check-out to end a session. Only works if status is "ongoing" and session was checked in.

**Business Rules:**
- Cannot end without check-out (session must be in "ongoing" status)
- Session must have been checked in (actualStartAt must exist)
- Only assigned faculty or admin can check-out

**Response (200):**
```json
{
  "status": "success",
  "message": "Session checked out successfully",
  "data": {
    "session": {
      "id": 1,
      "status": "completed",
      "actualStartAt": "2024-02-05T10:05:00.000Z",
      "actualEndAt": "2024-02-05T12:10:00.000Z",
      "updatedAt": "2024-02-05T12:10:00.000Z"
    }
  }
}
```

### POST /api/sessions/:id/attendance

Mark attendance for a student in a session. Supports manual attendance marking.

**Request Body:**
```json
{
  "studentId": 10,
  "status": "present",
  "isManual": false
}
```

**Request Body (Manual Attendance):**
```json
{
  "studentId": 10,
  "status": "manual_present",
  "isManual": true
}
```

**Valid Status Values:**
- `present` - Student is present
- `absent` - Student is absent
- `manual_present` - Manually marked as present

**Response (201/200):**
```json
{
  "status": "success",
  "message": "Attendance marked successfully",
  "data": {
    "attendance": {
      "id": 1,
      "sessionId": 1,
      "studentId": 10,
      "status": "present",
      "isManual": false,
      "markedBy": 5,
      "markedAt": "2024-02-05T10:30:00.000Z",
      "createdAt": "2024-02-05T10:30:00.000Z",
      "updatedAt": "2024-02-05T10:30:00.000Z"
    }
  }
}
```

## Error Responses

### 400 Bad Request
- Missing required fields
- Invalid data format
- Business rule violation (e.g., cannot check-in without faculty, cannot check-out without check-in)

### 401 Unauthorized
- Missing or invalid token
- User not authenticated

### 403 Forbidden
- User doesn't have required role/permission

### 404 Not Found
- Resource (batch, session, student, faculty) not found

### 500 Internal Server Error
- Server-side error

## Prime Academy Business Rules

1. **Cannot check-in without faculty**: Session check-in requires that the assigned faculty exists and is active.
2. **Cannot end without check-out**: Session cannot be completed without going through the check-out process.
3. **Manual attendance**: Attendance can be marked manually by setting `isManual: true` and using `status: "manual_present"`.

