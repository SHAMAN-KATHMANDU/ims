---
name: tdd-workflow
description: Use this skill when writing new features, fixing bugs, or refactoring code. Enforces test-driven development with 80%+ coverage including unit, integration, and E2E tests.
origin: ECC
---

# Test-Driven Development Workflow

This skill ensures all code development follows TDD principles with comprehensive test coverage.

## When to Activate

- Writing new features or functionality
- Fixing bugs or issues
- Refactoring existing code
- Adding API endpoints
- Creating new components

## Core Principles

### 1. Tests BEFORE Code

ALWAYS write tests first, then implement code to make tests pass.

### 2. Coverage Requirements

- Minimum 80% coverage (unit + integration + E2E)
- All edge cases covered
- Error scenarios tested
- Boundary conditions verified

### 3. Test Types

#### Unit Tests

- Individual functions and utilities
- Component logic
- Pure functions
- Helpers and utilities

#### Integration Tests

- API endpoints
- Database operations
- Service interactions
- External API calls

#### E2E Tests (Playwright)

- Critical user flows
- Complete workflows
- Browser automation
- UI interactions

## TDD Workflow Steps

### Step 1: Write User Journeys

```
As a [role], I want to [action], so that [benefit]

Example:
As a user, I want to search for categories semantically,
so that I can find relevant categories even without exact keywords.
```

### Step 2: Generate Test Cases

For each user journey, create comprehensive test cases:

```typescript
describe("Category Service", () => {
  it("creates a category successfully", async () => {
    // Test implementation
  });

  it("throws 409 when category name already exists", async () => {
    // Test edge case
  });

  it("returns all categories for tenant", async () => {
    // Test query
  });

  it("sorts results by name", async () => {
    // Test sorting logic
  });
});
```

### Step 3: Run Tests (They Should Fail)

```bash
pnpm test
# Tests should fail - we haven't implemented yet
```

### Step 4: Implement Code

Write minimal code to make tests pass:

```typescript
// Implementation guided by tests
export class CategoryService {
  async create(tenantId: string, data: CreateCategoryDto) {
    // Implementation here
  }
}
```

### Step 5: Run Tests Again

```bash
pnpm test
# Tests should now pass
```

### Step 6: Refactor

Improve code quality while keeping tests green:

- Remove duplication
- Improve naming
- Optimize performance
- Enhance readability

### Step 7: Verify Coverage

```bash
pnpm test:coverage
# Verify 80%+ coverage achieved
```

## Testing Patterns

### Unit Test Pattern (Jest/Vitest)

```typescript
import { CategoryService } from "./category.service";
import { CategoryRepository } from "./category.repository";
import { AppError } from "@/shared/errors";

jest.mock("./category.repository");

describe("CategoryService", () => {
  let service: CategoryService;
  let repo: jest.Mocked<CategoryRepository>;

  beforeEach(() => {
    repo = new CategoryRepository() as jest.Mocked<CategoryRepository>;
    service = new CategoryService(repo);
  });

  it("creates a category when name is unique", async () => {
    repo.findByName.mockResolvedValue(null);
    repo.create.mockResolvedValue({
      id: "1",
      name: "Electronics",
      tenantId: "t1",
    });

    const result = await service.create("t1", { name: "Electronics" });

    expect(result.name).toBe("Electronics");
    expect(repo.create).toHaveBeenCalledWith("t1", { name: "Electronics" });
  });

  it("throws 409 when category name already exists", async () => {
    repo.findByName.mockResolvedValue({
      id: "1",
      name: "Electronics",
      tenantId: "t1",
    });

    await expect(service.create("t1", { name: "Electronics" })).rejects.toThrow(
      AppError,
    );
  });
});
```

### API Integration Test Pattern

