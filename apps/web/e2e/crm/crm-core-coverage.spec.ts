import {
  test,
  expect,
  E2E_SLUG,
  E2E_USERNAME,
  E2E_PASSWORD,
} from "../fixtures";

test.describe("CRM core coverage", () => {
  test.beforeEach(async ({ slugEntryPage, loginPage, page }) => {
    await slugEntryPage.goto();
    await slugEntryPage.enterSlugAndGo(E2E_SLUG);
    await loginPage.login(E2E_USERNAME, E2E_PASSWORD);
    await expect(page).toHaveURL(new RegExp(`/${E2E_SLUG}(/)?$`));
  });

  test("loads leads and lead creation pages", async ({ page }) => {
    await page.goto(`/${E2E_SLUG}/crm/leads`);
    await expect(page).toHaveURL(new RegExp(`/${E2E_SLUG}/crm/leads$`));

    await page.goto(`/${E2E_SLUG}/crm/leads/new`);
    await expect(page).toHaveURL(new RegExp(`/${E2E_SLUG}/crm/leads/new$`));
    await expect(
      page.getByRole("heading", { name: /new lead/i }),
    ).toBeVisible();
  });

  test("loads deals and deal creation pages", async ({ page }) => {
    await page.goto(`/${E2E_SLUG}/crm/deals`);
    await expect(page).toHaveURL(new RegExp(`/${E2E_SLUG}/crm/deals$`));

    await page.goto(`/${E2E_SLUG}/crm/deals/new`);
    await expect(page).toHaveURL(new RegExp(`/${E2E_SLUG}/crm/deals/new$`));
    await expect(
      page.getByRole("heading", { name: /new deal/i }),
    ).toBeVisible();
  });

  test("loads tasks and task creation pages", async ({ page }) => {
    await page.goto(`/${E2E_SLUG}/crm/tasks`);
    await expect(page).toHaveURL(new RegExp(`/${E2E_SLUG}/crm/tasks$`));

    await page.goto(`/${E2E_SLUG}/crm/tasks/new`);
    await expect(page).toHaveURL(new RegExp(`/${E2E_SLUG}/crm/tasks/new$`));
    await expect(
      page.getByRole("heading", { name: /new task/i }),
    ).toBeVisible();
  });

  test("loads workflow and report/settings CRM pages", async ({ page }) => {
    await page.goto(`/${E2E_SLUG}/settings/crm/workflows`);
    await expect(page).toHaveURL(
      new RegExp(`/${E2E_SLUG}/settings/crm/workflows$`),
    );
    await expect(
      page.getByRole("heading", { name: /pipeline workflows/i }),
    ).toBeVisible();

    await page.goto(`/${E2E_SLUG}/reports/crm`);
    await expect(page).toHaveURL(new RegExp(`/${E2E_SLUG}/reports/crm$`));

    await page.goto(`/${E2E_SLUG}/crm/reports`);
    await expect(page).toHaveURL(new RegExp(`/${E2E_SLUG}/reports/crm$`));

    await page.goto(`/${E2E_SLUG}/crm/settings`);
    await expect(page).toHaveURL(new RegExp(`/${E2E_SLUG}/settings/crm$`));
  });
});
