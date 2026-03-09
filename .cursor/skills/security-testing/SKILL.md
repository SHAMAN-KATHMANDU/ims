---
name: security-testing
description: Auth-bypass, IDOR, cross-tenant, privilege escalation, injection tests. Use when writing security tests.
---

# Security Testing

Use when writing auth-bypass, IDOR, cross-tenant, privilege escalation, or injection tests.

## When to Activate

- Testing that protected routes return 401 without token
- Verifying IDOR prevention (tenantId from JWT, not from path)
- Cross-tenant data isolation
- Privilege escalation (user accessing admin-only endpoints)
- Malformed JWT (expired, tampered, wrong algorithm)

## Patterns

### Auth Bypass

- Parametrize protected paths from router config
- Assert 401 and message matches /token|authorization|denied|unauthorized/i
- Test invalid token, malformed Authorization header

### IDOR Prevention

- Repository/service must use tenantId from auth context
- Mock repository, assert findFirst/findMany receive correct tenantId
- Never trust IDs from path/body for tenant scoping

### Cross-Tenant

- JWT payload must include tenantId
- Service layer contract: list/get pass tenantId to repository

## Exemplars

- `apps/api/tests/security/auth-bypass.test.ts`
- `apps/api/tests/security/cross-tenant.test.ts`
- `apps/api/tests/security/idor.test.ts`

## Cross-References

- `.cursor/skills/security-review/SKILL.md`
- `.cursor/rules/testing-architecture.mdc`
