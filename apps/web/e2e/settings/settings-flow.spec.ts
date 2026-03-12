import {
  test,
  expect,
  E2E_SLUG,
  E2E_USERNAME,
  E2E_PASSWORD,
} from "../fixtures";

test.describe("Settings flow", () => {
  test.beforeEach(async ({ slugEntryPage, loginPage, page }) => {
    await slugEntryPage.goto();
    await slugEntryPage.enterSlugAndGo(E2E_SLUG);
    await loginPage.login(E2E_USERNAME, E2E_PASSWORD);
    await expect(page).toHaveURL(new RegExp(`/${E2E_SLUG}(/)?$`));
  });

  test("settings page loads with account section", async ({ settingsPage }) => {
    await settingsPage.goto(E2E_SLUG);
    await settingsPage.expectLoaded();
    await settingsPage.expectAccountSection();
  });

  test("audit logs page redirects when not superAdmin", async ({
    settingsPage,
    page,
  }) => {
    await settingsPage.gotoAuditLogs(E2E_SLUG);
    // Admin user is redirected to dashboard/root when accessing superAdmin-only page
    await expect(page).not.toHaveURL(/\/settings\/logs$/);
  });

  test("error reports page redirects when not platformAdmin", async ({
    settingsPage,
    page,
  }) => {
    await settingsPage.gotoErrorReports(E2E_SLUG);
    await expect(page).not.toHaveURL(/\/settings\/error-reports$/);
  });
});
