# Debug Login Issues

## Quick Debug Steps

### 1. Check Browser Console
Open DevTools (F12) → Console tab. You should see:
- `🔐 Attempting login:` with URL and username
- `📡 Response status:` with status code
- Either `✅ Login successful` or `❌` error messages

### 2. Check Network Tab
Open DevTools (F12) → Network tab:
- Look for the `/auth/login` request
- Check the request URL (should be `http://localhost:4000/api/v1/auth/login`)
- Check response status (should be 200)
- Check if CORS error appears (red with CORS message)

### 3. Test API Directly
```bash
# Test if API is running
curl http://localhost:4000/api/v1

# Test login
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"superadmin","password":"superadmin123"}'
```

### 4. Check Environment Variables
**Frontend** (`apps/web/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

**Backend** (`.env` or `apps/api/.env`):
```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
PORT=4000
HOST=0.0.0.0
```

### 5. Restart Services
After adding CORS, you MUST restart the API:
```bash
# Stop API (Ctrl+C)
# Then restart:
cd apps/api
pnpm dev
```

### 6. Common CORS Errors

**Error: "Access to fetch at '...' from origin '...' has been blocked by CORS policy"**
- ✅ Fixed: CORS middleware added
- ⚠️ Make sure API is restarted after CORS changes

**Error: "Failed to fetch" or "Network error"**
- API not running
- Wrong API URL
- Port mismatch

**Error: "401 Unauthorized"**
- Wrong username/password
- User doesn't exist (run seed)
- Password hash mismatch

### 7. Verify User Exists
```bash
cd apps/api
pnpm prisma db seed
```

Or check database:
```bash
# If using Docker
docker-compose exec postgres psql -U postgres -d projectx -c "SELECT username, role FROM users;"
```

## Expected Console Output (Success)

```
🔐 Attempting login: {url: "http://localhost:4000/api/v1/auth/login", username: "superadmin"}
📡 Response status: 200 OK
✅ Login successful: {hasToken: true, hasUser: true}
```

## Expected Console Output (Failure)

```
🔐 Attempting login: {url: "http://localhost:4000/api/v1/auth/login", username: "superadmin"}
❌ Login error: TypeError: Failed to fetch
```

Or:

```
🔐 Attempting login: {url: "http://localhost:4000/api/v1/auth/login", username: "superadmin"}
📡 Response status: 401 Unauthorized
❌ API Error: {message: "Invalid username or password"}
```

