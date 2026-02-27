---
name: coding-standards
description: TypeScript/JavaScript coding standards including naming conventions, immutability, async/await patterns, error handling, file organization, and JSDoc documentation.
origin: ECC
---

# Coding Standards

Consistent coding standards for TypeScript/JavaScript projects.

## When to Activate

- Writing any new TypeScript/JavaScript code
- Reviewing code for quality
- Refactoring existing code
- Setting up a new project

## Naming Conventions

### Variables and Functions

```typescript
// camelCase for variables and functions
const userName = "alice";
const totalCount = 42;

function getUserById(id: string): Promise<User> { ... }
function calculateTotalPrice(items: CartItem[]): number { ... }

// Boolean variables: prefix with is/has/can/should
const isActive = true;
const hasPermission = false;
const canEdit = user.role === "admin";
const shouldRefetch = staleTime > 0;
```

### Classes and Types

```typescript
// PascalCase for classes, interfaces, types, enums
class UserService { ... }
interface AuthContext { ... }
type ApiResponse<T> = { success: true; data: T } | { success: false; message: string };
enum UserRole { Admin = "admin", User = "user" }

// Interfaces: no I prefix (avoid IUserService)
interface UserRepository { ... }  // ✅
interface IUserRepository { ... } // ❌
```

### Constants and Enums

```typescript
// SCREAMING_SNAKE_CASE for module-level constants
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_PAGE_SIZE = 20;
const JWT_EXPIRY_SECONDS = 900;

// PascalCase enum with string values
enum AuditAction {
  Create = "CREATE",
  Update = "UPDATE",
  Delete = "DELETE",
}
```

### Files and Directories

```
# kebab-case for files and directories
user-service.ts          ✅
userService.ts           ❌
UserService.ts           ❌

# Descriptive suffixes
user.controller.ts
user.service.ts
user.repository.ts
user.schema.ts
user.schema.test.ts

# Test files co-located with source
src/modules/users/
  user.controller.ts
  user.controller.test.ts
  user.service.ts
  user.service.test.ts
```

## TypeScript Patterns

### Prefer Explicit Types

```typescript
// ✅ Explicit return types on public functions
export async function createUser(data: CreateUserDto): Promise<User> {
  return userRepo.create(data);
}

// ✅ Explicit types on complex objects
const config: DatabaseConfig = {
  host: process.env.DB_HOST!,
  port: parseInt(process.env.DB_PORT!),
};

// ✅ Infer types for simple local variables
const count = items.length; // number, inferred
const doubled = items.map(x => x * 2); // number[], inferred
```

### Avoid `any`

```typescript
// ❌ BAD: any loses type safety
function process(data: any): any { ... }
const result = response as any;

// ✅ GOOD: Use unknown for truly unknown types
function process(data: unknown): string {
  if (typeof data !== "string") throw new Error("Expected string");
  return data.toUpperCase();
}

// ✅ GOOD: Use generics for flexible but typed functions
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}
```

### Discriminated Unions

```typescript
// ✅ Use discriminated unions for type-safe branching
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function handleResult<T>(result: Result<T>) {
  if (result.success) {
    console.log(result.data); // TypeScript knows data exists
  } else {
    console.error(result.error); // TypeScript knows error exists
  }
}
```

### Readonly and Immutability

```typescript
// ✅ Prefer readonly for function parameters that shouldn't change
function processItems(items: readonly CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ✅ Use spread over mutation
const updated = { ...user, name: "Alice" }; // ✅
user.name = "Alice"; // ❌ mutation

const newItems = [...items, newItem]; // ✅
items.push(newItem); // ❌ mutation

// ✅ Use Object.freeze for true constants
const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  NOT_FOUND: 404,
});
```

## Async/Await Patterns

### Always Await Promises

```typescript
// ✅ GOOD: Await all promises
async function createOrder(data: CreateOrderDto) {
  const user = await userRepo.findById(data.userId);
  const order = await orderRepo.create(data);
  await emailService.sendConfirmation(user.email, order);
  return order;
}

// ❌ BAD: Floating promises (unhandled rejections)
async function createOrder(data: CreateOrderDto) {
  const order = await orderRepo.create(data);
  emailService.sendConfirmation(data.userId, order); // not awaited!
  return order;
}
```

### Parallel Execution

```typescript
// ✅ Run independent async operations in parallel
const [user, orders, permissions] = await Promise.all([
  userRepo.findById(userId),
  orderRepo.findByUser(userId),
  permissionRepo.findByUser(userId),
]);

// ❌ Sequential when parallel is possible
const user = await userRepo.findById(userId);
const orders = await orderRepo.findByUser(userId);        // waits unnecessarily
const permissions = await permissionRepo.findByUser(userId); // waits unnecessarily
```

