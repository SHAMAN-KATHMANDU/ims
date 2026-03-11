---
name: failure-mode-analysis
description: Identify failure points, missing error handling, unhandled rejections.
origin: projectX-audit
---

# Failure Mode Analysis

Systematically identify where and how code can fail.

## When to Activate

- Before production deployment
- After adding new integrations (DB, external APIs)
- When debugging production incidents
- During security or reliability reviews

## Checklist

### Async / Promises

- Every `async` function: is the error caught or propagated?
- `Promise.all` / `Promise.allSettled` — partial failure handling?
- Unhandled `await` in fire-and-forget paths?

### External Dependencies

- Database connection failure
- Redis/cache unavailable
- Third-party API timeout or 5xx
- File system (disk full, permissions)

### Data Integrity

- Null/undefined access
- Empty arrays or missing required fields
- Type coercion edge cases

## Tools

- Node `--trace-warnings` for unhandled rejections
- Sentry or similar for production error tracking
- Integration tests with mocked failures
