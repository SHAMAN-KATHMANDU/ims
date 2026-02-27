---
name: backend-patterns
description: Backend architecture patterns for Express/TypeScript APIs including repository pattern, service layer, N+1 prevention, Redis caching, transactions, JWT auth, and rate limiting.
origin: ECC
---

# Backend Patterns

Production-ready patterns for building scalable Express/TypeScript APIs.

## When to Activate

- Building new API modules
- Refactoring existing controllers
- Adding caching to endpoints
- Implementing authentication/authorization
- Handling database transactions
- Preventing N+1 query problems
- Adding rate limiting

## Repository Pattern

```typescript
// Separate data access from business logic
export class UserRepository {
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async create(data: CreateUserDto): Promise<User> {
    return prisma.user.create({ data });
  }

  async update(id: string, data: UpdateUserDto): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await prisma.user.delete({ where: { id } });
  }

  async findManyByTenant(
    tenantId: string,
    opts?: PaginationOpts,
  ): Promise<User[]> {
    return prisma.user.findMany({
      where: { tenantId },
      take: opts?.limit ?? 20,
      skip: opts?.offset ?? 0,
      orderBy: { createdAt: "desc" },
    });
  }
}
```

## Service Layer

```typescript
// Business logic, orchestration, no req/res
export class UserService {
  constructor(
    private userRepo: UserRepository,
    private emailService: EmailService,
  ) {}

  async register(data: RegisterDto): Promise<User> {
    const existing = await this.userRepo.findByEmail(data.email);
    if (existing) throw new AppError("Email already registered", 409);

    const hashed = await bcrypt.hash(data.password, 12);
    const user = await this.userRepo.create({ ...data, password: hashed });

    await this.emailService.sendWelcome(user.email);
    return user;
  }

  async updateProfile(userId: string, data: UpdateProfileDto): Promise<User> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundError("User");

    return this.userRepo.update(userId, data);
  }
}
```

## N+1 Query Prevention

```typescript
// BAD: N+1 — one query per order
const orders = await prisma.order.findMany({ where: { tenantId } });
for (const order of orders) {
  order.customer = await prisma.customer.findUnique({
    where: { id: order.customerId },
  });
}

// GOOD: Single query with include
const orders = await prisma.order.findMany({
  where: { tenantId },
  include: {
    customer: { select: { id: true, name: true, email: true } },
    items: {
      include: { product: { select: { id: true, name: true, price: true } } },
    },
  },
});

// GOOD: DataLoader for dynamic batching (GraphQL or repeated lookups)
const userLoader = new DataLoader(async (ids: string[]) => {
  const users = await prisma.user.findMany({ where: { id: { in: ids } } });
  return ids.map((id) => users.find((u) => u.id === id) ?? null);
});
```

## Redis Caching

```typescript
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL);

// Cache-aside pattern
export class ProductService {
  async findById(id: string): Promise<Product> {
    const cacheKey = `product:${id}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const product = await this.productRepo.findById(id);
    if (!product) throw new NotFoundError("Product");

    await redis.setex(cacheKey, 3600, JSON.stringify(product)); // 1 hour TTL
    return product;
  }

  async update(id: string, data: UpdateProductDto): Promise<Product> {
    const product = await this.productRepo.update(id, data);
    await redis.del(`product:${id}`); // Invalidate cache
    return product;
  }
}

// Cache invalidation patterns
async invalidateUserCache(userId: string) {
  const keys = await redis.keys(`user:${userId}:*`);
  if (keys.length > 0) await redis.del(...keys);
}
```

## Database Transactions

```typescript
// Use transactions for multi-step operations
async transferFunds(fromId: string, toId: string, amount: number) {
  return prisma.$transaction(async (tx) => {
    const from = await tx.account.findUnique({ where: { id: fromId } });
    if (!from || from.balance < amount) throw new AppError("Insufficient funds", 400);

    await tx.account.update({
      where: { id: fromId },
      data: { balance: { decrement: amount } },
    });

    await tx.account.update({
      where: { id: toId },
      data: { balance: { increment: amount } },
    });

    return tx.transaction.create({
      data: { fromId, toId, amount, type: "TRANSFER" },
    });
  });
}

