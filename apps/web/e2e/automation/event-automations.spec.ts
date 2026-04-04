/**
 * AT-UI-001 (branching off) needs a server started by Playwright with
 * E2E_AUTOMATION_BRANCHING_OFF=1. If `reuseExistingServer` reuses a dev server,
 * stop it first so env-driven NEXT_PUBLIC_FEATURE_FLAGS is applied.
 */
import type { Page } from "@playwright/test";
import {
  test,
  expect,
  E2E_SLUG,
  E2E_USERNAME,
  E2E_PASSWORD,
} from "../fixtures";
import {
  E2E_STUB_GRAPH_RUN_ID,
  stubAutomationDefinitionsListBody,
  stubAutomationRunsBody,
} from "./api-stubs";

/** Mocks definitions list + runs so Recent runs renders graph routing without DB fixtures. */
async function installAutomationBuilderApiMocks(page: Page): Promise<void> {
  await page.route(
    (url: URL) => url.pathname === "/api/v1/automation/definitions",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: stubAutomationDefinitionsListBody(),
      });
    },
  );
  await page.route(
    (url: URL) =>
      /^\/api\/v1\/automation\/definitions\/[^/]+\/runs$/.test(url.pathname),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: stubAutomationRunsBody(),
      });
    },
  );
}

test.describe("Event automations — branching enabled (default E2E server)", () => {
  test.skip(
    process.env.E2E_AUTOMATION_BRANCHING_OFF === "1",
    "use default webServer without E2E_AUTOMATION_BRANCHING_OFF",
  );

  test("AT-UI-002: flow chart shows if/switch graph authoring controls", async ({
    page,
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

    await page.goto(`/${E2E_SLUG}/settings/automation`);
    await expect(
      page.getByRole("heading", { name: /event automations/i }),
    ).toBeVisible({ timeout: 120_000 });

    await page.getByTestId("automation-open-create-composer").click();
    await expect(
      page.getByTestId("automation-editor-tab-flow-chart"),
    ).toBeVisible({ timeout: 60_000 });
    await page.getByTestId("automation-editor-tab-flow-chart").click();

    await expect(page.getByTestId("automation-flow-canvas")).toBeVisible({
      timeout: 120_000,
    });
    await expect(
      page.getByTestId("automation-flow-if-else-graph"),
    ).toBeVisible();
    await expect(
      page.getByTestId("automation-flow-switch-graph"),
    ).toBeVisible();

    await page.getByTestId("automation-flow-if-else-graph").click();
    await expect(
      page.getByTestId("automation-branching-authoring"),
    ).toBeVisible({
      timeout: 30_000,
    });
  });

  test("AT-UI-003: recent run shows chosen path and branches not taken", async ({
    page,
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

    await installAutomationBuilderApiMocks(page);
    await page.goto(`/${E2E_SLUG}/settings/automation`);
    await expect(
      page.getByRole("heading", { name: /event automations/i }),
    ).toBeVisible({ timeout: 120_000 });

    await expect(
      page.getByTestId(`automation-run-branch-path-${E2E_STUB_GRAPH_RUN_ID}`),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByTestId(
        `automation-run-skipped-branches-${E2E_STUB_GRAPH_RUN_ID}`,
      ),
    ).toBeVisible();
    await expect(page.getByText(/If → Then \(conditions met\)/i)).toBeVisible();
    await expect(
      page.getByText(/If → not taken: Else \(conditions not met\)/i),
    ).toBeVisible();
  });
});

test.describe("Event automations — branching disabled", () => {
  test.skip(
    process.env.E2E_AUTOMATION_BRANCHING_OFF !== "1",
    "run with E2E_AUTOMATION_BRANCHING_OFF=1 so the dev server omits AUTOMATION_BRANCHING from NEXT_PUBLIC_FEATURE_FLAGS",
  );

  test("AT-UI-001: if/switch graph buttons are not offered", async ({
    page,
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

    await page.goto(`/${E2E_SLUG}/settings/automation`);
    await expect(
      page.getByRole("heading", { name: /event automations/i }),
    ).toBeVisible({ timeout: 120_000 });

    await page.getByTestId("automation-open-create-composer").click();
    await page.getByTestId("automation-editor-tab-flow-chart").click();
    await expect(page.getByTestId("automation-flow-canvas")).toBeVisible({
      timeout: 120_000,
    });
    await expect(page.getByTestId("automation-flow-if-else-graph")).toHaveCount(
      0,
    );
    await expect(page.getByTestId("automation-flow-switch-graph")).toHaveCount(
      0,
    );
  });
});
