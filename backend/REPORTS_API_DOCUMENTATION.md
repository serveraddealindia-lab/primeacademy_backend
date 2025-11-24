# Reports and Portfolio API Documentation

## Report Endpoints

All report endpoints require authentication and are accessible to any authenticated user.

### GET /api/reports/students-without-batch

Get all active students who don't have any active batch enrollment.

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "students": [
      {
        "id": 10,
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1234567890",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "enrollments": []
      }
    ],
    "totalCount": 1
  }
}
```

### GET /api/reports/batch-attendance

Get attendance report for a batch with optional date range filtering.

**Query Parameters:**
- `batchId` (required) - Batch ID
- `from` (optional) - Start date (YYYY-MM-DD)
- `to` (optional) - End date (YYYY-MM-DD)

**Example:**
```
GET /api/reports/batch-attendance?batchId=1&from=2024-02-01&to=2024-02-28
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "batch": {
      "id": 1,
      "title": "Digital Art Fundamentals - Batch 1",
      "startDate": "2024-02-01T00:00:00.000Z",
      "endDate": "2024-05-31T00:00:00.000Z"
    },
    "dateRange": {
      "from": "2024-02-01",
      "to": "2024-02-28"
    },
    "sessions": [
      {
        "session": {
          "id": 1,
          "date": "2024-02-05",
          "startTime": "10:00",
          "endTime": "12:00",
          "topic": "Introduction to Digital Art",
          "status": "completed"
        },
        "attendances": [
          {
            "id": 1,
            "studentId": 10,
            "studentName": "John Doe",
            "studentEmail": "john@example.com",
            "status": "present",
            "isManual": false,
            "markedBy": {
              "id": 5,
              "name": "Faculty Name"
            },
            "markedAt": "2024-02-05T10:30:00.000Z"
          }
        ]
      }
    ],
    "studentStatistics": [
      {
        "studentId": 10,
        "present": 8,
        "absent": 2,
        "manualPresent": 1,
        "total": 11,
        "attendanceRate": "81.82%"
      }
    ],
    "totalSessions": 11,
    "totalAttendances": 121
  }
}
```

### GET /api/reports/pending-payments

Get all pending payment transactions with summary statistics.

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "payments": [
      {
        "id": 1,
        "student": {
          "id": 10,
          "name": "John Doe",
          "email": "john@example.com",
          "phone": "+1234567890"
        },
        "amount": 5000.00,
        "dueDate": "2024-02-01T00:00:00.000Z",
        "status": "pending",
        "isOverdue": true,
        "createdAt": "2024-01-15T00:00:00.000Z"
      }
    ],
    "summary": {
      "totalPending": 25,
      "totalPendingAmount": "125000.00",
      "overdue": {
        "count": 10,
        "amount": "50000.00"
      },
      "upcoming": {
        "count": 15,
        "amount": "75000.00"
      }
    }
  }
}
```

### GET /api/reports/portfolio-status

Get portfolio status report with grouping by status.

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "portfolios": [
      {
        "id": 1,
        "student": {
          "id": 10,
          "name": "John Doe",
          "email": "john@example.com"
        },
        "batch": {
          "id": 1,
          "title": "Digital Art Fundamentals - Batch 1",
          "status": "active"
        },
        "status": "pending",
        "files": {
          "project1.jpg": "https://example.com/files/project1.jpg",
          "project2.jpg": "https://example.com/files/project2.jpg"
        },
        "approvedBy": null,
        "approvedAt": null,
        "createdAt": "2024-02-01T00:00:00.000Z",
        "updatedAt": "2024-02-01T00:00:00.000Z"
      }
    ],
    "summary": {
      "total": 50,
      "pending": 20,
      "approved": 25,
      "rejected": 5
    },
    "byStatus": {
      "pending": [
        {
          "id": 1,
          "studentName": "John Doe",
          "batchTitle": "Digital Art Fundamentals - Batch 1",
          "createdAt": "2024-02-01T00:00:00.000Z"
        }
      ],
      "approved": [
        {
          "id": 2,
          "studentName": "Jane Smith",
          "batchTitle": "Digital Art Fundamentals - Batch 1",
          "approvedAt": "2024-02-05T00:00:00.000Z"
        }
      ],
      "rejected": [
        {
          "id": 3,
          "studentName": "Bob Johnson",
          "batchTitle": "Digital Art Fundamentals - Batch 1",
          "updatedAt": "2024-02-03T00:00:00.000Z"
        }
      ]
    }
  }
}
```

## Portfolio Endpoints

### POST /api/students/:id/portfolio

Upload or update a portfolio for a student.

**Request Body:**
```json
{
  "batchId": 1,
  "files": {
    "project1.jpg": "https://example.com/files/project1.jpg",
    "project2.jpg": "https://example.com/files/project2.jpg",
    "project3.pdf": "https://example.com/files/project3.pdf"
  }
}
```

**Authorization:**
- Students can upload their own portfolios
- Admins can upload portfolios for any student

**Response (201/200):**
```json
{
  "status": "success",
  "message": "Portfolio uploaded successfully",
  "data": {
    "portfolio": {
      "id": 1,
      "studentId": 10,
      "batchId": 1,
      "files": {
        "project1.jpg": "https://example.com/files/project1.jpg",
        "project2.jpg": "https://example.com/files/project2.jpg"
      },
      "status": "pending",
      "createdAt": "2024-02-01T00:00:00.000Z",
      "updatedAt": "2024-02-01T00:00:00.000Z"
    }
  }
}
```

### POST /api/portfolio/:id/approve

Approve or reject a portfolio.

**Request Body:**
```json
{
  "approve": true
}
```

For rejection:
```json
{
  "approve": false
}
```

**Authorization:**
- Admin, Superadmin, or Faculty only

**Response (200):**
```json
{
  "status": "success",
  "message": "Portfolio approved successfully",
  "data": {
    "portfolio": {
      "id": 1,
      "studentId": 10,
      "studentName": "John Doe",
      "studentEmail": "john@example.com",
      "batchId": 1,
      "status": "approved",
      "approvedBy": 5,
      "approvedAt": "2024-02-05T00:00:00.000Z",
      "updatedAt": "2024-02-05T00:00:00.000Z"
    }
  }
}
```

## Error Responses

### 400 Bad Request
- Missing required fields
- Invalid date format
- Student not enrolled in batch

### 401 Unauthorized
- Missing or invalid token

### 403 Forbidden
- User doesn't have permission to perform action

### 404 Not Found
- Resource (batch, student, portfolio) not found

### 500 Internal Server Error
- Server-side error

