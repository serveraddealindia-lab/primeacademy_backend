# Authentication API Documentation

## Overview

This authentication system uses JWT (JSON Web Tokens) with bcrypt password hashing and role-based access control.

## Endpoints

### 1. POST /api/auth/register

Register a new user.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "role": "student",
  "password": "password123"
}
```

**Response (201):**
```json
{
  "status": "success",
  "message": "User registered successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "role": "student",
      "avatarUrl": null,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

**Valid Roles:**
- `superadmin`
- `admin`
- `faculty`
- `student`
- `employee`

### 2. POST /api/auth/login

Login with email and password.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "student"
    }
  }
}
```

### 3. GET /api/auth/me

Get current authenticated user's information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "role": "student",
      "avatarUrl": null,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

## Protecting Routes

### Using Middleware

#### 1. Basic Authentication (verifyToken)

Protect a route so only authenticated users can access it:

```typescript
import { verifyTokenMiddleware } from '../middleware/auth.middleware';

router.get('/protected', verifyTokenMiddleware, (req, res) => {
  // req.user contains { userId, email, role }
  res.json({ message: 'Protected route', user: req.user });
});
```

#### 2. Role-Based Access Control (checkRole)

Protect a route so only specific roles can access it:

```typescript
import { verifyTokenMiddleware, checkRole } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';

// Admin or Superadmin only
router.get('/admin-only', 
  verifyTokenMiddleware, 
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  (req, res) => {
    res.json({ message: 'Admin route' });
  }
);

// Faculty only
router.get('/faculty-only', 
  verifyTokenMiddleware, 
  checkRole(UserRole.FACULTY),
  (req, res) => {
    res.json({ message: 'Faculty route' });
  }
);
```

#### 3. Combined Helper (requireAuth)

Use the `requireAuth` helper for cleaner code:

```typescript
import { requireAuth } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';

// Any authenticated user
router.get('/protected', requireAuth(), (req, res) => {
  res.json({ message: 'Protected route' });
});

// Admin only
router.get('/admin-only', requireAuth([UserRole.ADMIN, UserRole.SUPERADMIN]), (req, res) => {
  res.json({ message: 'Admin route' });
});
```

## Environment Variables

Add these to your `.env` file:

```env
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRES_IN=24h
```

## Request Interface

When using authentication middleware, the request object is extended with a `user` property:

```typescript
import { AuthRequest } from '../middleware/auth.middleware';

router.get('/route', verifyTokenMiddleware, (req: AuthRequest, res) => {
  // req.user is available and typed
  const userId = req.user.userId;
  const email = req.user.email;
  const role = req.user.role;
});
```

## Error Responses

### 401 Unauthorized
- Missing or invalid token
- User not found
- User account is inactive

### 403 Forbidden
- User doesn't have required role

### 400 Bad Request
- Missing required fields
- Invalid role
- Password too short

### 409 Conflict
- Email already exists

## Security Features

1. **Password Hashing**: Passwords are hashed using bcrypt with 10 salt rounds
2. **JWT Tokens**: Secure token-based authentication
3. **Role Validation**: Enforced at middleware level
4. **Active User Check**: Inactive users cannot authenticate
5. **Token Expiration**: Configurable via `JWT_EXPIRES_IN`

