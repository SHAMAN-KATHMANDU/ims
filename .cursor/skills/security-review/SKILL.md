---
name: security-review
description: OWASP-based security review checklist covering secrets management, input validation, SQL injection, XSS, CSRF, authentication, authorization, rate limiting, and dependency auditing.
origin: ECC
---

# Security Review

Comprehensive security review process based on OWASP Top 10 for Node.js/TypeScript APIs.

## When to Activate

- Before merging any PR that touches authentication or authorization
- When adding new API endpoints
- When handling user input
- When storing sensitive data
- Before production deployments
- During periodic security audits

## OWASP Top 10 Checklist

### A01: Broken Access Control

```typescript
// ❌ BAD: No ownership check
app.get("/api/orders/:id", async (req, res) => {
  const order = await orderRepo.findById(req.params.id);
  return res.json(order); // Any user can access any order!
});

// ✅ GOOD: Verify ownership
app.get("/api/orders/:id", requireAuth, async (req, res) => {
  const { tenantId, userId } = getAuthContext(req);
  const order = await orderRepo.findById(req.params.id);

  if (!order) return fail(res, "Order not found", 404);
  if (order.tenantId !== tenantId) return fail(res, "Forbidden", 403);

  return ok(res, { order });
});

// ✅ GOOD: Scope queries to tenant
const orders = await prisma.order.findMany({
  where: {
    tenantId, // Always filter by tenant
    ...(role !== "admin" ? { userId } : {}), // Non-admins see only their own
  },
});
```

### A02: Cryptographic Failures

```typescript
// ❌ BAD: Weak hashing
const hash = crypto.createHash("md5").update(password).digest("hex");
const hash = crypto.createHash("sha1").update(password).digest("hex");

// ✅ GOOD: bcrypt with appropriate cost factor
const hash = await bcrypt.hash(password, 12);
const isValid = await bcrypt.compare(password, hash);

// ❌ BAD: Storing sensitive data in plaintext
await prisma.user.create({ data: { ssn: req.body.ssn } });

// ✅ GOOD: Encrypt sensitive fields
const encrypted = encrypt(req.body.ssn, process.env.ENCRYPTION_KEY!);
await prisma.user.create({ data: { ssnEncrypted: encrypted } });

// ❌ BAD: Weak JWT secret
const token = jwt.sign(payload, "secret");
const token = jwt.sign(payload, "mysecret123");

// ✅ GOOD: Strong secret (32+ random bytes)
const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "15m" });
// JWT_SECRET should be: openssl rand -base64 32
```

### A03: Injection

```typescript
// ❌ BAD: SQL injection via string interpolation
const users = await prisma.$queryRaw`
  SELECT * FROM users WHERE name = '${req.query.name}'
`;

// ✅ GOOD: Parameterized queries (Prisma does this automatically)
const users = await prisma.user.findMany({
  where: { name: req.query.name as string },
});

// ✅ GOOD: Raw SQL with parameters (not string interpolation)
const users = await prisma.$queryRaw`
  SELECT * FROM users WHERE name = ${req.query.name}
`;

// ❌ BAD: NoSQL injection
const user = await db.collection("users").findOne({ email: req.body.email });
// If req.body.email = { $gt: "" }, this matches all users!

// ✅ GOOD: Validate and sanitize input first
const email = z.string().email().parse(req.body.email);
const user = await db.collection("users").findOne({ email });
```

### A04: Insecure Design

```typescript
// ❌ BAD: Predictable resource IDs
// /api/orders/1, /api/orders/2, /api/orders/3 — enumerable!

// ✅ GOOD: Use UUIDs or CUIDs
// /api/orders/clh7x2k0g0000qwer1234abcd

// ❌ BAD: Mass assignment
await prisma.user.update({
  where: { id },
  data: req.body, // User could set role: "admin"!
});

// ✅ GOOD: Explicit field selection
const { name, email } = req.body;
await prisma.user.update({
  where: { id },
  data: { name, email }, // Only allow specific fields
});
```

### A05: Security Misconfiguration

```typescript
// ❌ BAD: Exposing stack traces in production
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.stack }); // Exposes internals!
});

// ✅ GOOD: Generic error messages in production
app.use((err, req, res, next) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({
    error: { code: "internal_error", message: "An unexpected error occurred" }
  });
});

// ✅ GOOD: Security headers with Helmet
import helmet from "helmet";
app.use(helmet());
app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true }));

// ✅ GOOD: CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(",") ?? [],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
}));

// ✅ GOOD: Disable X-Powered-By
app.disable("x-powered-by");
```

### A06: Vulnerable and Outdated Components

```bash
# Audit dependencies regularly
npm audit
pnpm audit

# Check for known vulnerabilities
npx audit-ci --moderate

# Update dependencies
pnpm update --recursive --latest

# Check for outdated packages
pnpm outdated
```

### A07: Identification and Authentication Failures

