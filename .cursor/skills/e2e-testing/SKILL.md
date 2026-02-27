---
name: e2e-testing
description: End-to-end testing with Playwright including Page Object Model, configuration, flaky test strategies, CI/CD integration, and artifact management.
origin: ECC
---

# E2E Testing with Playwright

Comprehensive end-to-end testing patterns using Playwright.

## When to Activate

- Writing E2E tests for new features
- Setting up Playwright in a project
- Debugging flaky tests
- Integrating E2E tests into CI/CD
- Implementing Page Object Model

## Project Setup

```bash
# Install Playwright
pnpm add -D @playwright/test
npx playwright install --with-deps chromium firefox webkit
```

```typescript
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html"],
    ["junit", { outputFile: "test-results/junit.xml" }],
    process.env.CI ? ["github"] : ["list"],
  ],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3001",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"] },
    },
  ],
  webServer: {
    command: "pnpm --filter web dev",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

## Page Object Model

```typescript
// e2e/pages/login.page.ts
import { Page, Locator, expect } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel("Email");
    this.passwordInput = page.getByLabel("Password");
    this.submitButton = page.getByRole("button", { name: "Sign in" });
    this.errorMessage = page.getByRole("alert");
  }

  async goto() {
    await this.page.goto("/login");
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }
}

// e2e/pages/dashboard.page.ts
export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly createButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Dashboard" });
    this.createButton = page.getByRole("button", { name: "Create" });
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
  }
}
```

## Test Fixtures

```typescript
// e2e/fixtures.ts
import { test as base } from "@playwright/test";
import { LoginPage } from "./pages/login.page";
import { DashboardPage } from "./pages/dashboard.page";

type Fixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  authenticatedPage: Page;
};

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  // Pre-authenticated page
  authenticatedPage: async ({ page }, use) => {
    // Set auth token in localStorage/cookie
    await page.goto("/");
    await page.evaluate((token) => {
      localStorage.setItem("auth_token", token);
    }, process.env.TEST_AUTH_TOKEN!);
    await use(page);
  },
});

export { expect } from "@playwright/test";
```

## Writing Tests

```typescript
// e2e/auth/login.spec.ts
import { test, expect } from "../fixtures";

test.describe("Login", () => {
  test("successful login redirects to dashboard", async ({
    loginPage,
    dashboardPage,
  }) => {
    await loginPage.goto();
    await loginPage.login("alice@example.com", "password123");

    await dashboardPage.expectLoaded();
    expect(loginPage.page.url()).toContain("/dashboard");
  });

  test("shows error for invalid credentials", async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login("alice@example.com", "wrongpassword");

    await loginPage.expectError("Invalid email or password");
  });

  test("shows error for missing email", async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login("", "password123");

    await loginPage.expectError("Email is required");
  });
});

// e2e/categories/categories.spec.ts
import { test, expect } from "../fixtures";

test.describe("Categories", () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/dashboard/categories");
  });

  test("displays category list", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Categories" }),
    ).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("creates a new category", async ({ page }) => {
    await page.getByRole("button", { name: "Create Category" }).click();
    await page.getByLabel("Name").fill("Electronics");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Electronics")).toBeVisible();
    await expect(page.getByRole("alert")).toContainText("Category created");
  });

  test("shows validation error for empty name", async ({ page }) => {
    await page.getByRole("button", { name: "Create Category" }).click();
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Name is required")).toBeVisible();
  });
});
```

## Handling Flaky Tests

### Wait for Network Requests

```typescript
// ❌ BAD: Arbitrary timeouts (flaky)
await page.click("button");
await page.waitForTimeout(2000);
await expect(page.getByText("Success")).toBeVisible();

// ✅ GOOD: Wait for network request to complete
await Promise.all([
  page.waitForResponse(
    (resp) => resp.url().includes("/api/categories") && resp.status() === 201,
  ),
  page.click("button"),
]);
await expect(page.getByText("Success")).toBeVisible();

// ✅ GOOD: Wait for UI state change
await page.click("button");
await expect(page.getByText("Success")).toBeVisible({ timeout: 10000 });
```

### Retry Flaky Tests

```typescript
// playwright.config.ts
retries: (process.env.CI ? 2 : 0,
  // Or per-test
  test("flaky test", async ({ page }) => {
    test.slow(); // Triple the timeout
    // ...
  }));
```

### Isolate Tests

```typescript
// ✅ Each test creates its own data
test("updates category", async ({ page, request }) => {
  // Create test data via API
  const response = await request.post("/api/categories", {
    data: { name: `Test-${Date.now()}` },
    headers: { Authorization: `Bearer ${testToken}` },
  });
  const {
    data: { category },
  } = await response.json();

  // Test with isolated data
  await page.goto(`/dashboard/categories/${category.id}`);
  // ...

  // Cleanup
  await request.delete(`/api/categories/${category.id}`, {
    headers: { Authorization: `Bearer ${testToken}` },
  });
});
```

### Mock External Services

```typescript
// Mock API responses for unreliable external services
test("handles payment failure", async ({ page }) => {
  await page.route("**/api/payments/**", (route) => {
    route.fulfill({
      status: 500,
      body: JSON.stringify({
        error: { message: "Payment service unavailable" },
      }),
    });
  });

  await page.goto("/checkout");
  await page.getByRole("button", { name: "Pay Now" }).click();

  await expect(page.getByText("Payment service unavailable")).toBeVisible();
});
```

## CI/CD Integration

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Start services
        run: docker compose up -d postgres redis
        working-directory: .

      - name: Run migrations
        run: pnpm --filter api db:migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

      - name: Run E2E tests
        run: pnpm e2e
        env:
          BASE_URL: http://localhost:3001
          TEST_AUTH_TOKEN: ${{ secrets.TEST_AUTH_TOKEN }}

      - name: Upload test artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: |
            playwright-report/
            test-results/
          retention-days: 7
```

## Artifact Management

```typescript
// Capture screenshots on failure (configured in playwright.config.ts)
screenshot: "only-on-failure",
video: "on-first-retry",
trace: "on-first-retry",

// View trace
// npx playwright show-trace test-results/trace.zip
```

## Test Organization

```
e2e/
  fixtures.ts              # Shared fixtures and test setup
  pages/
    login.page.ts          # Page Object Models
    dashboard.page.ts
    categories.page.ts
  auth/
    login.spec.ts          # Auth flow tests
    logout.spec.ts
  categories/
    list.spec.ts           # Category CRUD tests
    create.spec.ts
  smoke/
    critical-paths.spec.ts # Smoke tests for critical flows
```

## Best Practices

1. **Use Page Object Model** — encapsulate selectors and actions
2. **Prefer role/label selectors** — `getByRole`, `getByLabel` over CSS selectors
3. **Never use `waitForTimeout`** — wait for specific conditions instead
4. **Isolate test data** — create and clean up per test
5. **Mock external services** — don't depend on third-party APIs in tests
6. **Run in parallel** — E2E tests should be independent
7. **Capture artifacts** — screenshots, videos, traces on failure
8. **Test critical paths** — focus on user journeys, not every edge case
9. **Keep tests fast** — target < 30s per test
10. **Retry in CI** — set `retries: 2` for CI to handle transient failures
