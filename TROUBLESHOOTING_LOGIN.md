# Login Troubleshooting Guide

## Issue: Login with `superadmin` / `superadmin123` not working

### Step 1: Verify Database Seeding

Make sure the user has been created in the database:

```bash
# Run the seed script
cd apps/api
pnpm prisma migrate dev
pnpm prisma db seed
```

Or if using Docker:
```bash
docker-compose exec api pnpm prisma db seed
```

### Step 2: Check API is Running

Verify the API is accessible:
```bash
# Test the API endpoint
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"superadmin","password":"superadmin123"}'
```

### Step 3: Check Environment Variables

**Frontend (apps/web/.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

**Backend (apps/api/.env or root .env):**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=your-secret-key-here
PORT=4000
HOST=0.0.0.0
```

### Step 4: Verify User Exists in Database

Connect to your database and check:
```sql
SELECT id, username, role FROM users WHERE username = 'superadmin';
```

### Step 5: Check Browser Console

Open browser DevTools (F12) and check:
1. **Console tab** - Look for error messages
2. **Network tab** - Check if the login request is being sent and what response you get

### Common Issues:

1. **CORS Error**: 
   - Make sure API allows requests from `http://localhost:3000`
   - Check API CORS configuration

2. **Connection Refused**:
   - API not running
   - Wrong API URL in frontend
   - Port mismatch (API on 4000, frontend expects different port)

3. **401 Unauthorized**:
   - Wrong username/password
   - User doesn't exist in database
   - Password hash mismatch (if manually created user)

4. **500 Server Error**:
   - Check API logs
   - Database connection issues
   - JWT_SECRET not set

### Quick Test

Test login directly via API:
```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"superadmin","password":"superadmin123"}'
```

Expected response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "username": "superadmin",
    "role": "superAdmin",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

If this works but frontend doesn't, the issue is with the frontend configuration or API URL.