```typescript
// ❌ BAD: No rate limiting on login
app.post("/auth/login", async (req, res) => {
  const user = await validateCredentials(req.body);
  // No protection against brute force!
});

// ✅ GOOD: Rate limit + account lockout
app.post("/auth/login",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 5, skipSuccessfulRequests: true }),
  async (req, res) => {
    const user = await validateCredentials(req.body);
    // ...
  }
);

// ❌ BAD: Long-lived tokens
const token = jwt.sign(payload, secret, { expiresIn: "30d" });

// ✅ GOOD: Short-lived access tokens + refresh tokens
const accessToken = jwt.sign(payload, secret, { expiresIn: "15m" });
const refreshToken = jwt.sign({ userId }, refreshSecret, { expiresIn: "7d" });

// ✅ GOOD: Secure password reset
async function requestPasswordReset(email: string) {
  const user = await userRepo.findByEmail(email);
  // Always return success even if user not found (prevent user enumeration)
  if (!user) return { message: "If that email exists, a reset link was sent" };

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await tokenRepo.create({ userId: user.id, token, expires });
  await emailService.sendPasswordReset(email, token);
  return { message: "If that email exists, a reset link was sent" };
}
```

### A08: Software and Data Integrity Failures

```typescript
// ✅ GOOD: Verify webhook signatures
app.post("/webhooks/stripe", express.raw({ type: "application/json" }), (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  // Process event...
});

// ✅ GOOD: Validate file uploads
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new AppError("Invalid file type", 400));
    }
    cb(null, true);
  },
});
```

### A09: Security Logging and Monitoring Failures

```typescript
// ✅ GOOD: Log security events
logger.warn({
  event: "failed_login",
  email: req.body.email,
  ip: req.ip,
  userAgent: req.headers["user-agent"],
}, "Failed login attempt");

logger.warn({
  event: "unauthorized_access",
  userId: req.user?.userId,
  resource: req.path,
  ip: req.ip,
}, "Unauthorized access attempt");

// ✅ GOOD: Log admin actions
logger.info({
  event: "admin_action",
  adminId: req.user?.userId,
  action: "delete_user",
  targetId: req.params.id,
}, "Admin deleted user");

// ❌ BAD: Logging sensitive data
logger.info({ password: req.body.password }); // Never log passwords
logger.info({ token: req.headers.authorization }); // Never log tokens
logger.info({ ssn: user.ssn }); // Never log PII
```

### A10: Server-Side Request Forgery (SSRF)

```typescript
// ❌ BAD: Fetching user-provided URLs
app.post("/api/fetch-url", async (req, res) => {
  const data = await fetch(req.body.url); // SSRF risk!
});

// ✅ GOOD: Allowlist external domains
const ALLOWED_DOMAINS = ["api.stripe.com", "api.sendgrid.com"];

app.post("/api/fetch-url", async (req, res) => {
  const url = new URL(req.body.url);
  if (!ALLOWED_DOMAINS.includes(url.hostname)) {
    return fail(res, "Domain not allowed", 400);
  }
  const data = await fetch(req.body.url);
  // ...
});
```

## Input Validation Checklist

```typescript
// ✅ Validate all inputs with Zod
const schema = z.object({
  email: z.string().email().toLowerCase(),
  name: z.string().min(1).max(100).trim(),
  age: z.number().int().min(0).max(150),
  url: z.string().url().startsWith("https://"),
  id: z.string().uuid(),
  role: z.enum(["admin", "user"]),
});

// ✅ Sanitize HTML input (if accepting rich text)
import DOMPurify from "isomorphic-dompurify";
const clean = DOMPurify.sanitize(userInput);

// ✅ Validate file types by content, not extension
import fileType from "file-type";
const type = await fileType.fromBuffer(buffer);
if (!["image/jpeg", "image/png"].includes(type?.mime ?? "")) {
  throw new AppError("Invalid file type", 400);
}
```

## Secrets Management

```bash
# ❌ BAD: Hardcoded secrets
const secret = "my-super-secret-key";
const apiKey = "sk_live_abc123";

# ✅ GOOD: Environment variables
const secret = process.env.JWT_SECRET!;
const apiKey = process.env.STRIPE_SECRET_KEY!;

# ✅ GOOD: Validate required secrets at startup
const requiredEnvVars = [
  "DATABASE_URL",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "REDIS_URL",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}
```

## Security Review Checklist

Before merging any security-sensitive PR:

**Authentication & Authorization**
- [ ] All endpoints require authentication (or explicitly marked public)
- [ ] Resources scoped to tenant/user (no cross-tenant access)
- [ ] Role-based access control enforced
- [ ] JWT secrets are strong (32+ bytes) and stored in env vars

**Input Validation**
- [ ] All request bodies validated with Zod schemas
- [ ] Path parameters validated (UUID format, etc.)
- [ ] Query parameters sanitized
- [ ] File uploads validated by type and size

**Data Security**
- [ ] Passwords hashed with bcrypt (cost ≥ 12)
- [ ] Sensitive fields encrypted at rest
- [ ] PII not logged
- [ ] No sensitive data in URLs or query strings

**API Security**
- [ ] Rate limiting on all public endpoints
- [ ] Stricter rate limiting on auth endpoints
- [ ] CORS configured with allowlist
- [ ] Security headers set (Helmet)
- [ ] Stack traces not exposed in production

**Dependencies**
- [ ] `npm audit` / `pnpm audit` passes with no high/critical issues
- [ ] No known vulnerable packages

**Logging**
- [ ] Security events logged (failed logins, unauthorized access)
- [ ] No passwords, tokens, or PII in logs