```typescript
import request from "supertest";
import app from "../../app";

describe("POST /api/categories", () => {
  it("returns 201 with created category", async () => {
    const response = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${testToken}`)
      .send({ name: "Electronics" });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.category.name).toBe("Electronics");
  });

  it("returns 400 when name is missing", async () => {
    const response = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${testToken}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("returns 409 when category already exists", async () => {
    // Create first
    await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${testToken}`)
      .send({ name: "Electronics" });

    // Try to create duplicate
    const response = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${testToken}`)
      .send({ name: "Electronics" });

    expect(response.status).toBe(409);
  });
});
```

### E2E Test Pattern (Playwright)

```typescript
import { test, expect } from "@playwright/test";

test("user can create and view a category", async ({ page }) => {
  await page.goto("/dashboard/categories");

  await page.click('[data-testid="create-category-btn"]');
  await page.fill('[data-testid="category-name"]', "Electronics");
  await page.click('[data-testid="submit-btn"]');

  await expect(page.locator("text=Electronics")).toBeVisible();
});
```

## Test File Organization

```
apps/api/src/modules/categories/
  category.controller.ts
  category.controller.test.ts    # Integration tests
  category.service.ts
  category.service.test.ts       # Unit tests
  category.repository.ts
  category.schema.ts
  category.schema.test.ts        # Schema unit tests

apps/web/e2e/
  categories.spec.ts             # E2E tests
```

## Mocking Prisma

```typescript
import { PrismaClient } from "@prisma/client";
import { mockDeep, DeepMockProxy } from "jest-mock-extended";

jest.mock("@/config/prisma", () => ({
  __esModule: true,
  default: mockDeep<PrismaClient>(),
}));

import prisma from "@/config/prisma";
const prismaMock = prisma as DeepMockProxy<PrismaClient>;

beforeEach(() => {
  jest.resetAllMocks();
});

test("findAllByTenant queries correct tenant", async () => {
  prismaMock.category.findMany.mockResolvedValue([]);
  const repo = new CategoryRepository();
  await repo.findAllByTenant("tenant-1");
  expect(prismaMock.category.findMany).toHaveBeenCalledWith({
    where: { tenantId: "tenant-1" },
  });
});
```

## Test Coverage Verification

### Run Coverage Report

```bash
pnpm test:coverage
```

### Coverage Thresholds

```json
{
  "jest": {
    "coverageThresholds": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

## Common Testing Mistakes to Avoid

### ❌ WRONG: Testing Implementation Details

```typescript
// Don't test internal state
expect(service["repo"]).toBeDefined();
```

### ✅ CORRECT: Test Behavior

```typescript
// Test what the method returns
expect(await service.create("t1", dto)).toMatchObject({ name: "Electronics" });
```

### ❌ WRONG: No Test Isolation

```typescript
// Tests depend on each other
test("creates category", () => {
  /* ... */
});
test("updates same category", () => {
  /* depends on previous test */
});
```

### ✅ CORRECT: Independent Tests

```typescript
// Each test sets up its own data
test("creates category", async () => {
  repo.findByName.mockResolvedValue(null);
  // Test logic
});
```

## Best Practices

1. **Write Tests First** - Always TDD
2. **One Assert Per Test** - Focus on single behavior
3. **Descriptive Test Names** - Explain what's tested
4. **Arrange-Act-Assert** - Clear test structure
5. **Mock External Dependencies** - Isolate unit tests
6. **Test Edge Cases** - Null, undefined, empty, large
7. **Test Error Paths** - Not just happy paths
8. **Keep Tests Fast** - Unit tests < 50ms each
9. **Clean Up After Tests** - No side effects
10. **Review Coverage Reports** - Identify gaps

## Success Metrics

- 80%+ code coverage achieved
- All tests passing (green)
- No skipped or disabled tests
- Fast test execution (< 30s for unit tests)
- E2E tests cover critical user flows
- Tests catch bugs before production

---

**Remember**: Tests are not optional. They are the safety net that enables confident refactoring, rapid development, and production reliability.
