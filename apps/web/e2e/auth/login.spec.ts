import {
  test,
  expect,
  E2E_SLUG,
  E2E_USERNAME,
  E2E_PASSWORD,
} from "../fixtures";

test.describe("Login flow", () => {
  test("slug entry → login → dashboard redirect", async ({
    slugEntryPage,
    loginPage,
    dashboardPage,
  }) => {
    await slugEntryPage.goto();
    await slugEntryPage.expectLoaded();

    await slugEntryPage.enterSlugAndGo(E2E_SLUG);

    await loginPage.expectLoaded();
    await loginPage.login(E2E_USERNAME, E2E_PASSWORD);

    await dashboardPage.expectLoaded(E2E_SLUG);
  });

  test("shows error for invalid credentials", async ({
    slugEntryPage,
    loginPage,
  }) => {
    await slugEntryPage.goto();
    await slugEntryPage.enterSlugAndGo(E2E_SLUG);

    await loginPage.expectLoaded();
    await loginPage.login(E2E_USERNAME, "wrongpassword");

    await loginPage.expectError(/invalid|incorrect|failed|error/i);
  });
});
