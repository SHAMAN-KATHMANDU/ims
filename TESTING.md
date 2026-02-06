# Production Readiness Testing Guide

This document provides comprehensive testing procedures to verify production readiness before deployment.

## Table of Contents

- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Environment Configuration Testing](#environment-configuration-testing)
- [CORS Testing](#cors-testing)
- [Database & Migration Testing](#database--migration-testing)
- [API Endpoint Testing](#api-endpoint-testing)
- [Security Testing](#security-testing)
- [Error Handling Testing](#error-handling-testing)
- [Logging & Observability Testing](#logging--observability-testing)
- [Performance & Health Checks](#performance--health-checks)
- [Rollback Procedures](#rollback-procedures)

## Pre-Deployment Checklist

### Environment Variables

- [ ] All required environment variables are set (see `.env.prod.example`)
- [ ] `NODE_ENV=production` is set
- [ ] `CORS_ORIGIN` is set to specific frontend origin(s) (NOT "\*")
- [ ] `JWT_SECRET` is set and is strong/random
- [ ] `DATABASE_URL` is set and correct
- [ ] `API_PUBLIC_URL` is set for API documentation
- [ ] No default/fallback values are used in production

### Version & Dependencies

- [ ] `VERSION` file exists and matches package.json versions
- [ ] `pnpm-lock.yaml` is committed and up-to-date
- [ ] Node version matches `.nvmrc` (20.18.0)
- [ ] All dependencies are locked (no floating versions)

### Build & Deployment

- [ ] Application builds successfully (`pnpm build`)
- [ ] Type checking passes (`pnpm check-types`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Docker images build successfully
- [ ] Health check endpoint responds correctly

## Environment Configuration Testing

### Test 1: Required Variables Validation

**Objective**: Verify application fails fast with missing required variables.

**Steps**:

1. Set `NODE_ENV=production`
2. Remove `JWT_SECRET` from environment
3. Start the application
4. **Expected**: Application exits with error message about missing JWT_SECRET

**Repeat for**:

- `DATABASE_URL`
- `CORS_ORIGIN`
- `API_PUBLIC_URL`

### Test 2: Port Validation

**Objective**: Verify PORT validation works correctly.

**Steps**:

1. Set `PORT=invalid` (non-numeric)
2. Start application in staging/production mode
3. **Expected**: Application exits with validation error

**Test cases**:

- `PORT=0` (too low)
- `PORT=70000` (too high)
- `PORT=4000` (valid)

### Test 3: Environment-Specific Behavior

**Objective**: Verify different behavior in dev vs staging vs production.

**Steps**:

1. Test with `NODE_ENV=development`
   - **Expected**: CORS defaults to "\*", debug logs enabled
2. Test with `NODE_ENV=staging`
   - **Expected**: CORS requires explicit origin, no debug logs
3. Test with `NODE_ENV=production`
   - **Expected**: Same as staging, stricter validation

## CORS Testing

### Test 1: Allowed Origins

**Objective**: Verify requests from allowed origins succeed.

**Prerequisites**: Set `CORS_ORIGIN=http://localhost:3000,https://example.com`

**Steps**:

1. Make a request from `http://localhost:3000`
   ```bash
   curl -H "Origin: http://localhost:3000" \
        -H "Access-Control-Request-Method: GET" \
        -X OPTIONS \
        http://api.example.com/api/v1/
   ```
2. **Expected**: Response includes `Access-Control-Allow-Origin: http://localhost:3000`
3. Repeat for `https://example.com`

### Test 2: Disallowed Origins

**Objective**: Verify requests from disallowed origins are blocked.

**Steps**:

1. Make a request from `http://malicious-site.com`
   ```bash
   curl -H "Origin: http://malicious-site.com" \
        -H "Access-Control-Request-Method: GET" \
        -X OPTIONS \
        http://api.example.com/api/v1/
   ```
2. **Expected**: Response does NOT include `Access-Control-Allow-Origin` header for this origin
3. Browser should block the request

### Test 3: Multiple Origins

**Objective**: Verify comma-separated origins work correctly.

**Steps**:

1. Set `CORS_ORIGIN=http://localhost:3000,https://app.example.com,https://admin.example.com`
2. Test each origin individually
3. **Expected**: All three origins are allowed

### Test 4: Preflight Requests

**Objective**: Verify OPTIONS preflight requests work.

**Steps**:

1. Send OPTIONS request with CORS headers
   ```bash
   curl -X OPTIONS \
        -H "Origin: http://localhost:3000" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Content-Type,Authorization" \
        http://api.example.com/api/v1/auth/login
   ```
2. **Expected**: Response includes:
   - `Access-Control-Allow-Origin`
   - `Access-Control-Allow-Methods`
   - `Access-Control-Allow-Headers`

## Database & Migration Testing

### Test 1: Database Connectivity

**Objective**: Verify database connection works.

**Steps**:

1. Start application
2. Check startup logs
3. **Expected**: "Connected to PostgreSQL" message
4. Check `/health` endpoint
5. **Expected**: `"database": "connected"`

### Test 2: Migration Safety

**Objective**: Verify migrations are safe and reversible.

**Steps**:

1. Review all migration files in `apps/api/prisma/migrations/`
2. **Check for**:
   - No `DROP TABLE` statements (unless intentional)
   - No `TRUNCATE` statements
   - No destructive `ALTER TABLE` operations
   - Foreign key constraints are properly set
3. **Expected**: Only safe operations (CREATE, ALTER ADD, safe DROP INDEX)

### Test 3: Migration Execution

**Objective**: Verify migrations run successfully.

**Steps**:

1. On clean database, run `prisma migrate deploy`
2. **Expected**: All migrations apply successfully
3. Verify database schema matches Prisma schema
4. **Expected**: Schema matches exactly

## API Endpoint Testing

### Test 1: Authentication Flow

**Objective**: Verify login and token generation work.

**Steps**:

1. POST to `/api/v1/auth/login` with valid credentials
   ```bash
   curl -X POST http://api.example.com/api/v1/auth/login \
        -H "Content-Type: application/json" \
        -d '{"username":"testuser","password":"testpass"}'
   ```
2. **Expected**: Returns 200 with token and user object
3. Use token in subsequent requests
4. **Expected**: Requests succeed with valid token

### Test 2: Protected Routes

**Objective**: Verify routes require authentication.

**Steps**:

1. Make request to protected endpoint without token
   ```bash
   curl http://api.example.com/api/v1/users
   ```
2. **Expected**: Returns 401 Unauthorized
3. Make request with invalid token
4. **Expected**: Returns 401 Unauthorized

### Test 3: Admin Route Protection

**Objective**: Verify admin-only routes are protected.

**Steps**:

1. Login as regular user (role: "user")
2. Attempt to access admin route (e.g., `POST /api/v1/users`)
3. **Expected**: Returns 403 Forbidden
4. Login as admin (role: "admin" or "superAdmin")
5. Attempt same route
6. **Expected**: Returns 200/201 Success

### Test 4: Error Response Format

**Objective**: Verify error responses are consistent.

**Steps**:

1. Trigger various errors (400, 401, 403, 404, 500)
2. **Expected**: All errors follow format:
   ```json
   {
     "message": "Error description",
     "statusCode": 400,
     "code": "optional_error_code"
   }
   ```
3. In production, verify no stack traces or internal details leak
4. **Expected**: Only generic "Internal server error" for 500s

## Security Testing

### Test 1: Sensitive Data in Errors

**Objective**: Verify no sensitive data leaks in error responses.

**Steps**:

1. Trigger authentication error with invalid token
2. **Expected**: No decoded token data in response
3. Trigger database error
4. **Expected**: No database connection strings or query details
5. Trigger validation error
6. **Expected**: No internal implementation details

### Test 2: JWT Secret Security

**Objective**: Verify JWT secret is never logged.

**Steps**:

1. Check all log outputs
2. **Expected**: No JWT_SECRET value appears in logs
3. Check error responses
4. **Expected**: No JWT_SECRET in error messages

### Test 3: Input Validation

**Objective**: Verify all inputs are validated.

**Steps**:

1. Send malformed JSON
2. **Expected**: Returns 400 with validation error
3. Send SQL injection attempt in query params
4. **Expected**: Properly sanitized/escaped
5. Send XSS attempt in request body
6. **Expected**: Properly sanitized

## Error Handling Testing

### Test 1: Global Error Handler

**Objective**: Verify global error handler catches all errors.

**Steps**:

1. Trigger unhandled error in controller
2. **Expected**: Error caught by global handler, formatted response returned
3. Verify error is logged
4. **Expected**: Error logged with request ID

### Test 2: Request Timeout

**Objective**: Verify request timeout works.

**Steps**:

1. Create endpoint that takes > 30 seconds (for testing)
2. Make request to that endpoint
3. **Expected**: Request times out after 30 seconds with 408 status

### Test 3: Database Connection Loss

**Objective**: Verify graceful handling of DB disconnection.

**Steps**:

1. Start application
2. Disconnect database
3. Make API request
4. **Expected**: Error handled gracefully, appropriate error returned
5. Health check should show database as disconnected

## Logging & Observability Testing

### Test 1: Log Format

**Objective**: Verify logs follow structured format.

**Steps**:

1. Make several API requests
2. Check log output
3. **Expected**: Format matches `[TIMESTAMP] [LEVEL] [REQUEST_ID] message`
4. Verify request IDs are unique per request
5. **Expected**: Each request has unique ID

### Test 2: Log Levels

**Objective**: Verify correct log levels in production.

**Steps**:

1. Set `NODE_ENV=production`
2. Make requests that trigger info/warn/error logs
3. **Expected**:
   - Only errors and warnings logged
   - No debug/info logs in production
4. Set `NODE_ENV=development`
5. **Expected**: All log levels enabled

### Test 3: Request ID Correlation

**Objective**: Verify request IDs enable request tracing.

**Steps**:

1. Make API request
2. Note the request ID from response header `X-Request-ID`
3. Check logs for that request ID
4. **Expected**: All logs for that request include the same request ID

## Performance & Health Checks

### Test 1: Health Endpoint

**Objective**: Verify health endpoint provides accurate status.

**Steps**:

1. GET `/health`
2. **Expected**: Returns 200 with:
   ```json
   {
     "status": "healthy",
     "timestamp": "2026-02-06T...",
     "database": "connected",
     "version": "1.0.0"
   }
   ```
3. Disconnect database
4. GET `/health` again
5. **Expected**: Returns 503 with `"database": "disconnected"`

### Test 2: Startup Validation

**Objective**: Verify startup checks work.

**Steps**:

1. Start application with missing required env vars
2. **Expected**: Application exits with clear error message
3. Start with invalid configuration
4. **Expected**: Application exits with validation error
5. Start with valid configuration
6. **Expected**: Application starts successfully, logs startup info

### Test 3: Graceful Shutdown

**Objective**: Verify graceful shutdown works.

**Steps**:

1. Start application
2. Send SIGTERM signal
3. **Expected**:
   - Application logs "Shutting down gracefully..."
   - Database connections closed
   - Server closes cleanly
   - Process exits with code 0

## Rollback Procedures

### If Deployment Fails

1. **Stop new containers**: `docker-compose -f docker-compose.prod.yml down`
2. **Restore previous version**: Update `TAG` in docker-compose to previous version
3. **Restart**: `docker-compose -f docker-compose.prod.yml up -d`
4. **Verify**: Check health endpoint and logs

### Database Rollback

1. **Identify problematic migration**: Check migration history
2. **Create rollback migration**: If needed, create reverse migration
3. **Apply rollback**: `prisma migrate deploy` with rollback migration
4. **Verify**: Check database schema matches expected state

### Configuration Rollback

1. **Restore .env file**: Copy from backup
2. **Restart application**: Restart containers to load new config
3. **Verify**: Check logs and health endpoint

## Production Readiness Verification

Before marking as production-ready, verify:

- [ ] All tests above pass
- [ ] Version is consistent across all files
- [ ] CORS is restricted to production origins
- [ ] No debug logs in production
- [ ] Error responses don't leak internal details
- [ ] Health endpoint works correctly
- [ ] Database migrations are safe
- [ ] All environment variables are set
- [ ] Logging is structured and useful
- [ ] Security measures are in place
- [ ] Rollback procedures are documented and tested

## Additional Notes

- **Testing in Staging**: Run all tests in staging environment first
- **Load Testing**: Consider running load tests before production
- **Security Audit**: Consider external security audit for production
- **Monitoring**: Set up monitoring/alerting for production
- **Backup Strategy**: Verify database backups are working

---

**Last Updated**: 2026-02-06  
**Version**: 1.0.0
