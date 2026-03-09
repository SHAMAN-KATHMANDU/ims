import { test, expect } from "@playwright/test";

test.describe("Auth smoke tests", () => {
  test("landing page loads and shows organization slug entry", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Inventory Management System" }),
    ).toBeVisible();

    await expect(
      page.getByPlaceholder("your-org", { exact: true }),
    ).toBeVisible();

    await expect(page.getByRole("button", { name: "Go" })).toBeVisible();
  });

  test("login page loads for valid workspace slug", async ({ page }) => {
    await page.goto("/test-org/login");

    await expect(page.getByText("Welcome Back")).toBeVisible();

    await expect(page.getByRole("textbox", { name: "Username" })).toBeVisible();
    await expect(page.getByPlaceholder("Enter your password")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Login$/ })).toBeVisible();
  });
});
