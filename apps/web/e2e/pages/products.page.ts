import { Page, expect } from "@playwright/test";

export class ProductsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async expectLoaded() {
    await expect(
      this.page.getByRole("heading", { name: /products|product catalog/i }),
    ).toBeVisible({ timeout: 10000 });
  }

  async goto(slug: string) {
    await this.page.goto(`/${slug}/products`);
  }

  async openAddProductDialog() {
    await this.page.getByRole("button", { name: /add product/i }).click();
  }

  async expectProductInTable(name: string) {
    await expect(this.page.getByRole("cell", { name })).toBeVisible();
  }

  async fillProductForm(options: {
    name: string;
    category?: string;
    costPrice?: string;
    mrp?: string;
    imsCode?: string;
  }) {
    if (options.imsCode) {
      await this.page.getByLabel(/ims code|barcode/i).fill(options.imsCode);
    }
    await this.page.getByLabel(/product name/i).fill(options.name);
    if (options.category) {
      await this.page.getByRole("combobox").first().click();
      await this.page.getByRole("option", { name: options.category }).click();
    }
    if (options.costPrice) {
      await this.page.getByLabel(/cost price/i).fill(options.costPrice);
    }
    if (options.mrp) {
      await this.page.getByLabel(/^mrp|selling price/i).fill(options.mrp);
    }
  }

  async goToVariationsTabAndAddVariation(stockQuantity = "10") {
    await this.page.getByRole("button", { name: /^next/i }).click();
    await this.page.getByRole("button", { name: /^next/i }).click();
    await this.page.getByRole("button", { name: /add variation/i }).click();
    await this.page
      .locator('input[id^="var-stock-"]')
      .first()
      .fill(stockQuantity);
    await this.page.getByRole("button", { name: /^next/i }).click();
  }

  async submitProductForm() {
    await this.page.getByRole("button", { name: /^add$|^update$/i }).click();
  }

  async openProductActions(productName: string) {
    const row = this.page.getByRole("row").filter({ hasText: productName });
    await row.getByRole("button", { name: /actions/i }).click();
  }

  async editProduct(productName: string) {
    await this.openProductActions(productName);
    await this.page.getByRole("menuitem", { name: /edit product/i }).click();
  }

  async deleteProduct(productName: string) {
    await this.openProductActions(productName);
    await this.page.getByRole("menuitem", { name: /delete product/i }).click();
  }

  async confirmDelete() {
    await this.page
      .getByRole("alertdialog")
      .getByRole("button", { name: /^delete$/i })
      .click();
  }
}