### Error Handling

```typescript
// ✅ Catch specific errors
async function getUser(id: string) {
  try {
    return await userRepo.findById(id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return null; // Handle gracefully
    }
    throw error; // Re-throw unknown errors
  }
}

// ✅ Wrap with context
async function processPayment(orderId: string, amount: number) {
  try {
    return await paymentService.charge(orderId, amount);
  } catch (error) {
    logger.error({ orderId, amount, error }, "Payment failed");
    throw new AppError("Payment processing failed", 500);
  }
}
```

### Async Iteration

```typescript
// ✅ Process large datasets with async generators
async function* fetchAllUsers(tenantId: string) {
  let cursor: string | undefined;
  do {
    const { users, nextCursor } = await userRepo.findPage(tenantId, { cursor });
    yield* users;
    cursor = nextCursor;
  } while (cursor);
}

for await (const user of fetchAllUsers(tenantId)) {
  await processUser(user);
}
```

## Error Handling

### Error Classes

```typescript
// Base error class
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly code?: string,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific errors
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, "not_found");
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, "validation_error");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "unauthorized");
  }
}
```

### Never Swallow Errors

```typescript
// ❌ BAD: Silently swallowing errors
try {
  await riskyOperation();
} catch (e) {
  // empty catch
}

// ❌ BAD: Logging but not handling
try {
  await riskyOperation();
} catch (e) {
  console.log(e); // and then what?
}

// ✅ GOOD: Handle or re-throw
try {
  await riskyOperation();
} catch (error) {
  logger.error({ error }, "Operation failed");
  throw new AppError("Operation failed", 500);
}
```

## File Organization

### Module Structure

```
src/
  modules/
    users/
      user.controller.ts    # HTTP layer
      user.service.ts       # Business logic
      user.repository.ts    # Data access
      user.schema.ts        # Validation schemas
      user.schema.test.ts   # Schema tests
      user.router.ts        # Express router
  shared/
    auth/
    errors/
    response/
    types/
  config/
    prisma.ts
    redis.ts
  middleware/
    requireAuth.ts
    validate.ts
  app.ts
  server.ts
```

### Import Order

```typescript
// 1. Node built-ins
import path from "path";
import crypto from "crypto";

// 2. External packages
import express from "express";
import { z } from "zod";
import prisma from "@prisma/client";

// 3. Internal absolute imports (using @/ alias)
import { AppError } from "@/shared/errors";
import { ok, fail } from "@/shared/response";

// 4. Relative imports
import { UserRepository } from "./user.repository";
import { CreateUserSchema } from "./user.schema";
```

## Documentation

### JSDoc for Public APIs

```typescript
/**
 * Creates a new user in the specified tenant.
 *
 * @param tenantId - The tenant to create the user in
 * @param data - User creation data (email, name, role)
 * @returns The created user with generated ID
 * @throws {AppError} 409 if email already exists in tenant
 * @throws {AppError} 400 if data fails validation
 */
export async function createUser(tenantId: string, data: CreateUserDto): Promise<User> {
  // ...
}
```

### Comments: Why, Not What

```typescript
// ❌ BAD: Describes what the code does (obvious)
// Increment counter
counter++;

// ❌ BAD: Restates the code
// Check if user exists
const user = await userRepo.findById(id);

// ✅ GOOD: Explains non-obvious intent
// Use a 12-round bcrypt factor — lower is faster but less secure,
// higher is more secure but causes login timeouts on low-spec servers
const hashed = await bcrypt.hash(password, 12);

// ✅ GOOD: Documents a workaround or constraint
// Prisma doesn't support partial index creation, so we use raw SQL here
await prisma.$executeRaw`CREATE UNIQUE INDEX CONCURRENTLY ...`;
```

## Code Quality Checklist

- [ ] No `any` types (use `unknown` or generics)
- [ ] All public functions have explicit return types
- [ ] No floating promises (all awaited)
- [ ] No mutation of function parameters
- [ ] Errors are handled or explicitly re-thrown
- [ ] No empty catch blocks
- [ ] Imports are organized (built-ins → external → internal → relative)
- [ ] File names are kebab-case
- [ ] Boolean variables prefixed with is/has/can/should
- [ ] No magic numbers (use named constants)
- [ ] JSDoc on public functions
- [ ] No commented-out code in production
