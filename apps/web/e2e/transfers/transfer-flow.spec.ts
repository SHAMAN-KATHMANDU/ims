import {
  test,
  expect,
  E2E_SLUG,
  E2E_USERNAME,
  E2E_PASSWORD,
} from "../fixtures";

test.describe("Transfer flow", () => {
  test.beforeEach(async ({ slugEntryPage, loginPage, page }) => {
    await slugEntryPage.goto();
    await slugEntryPage.enterSlugAndGo(E2E_SLUG);
    await loginPage.login(E2E_USERNAME, E2E_PASSWORD);
    await expect(page).toHaveURL(new RegExp(`/${E2E_SLUG}(/)?$`));
  });

  test("creates transfer, completes immediately, redirects to transfers list", async ({
    createTransferPage,
  }) => {
    await createTransferPage.goto(E2E_SLUG);
    await createTransferPage.expectLoaded();

    await createTransferPage.selectFromLocation("Warehouse");
    await createTransferPage.selectToLocation("Showroom");
    await createTransferPage.selectFirstProductAndAdd(1);
    await createTransferPage.enableCompleteNow();
    await createTransferPage.submitTransfer();

    await createTransferPage.expectRedirectToTransfers();
    await createTransferPage.expectSuccessToast();
  });
});