// Interactive transactions (for complex logic)
async createOrderWithInventory(data: CreateOrderDto) {
  return prisma.$transaction(async (tx) => {
    // Check and reserve inventory
    for (const item of data.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product || product.stock < item.quantity) {
        throw new AppError(`Insufficient stock for ${product?.name}`, 400);
      }
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    return tx.order.create({
      data: {
        ...data,
        items: { create: data.items },
      },
    });
  });
}
```

## JWT Authentication

```typescript
import jwt from "jsonwebtoken";

interface TokenPayload {
  userId: string;
  tenantId: string;
  role: string;
}

// Token generation
export function generateTokens(payload: TokenPayload) {
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: "15m",
    algorithm: "HS256",
  });

  const refreshToken = jwt.sign(
    { userId: payload.userId },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: "7d" },
  );

  return { accessToken, refreshToken };
}

// Middleware
export function verifyToken(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: "Token expired" });
    }
    return res.status(401).json({ error: "Invalid token" });
  }
}

// Refresh token rotation
export async function refreshTokens(refreshToken: string) {
  const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as {
    userId: string;
  };
  const user = await userRepo.findById(payload.userId);
  if (!user) throw new AppError("User not found", 401);

  // Rotate: invalidate old refresh token, issue new pair
  await tokenRepo.revoke(refreshToken);
  return generateTokens({
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
  });
}
```

## Rate Limiting

```typescript
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";

// Per-IP rate limiting
export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ client: redis }),
  message: {
    error: { code: "rate_limit_exceeded", message: "Too many requests" },
  },
});

// Stricter limit for auth endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true, // Only count failed attempts
  message: {
    error: { code: "too_many_attempts", message: "Too many login attempts" },
  },
});

// Per-user rate limiting (after auth)
export const userRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  keyGenerator: (req) => req.user?.userId ?? req.ip,
  store: new RedisStore({ client: redis }),
});

// Apply
app.use("/api/", globalRateLimit);
app.use("/api/auth/", authRateLimit);
app.use("/api/v1/", verifyToken, userRateLimit);
```

## Input Validation with Zod

```typescript
import { z } from "zod";
import { Request, Response, NextFunction } from "express";

// Schema definition
const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  price: z.number().positive().multipleOf(0.01),
  sku: z
    .string()
    .regex(/^[A-Z0-9-]+$/)
    .optional(),
  categoryId: z.string().uuid(),
  stock: z.number().int().min(0).default(0),
});

// Validation middleware factory
export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(422).json({
        error: {
          code: "validation_error",
          message: "Request validation failed",
          details: result.error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        },
      });
    }
    req.body = result.data; // Replace with parsed (coerced) data
    next();
  };
}

// Usage
router.post(
  "/products",
  validate(createProductSchema),
  productController.create,
);
```

## Error Handling

```typescript
// Global error handler
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Known application errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code ?? "app_error", message: err.message },
    });
  }

  // Zod validation errors
  if (err instanceof z.ZodError) {
    return res.status(422).json({
      error: {
        code: "validation_error",
        message: "Validation failed",
        details: err.issues,
      },
    });
  }

  // Prisma errors
  const prismaError = mapPrismaError(err);
  if (prismaError) {
    return res.status(prismaError.statusCode).json({
      error: { code: "database_error", message: prismaError.message },
    });
  }

  // Unknown errors — log and return generic 500
  logger.error(
    { err, req: { method: req.method, url: req.url } },
    "Unhandled error",
  );
  return res.status(500).json({
    error: { code: "internal_error", message: "An unexpected error occurred" },
  });
}
```

## Logging

```typescript
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport:
    process.env.NODE_ENV === "development"
      ? { target: "pino-pretty" }
      : undefined,
});

// Request logging middleware
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on("finish", () => {
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: Date.now() - start,
      userId: req.user?.userId,
      tenantId: req.user?.tenantId,
    });
  });
  next();
}
```

## Health Checks

```typescript
app.get("/health", async (req, res) => {
  const checks = {
    database: "unknown",
    redis: "unknown",
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "healthy";
  } catch {
    checks.database = "unhealthy";
  }

  try {
    await redis.ping();
    checks.redis = "healthy";
  } catch {
    checks.redis = "unhealthy";
  }

  const isHealthy = Object.values(checks).every((v) => v === "healthy");
  return res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "healthy" : "degraded",
    checks,
    timestamp: new Date().toISOString(),
  });
});
```
