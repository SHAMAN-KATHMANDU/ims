import { Page, expect } from "@playwright/test";

export class NewSalePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(slug: string) {
    await this.page.goto(`/${slug}/sales/new`);
  }

  async expectLoaded() {
    await expect(
      this.page
        .getByRole("heading", { name: /add product|shopping cart/i })
        .first(),
    ).toBeVisible({ timeout: 10000 });
  }

  async selectLocation(locationName: string) {
    await this.page
      .getByRole("combobox")
      .filter({ hasText: /showroom|select/i })
      .click();
    await this.page
      .getByRole("option", { name: new RegExp(locationName, "i") })
      .click();
  }

  async addProductBySearch(productNameOrCode: string) {
    const searchInput = this.page.getByPlaceholder(
      /search by product name|product code|barcode/i,
    );
    await searchInput.fill(productNameOrCode);
    const addBtn = this.page.getByRole("button", { name: /^add$/i }).first();
    await addBtn.waitFor({ state: "visible", timeout: 5000 });
    await addBtn.click();
  }

  async addFirstProductFromList() {
    const addBtn = this.page.getByRole("button", { name: /^add$/i }).first();
    await addBtn.waitFor({ state: "visible", timeout: 10000 });
    await addBtn.click();
  }

  async addPayment(amount: number) {
    const amountInput = this.page.getByPlaceholder(/amount|remaining/i);
    await amountInput.fill(amount.toString());
    const addButtons = this.page.getByRole("button", { name: "Add" });
    const count = await addButtons.count();
    await addButtons.nth(count - 1).click();
  }

  async payFull() {
    await this.page.getByRole("button", { name: /pay full/i }).click();
  }

  async completeSale() {
    await this.page.getByRole("button", { name: /complete sale/i }).click();
  }

  async expectRedirectToSales() {
    await expect(this.page).toHaveURL(/\/sales$/);
  }

  async expectSuccessToast() {
    await expect(
      this.page.getByText(/sale completed successfully|success/i),
    ).toBeVisible({ timeout: 5000 });
  }
}
