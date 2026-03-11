import {
  test,
  expect,
  E2E_SLUG,
  E2E_USERNAME,
  E2E_PASSWORD,
} from "../fixtures";

test.describe("Sale creation", () => {
  test.beforeEach(async ({ slugEntryPage, loginPage, page }) => {
    await slugEntryPage.goto();
    await slugEntryPage.enterSlugAndGo(E2E_SLUG);
    await loginPage.login(E2E_USERNAME, E2E_PASSWORD);
    await expect(page).toHaveURL(new RegExp(`/${E2E_SLUG}(/)?$`));
  });

  test("creates a sale and redirects to sales list", async ({
    newSalePage,
  }) => {
    await newSalePage.goto(E2E_SLUG);
    await newSalePage.expectLoaded();

    await newSalePage.selectLocation("Showroom");
    await newSalePage.addFirstProductFromList();
    await newSalePage.payFull();
    await newSalePage.completeSale();

    await newSalePage.expectRedirectToSales();
    await newSalePage.expectSuccessToast();
  });
});
