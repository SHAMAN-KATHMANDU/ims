# Troubleshooting Guide

## Common Issues with POST /api/v1/users

### 1. **401 Unauthorized - "No token, authorization denied"**
**Problem:** Missing or incorrectly formatted Authorization header.

**Solution:**
- In Postman, go to the "Authorization" tab
- Select "Bearer Token" from the Type dropdown
- Paste your JWT token in the Token field
- OR manually set the header:
  - Key: `Authorization`
  - Value: `Bearer <your-jwt-token>`

### 2. **401 Unauthorized - "Token is not valid"**
**Problem:** Invalid or expired JWT token.

**Solution:**
- Make sure you've logged in first using `POST /api/v1/auth/login`
- Copy the token from the login response
- Tokens expire after 1 hour - login again to get a new token
- Verify `JWT_SECRET` in your `.env` file matches the one used when creating the token

### 3. **403 Forbidden - "Unauthorized"**
**Problem:** Your user doesn't have the `superAdmin` role.

**Solution:**
- Make sure you're logged in as a user with `superAdmin` role
- Check the token payload by decoding it at https://jwt.io
- The token should contain: `{ "id": "...", "role": "superAdmin" }`
- If you don't have a superAdmin account, run the seed script:
  ```bash
  pnpm prisma:seed
  ```

### 4. **400 Bad Request - "Username, password, and role are required"**
**Problem:** Missing required fields in the request body.

**Solution:**
- In Postman, go to the "Body" tab
- Select "raw" and "JSON" format
- Make sure your request body includes all required fields:
  ```json
  {
    "username": "newadmin",
    "password": "securepassword",
    "role": "superAdmin"
  }
  ```

### 5. **400 Bad Request - "Invalid role"**
**Problem:** The role value doesn't match allowed values.

**Solution:**
- Valid roles are: `"superAdmin"`, `"admin"`, or `"user"`
- Make sure the role is exactly one of these (case-sensitive)
- Example:
  ```json
  {
    "role": "superAdmin"  // ✅ Correct
    "role": "SuperAdmin"  // ❌ Wrong (capital S)
    "role": "super_admin" // ❌ Wrong (underscore)
  }
  ```

### 6. **409 Conflict - "User with this username already exists"**
**Problem:** A user with that username already exists.

**Solution:**
- Choose a different username
- Or update the existing user using `PUT /api/v1/users/:id`

### 7. **500 Internal Server Error**
**Problem:** Database connection or Prisma client issue.

**Solution:**
- Make sure PostgreSQL is running
- Verify `DATABASE_URL` in `.env` is correct
- Run Prisma migrations:
  ```bash
  pnpm prisma:generate
  pnpm prisma:migrate
  ```
- Check server console logs for detailed error messages

## Step-by-Step Postman Setup

1. **Login to get a token:**
   - Method: `POST`
   - URL: `http://localhost:9000/api/v1/auth/login`
   - Body (raw JSON):
     ```json
     {
       "username": "superadmin",
       "password": "superadmin123"
     }
     ```
   - Copy the `token` from the response

2. **Create a new user:**
   - Method: `POST`
   - URL: `http://localhost:9000/api/v1/users`
   - Authorization tab:
     - Type: `Bearer Token`
     - Token: `<paste-token-from-step-1>`
   - Body tab (raw JSON):
     ```json
     {
       "username": "newadmin",
       "password": "securepassword",
       "role": "superAdmin"
     }
     ```

## Debugging Tips

1. **Check server console logs:**
   - The server logs decoded user information
   - Look for: "The decoded user is: { id: '...', role: '...' }"

2. **Verify token contents:**
   - Go to https://jwt.io
   - Paste your token
   - Check the payload section for `id` and `role` fields

3. **Test authentication separately:**
   - First test login endpoint
   - Then test a simpler protected endpoint like `GET /api/v1/users`
   - Finally test the create user endpoint

4. **Check environment variables:**
   - Verify `.env` file exists
   - Check `DATABASE_URL` and `JWT_SECRET` are set correctly
