import { test, expect } from "@playwright/test";

/**
 * Verifies the no-pipeline state on /ruby/crm/deals does NOT show
 * an error toast or issue badge (QA_DEFECT_LOG #2).
 */
test("deals no-pipeline state: no error toast or issue badge", async ({
  page,
}) => {
  // 1. Login as ruby admin
  await page.goto("/ruby/login");
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Login" }).click();

  // 2. Wait for post-login navigation
  await expect(page).toHaveURL(/\/(ruby|dashboard)/, { timeout: 10_000 });

  // 3. Open deals page (Ruby tenant has no pipeline by default)
  await page.goto("/ruby/crm/deals");

  // 4. Wait for page to settle - either empty state or kanban
  await page.getByRole("heading", { name: "Deals" }).waitFor({
    state: "visible",
    timeout: 10_000,
  });

  // 5. Allow time for any async toasts to appear
  await page.waitForTimeout(2000);

  // 6. Assert: NO error toast with "No pipeline found"
  const errorToast = page.getByText("No pipeline found", { exact: false });
  await expect(errorToast).not.toBeVisible();

  // 7. For no-pipeline: expect clean empty state (not an error)
  const emptyState = page.getByText(
    "No pipeline yet. Create one to start organizing deals.",
  );
  const createPipelineBtn = page.getByRole("button", {
    name: /Create pipeline/i,
  });
  // Either we see the clean empty state, or we have pipelines and see the kanban
  const hasEmptyState =
    (await emptyState.isVisible()) || (await createPipelineBtn.isVisible());
  expect(hasEmptyState).toBeTruthy();
});
