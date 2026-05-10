import { test, expect } from "@playwright/test";
import { E2E_SLUG, E2E_USERNAME, E2E_PASSWORD } from "../fixtures";

/**
 * CMS template-apply E2E.
 *
 * Locks the user-visible contract that picking a template populates a
 * tenant's storefront end-to-end:
 *
 *   1. Apply a template from the editor.
 *   2. The Navigation tab shows primary nav items derived from the
 *      template's PAGE_SCOPES (regression target for "nav tab empty
 *      after apply" — fixed in PR #532, this spec keeps it fixed).
 *   3. The rendered storefront `/` shows the applied header + first
 *      hero/product block (regression target for "apply did nothing"
 *      symptoms users report when only draftBlocks were written).
 *
 * Marked `fixme` for now — full E2E requires a tenant pre-seeded with
 * the editor flow + storefront preview routes, which the next builder
 * UX phase (Phase 6) will stabilise. Keeping the spec in the tree
 * documents the contract and gives Phase 6 a concrete target to flip
 * back to `test()`.
 */
test.describe.fixme("CMS template apply", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/${E2E_SLUG}/login`);
    await page.getByRole("textbox", { name: "Username" }).fill(E2E_USERNAME);
    await page.getByPlaceholder("Enter your password").fill(E2E_PASSWORD);
    await page.getByRole("button", { name: /^Login$/ }).click();
  });

  test("applying lumen seeds nav primary items", async ({ page }) => {
    await page.goto(`/${E2E_SLUG}/site/templates`);
    await page.getByRole("button", { name: /apply lumen/i }).click();
    await expect(
      page.getByRole("status", { name: /template applied/i }),
    ).toBeVisible();

    await page.goto(`/${E2E_SLUG}/site/navigation`);
    // Lumen has home, products-index, offers, contact populated.
    await expect(page.getByRole("listitem")).toHaveCount(4);
  });

  test("editing site navigation reflects in the rendered nav bar", async ({
    page,
  }) => {
    await page.goto(`/${E2E_SLUG}/site/navigation`);
    await page
      .getByRole("textbox", { name: /primary item label/i })
      .first()
      .fill("Renamed");
    await page.getByRole("button", { name: /save/i }).click();

    // Storefront preview should reflect the rename without touching
    // the nav-bar block itself.
    await page.goto(`/${E2E_SLUG}/site/preview`);
    await expect(page.getByRole("link", { name: "Renamed" })).toBeVisible();
  });
});
