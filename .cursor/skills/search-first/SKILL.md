---
name: search-first
description: Research-before-coding workflow — search npm/PyPI/MCP/GitHub for existing solutions before writing custom code. Avoid reinventing the wheel.
origin: ECC
---

# Search First

Always search for existing solutions before writing custom code.

## When to Activate

- About to write a utility function
- Implementing a common pattern (auth, validation, pagination, etc.)
- Adding a new capability to the project
- Solving a problem that likely has existing solutions

## Core Principle

**Before writing any non-trivial code, spend 5 minutes searching for existing solutions.**

The cost of using a well-maintained library:
- Zero implementation time
- Battle-tested edge cases
- Community support
- Ongoing maintenance

The cost of custom code:
- Implementation time
- Bug fixing time
- Maintenance burden
- Documentation burden

## Search Workflow

### Step 1: Define What You Need

```
Be specific about requirements:
- What problem does it solve?
- What interface do you need?
- What are the constraints? (size, performance, license)
- What ecosystem? (Node.js, TypeScript, ESM/CJS)
```

### Step 2: Search npm

```bash
# Search npm registry
npm search <keyword>

# Check package details
npm info <package-name>

# Check weekly downloads (popularity indicator)
# Visit: https://npmtrends.com/<package>

# Check TypeScript support
# Look for @types/<package> or "types" field in package.json
```

**Key metrics to evaluate:**
- Weekly downloads (> 100k = well-adopted)
- Last publish date (< 1 year = actively maintained)
- GitHub stars (> 1k = community validated)
- Open issues (< 100 = manageable)
- TypeScript support (built-in or @types/)
- License (MIT/Apache = permissive)

### Step 3: Search GitHub

```
Search queries:
- "typescript express <feature>"
- "node.js <problem> library"
- site:github.com <feature> typescript stars:>500

Look for:
- README quality
- Test coverage
- Recent commits
- Issue response time
- Breaking change history
```

### Step 4: Check Existing Dependencies

```bash
# What's already in the project?
cat package.json | grep -E '"dependencies|devDependencies"' -A 100

# Can an existing package solve this?
# e.g., if zod is installed, use it for validation
# e.g., if date-fns is installed, use it for date manipulation
```

### Step 5: Evaluate and Decide

```
Decision matrix:
✓ Existing package solves it exactly → USE IT
✓ Existing package solves 80% → USE IT + thin wrapper
✓ No package exists → WRITE CUSTOM
✓ Package exists but unmaintained → WRITE CUSTOM (or fork)
✓ Package is too heavy for simple need → WRITE CUSTOM
```

## Common Patterns and Their Libraries

### Validation
```typescript
// ✅ Use Zod (already in project)
import { z } from "zod";
const schema = z.object({ name: z.string() });
```

### Date Manipulation
```typescript
// ✅ Use date-fns or dayjs (not moment — too large)
import { format, addDays, isAfter } from "date-fns";
```

### HTTP Client
```typescript
// ✅ Use native fetch (Node 18+) or axios
const response = await fetch("https://api.example.com/data");
// or
import axios from "axios";
```

### Email
```typescript
// ✅ Use nodemailer or @sendgrid/mail
import nodemailer from "nodemailer";
```

### File Upload
```typescript
// ✅ Use multer for multipart/form-data
import multer from "multer";
```

### Queue/Background Jobs
```typescript
// ✅ Use BullMQ (Redis-based)
import { Queue, Worker } from "bullmq";
```

### Rate Limiting
```typescript
// ✅ Use express-rate-limit
import rateLimit from "express-rate-limit";
```

### Logging
```typescript
// ✅ Use pino (fast, structured)
import pino from "pino";
```

### Testing
```typescript
// ✅ Use Jest or Vitest (already in project)
// ✅ Use supertest for HTTP testing
// ✅ Use @playwright/test for E2E
```

### Encryption
```typescript
// ✅ Use Node.js built-in crypto (no package needed)
import crypto from "crypto";
const hash = crypto.createHash("sha256").update(data).digest("hex");
```

### UUID
```typescript
// ✅ Use Node.js built-in crypto.randomUUID() (Node 15.6+)
const id = crypto.randomUUID();
// Or use the uuid package if you need specific versions
```

## When to Write Custom Code

Write custom code when:

1. **No library exists** for the specific need
2. **The library is too heavy** (e.g., importing a 500KB library for one function)
3. **The library is unmaintained** (last commit > 2 years, open security issues)
4. **The library doesn't fit** the project's patterns or constraints
5. **The need is trivially simple** (e.g., a 5-line utility function)

```typescript
// ✅ FINE to write custom: trivially simple
function chunk<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
}

// ❌ DON'T write custom: complex, edge-case-heavy
// Don't write your own JWT library, bcrypt, date parser, etc.
```

## Package Evaluation Checklist

Before adding a new dependency:

- [ ] Solves the actual problem (not just close)
- [ ] TypeScript support (built-in types or @types/)
- [ ] Actively maintained (commit in last 6 months)
- [ ] Popular (> 100k weekly downloads or > 1k GitHub stars)
- [ ] Permissive license (MIT, Apache, BSD)
- [ ] No known security vulnerabilities (`npm audit`)
- [ ] Bundle size acceptable (check bundlephobia.com for frontend)
- [ ] Not already solved by an existing dependency in package.json

## Anti-Patterns

```
❌ Writing a custom date formatting library
❌ Writing a custom UUID generator
❌ Writing a custom HTTP client
❌ Writing a custom validation library
❌ Writing a custom rate limiter
❌ Writing a custom logger
❌ Writing a custom JWT implementation
❌ Writing a custom bcrypt implementation

✅ Using date-fns for date formatting
✅ Using crypto.randomUUID() for UUIDs
✅ Using fetch/axios for HTTP
✅ Using Zod for validation
✅ Using express-rate-limit for rate limiting
✅ Using pino for logging
✅ Using jsonwebtoken for JWT
✅ Using bcrypt for password hashing
```

## Time Budget

| Search Phase | Time |
|-------------|------|
| Define requirements | 1 min |
| npm search | 2 min |
| Evaluate top 2-3 options | 3 min |
| Decision | 1 min |
| **Total** | **< 7 min** |

If you can't find a solution in 7 minutes, write custom code.
