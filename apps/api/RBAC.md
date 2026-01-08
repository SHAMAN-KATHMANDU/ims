# RBAC (Role-Based Access Control) Implementation

## Overview

This API implements a comprehensive RBAC system with three roles:

1. **User** - Basic access: Home and Product viewing
2. **Admin** - Product management and analytics
3. **Super Admin** - User management + all other permissions

## Roles and Permissions

### User Role
- ✅ View Home page
- ✅ View Products (read-only)
- ✅ Access own profile

### Admin Role
- ✅ All User permissions
- ✅ Create Products
- ✅ Update Products
- ✅ Delete Products
- ✅ View Analytics
- ✅ Manage Products

### Super Admin Role
- ✅ All Admin permissions
- ✅ Create Users
- ✅ Update Users
- ✅ Delete Users
- ✅ View All Users
- ✅ Assign Roles

## API Endpoints

### Authentication Endpoints

#### `POST /api/v1/auth/login`
Public endpoint for user login.

**Request:**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "admin",
    "role": "admin",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### `GET /api/v1/auth/me`
Get current authenticated user info (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "username": "admin",
    "role": "admin",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### `POST /api/v1/auth/logout`
Logout endpoint (token is removed on frontend).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Logout successful"
}
```

### Home Endpoints

#### `GET /api/v1/home`
Get home page data (all authenticated users).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Home data fetched successfully",
  "data": {
    "featuredProducts": [...],
    "totalProducts": 10,
    "welcomeMessage": "Welcome, admin!"
  }
}
```

### Product Endpoints

#### `GET /api/v1/products`
Get all products (all authenticated users).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Products fetched successfully",
  "products": [...],
  "count": 10
}
```

#### `GET /api/v1/products/:id`
Get product by ID (all authenticated users).

**Headers:**
```
Authorization: Bearer <token>
```

#### `POST /api/v1/products`
Create product (admin and superAdmin only).

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "name": "Product Name",
  "description": "Product description",
  "price": 99.99
}
```

#### `PUT /api/v1/products/:id`
Update product (admin and superAdmin only).

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "price": 129.99
}
```

#### `DELETE /api/v1/products/:id`
Delete product (admin and superAdmin only).

**Headers:**
```
Authorization: Bearer <token>
```

### Analytics Endpoints

#### `GET /api/v1/analytics`
Get analytics data (admin and superAdmin only).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Analytics fetched successfully",
  "analytics": {
    "overview": {
      "totalProducts": 50,
      "totalUsers": 10,
      "totalValue": "5000.00",
      "averageProductPrice": "100.00"
    },
    "usersByRole": [
      { "role": "superAdmin", "count": 1 },
      { "role": "admin", "count": 2 },
      { "role": "user", "count": 7 }
    ],
    "recentProducts": [...],
    "recentUsers": [...]
  }
}
```

### User Management Endpoints (Super Admin Only)

#### `GET /api/v1/users`
Get all users (superAdmin only).

**Headers:**
```
Authorization: Bearer <token>
```

#### `GET /api/v1/users/:id`
Get user by ID (superAdmin only).

**Headers:**
```
Authorization: Bearer <token>
```

#### `POST /api/v1/users`
Create new user (superAdmin only).

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "username": "newuser",
  "password": "password123",
  "role": "user"
}
```

#### `PUT /api/v1/users/:id`
Update user (superAdmin only).

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "username": "updateduser",
  "password": "newpassword",
  "role": "admin"
}
```

#### `DELETE /api/v1/users/:id`
Delete user (superAdmin only).

**Headers:**
```
Authorization: Bearer <token>
```

## Authentication Flow

1. **User Login:**
   - User sends `POST /api/v1/auth/login` with username and password
   - Backend verifies credentials and returns JWT token + user info
   - Frontend stores token in localStorage

2. **Authenticated Requests:**
   - Frontend sends `Authorization: Bearer <token>` header with each request
   - Backend validates token using `verifyToken` middleware
   - If valid, request proceeds; if invalid, returns 401

3. **Role-Based Authorization:**
   - After token validation, `authorizeRoles` middleware checks user role
   - Only allows access if user role matches required roles
   - Returns 403 if user doesn't have required permissions

4. **Logout:**
   - Frontend removes token from localStorage
   - No server-side token invalidation (JWT is stateless)

## Security Features

- ✅ Passwords are hashed using bcrypt (10 rounds)
- ✅ JWT tokens with 24-hour expiration
- ✅ Token validation on every protected route
- ✅ Role-based access control on all endpoints
- ✅ Password never returned in API responses

## Error Responses

### 400 Bad Request
```json
{
  "message": "Username, password, and role are required"
}
```

### 401 Unauthorized
```json
{
  "message": "No token, authorization denied"
}
```

### 403 Forbidden
```json
{
  "message": "Unauthorized",
  "required": ["admin", "superAdmin"],
  "current": "user"
}
```

### 404 Not Found
```json
{
  "message": "Product not found"
}
```

### 500 Internal Server Error
```json
{
  "message": "Internal server error",
  "error": "Error details"
}
```

