import {
  test,
  expect,
  E2E_SLUG,
  E2E_USERNAME,
  E2E_PASSWORD,
} from "../fixtures";

const TEST_PRODUCT_NAME = `E2E Product ${Date.now()}`;

test.describe("Product CRUD", () => {
  test.beforeEach(async ({ slugEntryPage, loginPage, page }) => {
    await slugEntryPage.goto();
    await slugEntryPage.enterSlugAndGo(E2E_SLUG);
    await loginPage.login(E2E_USERNAME, E2E_PASSWORD);
    await expect(page).toHaveURL(new RegExp(`/${E2E_SLUG}(/)?$`));
  });

  test("creates a product and shows it in the table", async ({
    productsPage,
  }) => {
    await productsPage.goto(E2E_SLUG);
    await productsPage.expectLoaded();

    await productsPage.openAddProductDialog();
    await productsPage.fillProductForm({
      name: TEST_PRODUCT_NAME,
      category: "Furniture",
      costPrice: "100",
      mrp: "150",
    });
    await productsPage.goToVariationsTabAndAddVariation("5");
    await productsPage.submitProductForm();

    await productsPage.expectProductInTable(TEST_PRODUCT_NAME);
  });

  test("edits a product", async ({ productsPage }) => {
    await productsPage.goto(E2E_SLUG);
    await productsPage.expectLoaded();

    const editName = `E2E Edited ${Date.now()}`;
    await productsPage.editProduct("Wooden Sofa");
    await productsPage.page.getByLabel(/product name/i).clear();
    await productsPage.page.getByLabel(/product name/i).fill(editName);
    await productsPage.page.getByRole("button", { name: /^next/i }).click();
    await productsPage.page.getByRole("button", { name: /^next/i }).click();
    await productsPage.page.getByRole("button", { name: /^next/i }).click();
    await productsPage.submitProductForm();

    await productsPage.expectProductInTable(editName);
  });

  test("deletes a product", async ({ productsPage }) => {
    await productsPage.goto(E2E_SLUG);
    await productsPage.expectLoaded();

    await productsPage.openAddProductDialog();
    const deleteProductName = `E2E To Delete ${Date.now()}`;
    await productsPage.fillProductForm({
      name: deleteProductName,
      category: "Electronics",
      costPrice: "50",
      mrp: "75",
    });
    await productsPage.goToVariationsTabAndAddVariation("1");
    await productsPage.submitProductForm();

    await productsPage.expectProductInTable(deleteProductName);
    await productsPage.deleteProduct(deleteProductName);
    await productsPage.confirmDelete();

    await expect(
      productsPage.page.getByRole("cell", { name: deleteProductName }),
    ).not.toBeVisible();
  });
});
