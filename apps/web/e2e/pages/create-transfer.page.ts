import { Page, expect } from "@playwright/test";

export class CreateTransferPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(slug: string) {
    await this.page.goto(`/${slug}/transfers/new`);
  }

  async expectLoaded() {
    await expect(
      this.page.getByRole("heading", { name: /create transfer|request/i }),
    ).toBeVisible({ timeout: 10000 });
  }

  async selectFromLocation(nameContains: string) {
    await this.page.getByRole("combobox").first().click();
    await this.page
      .getByRole("option", { name: new RegExp(nameContains, "i") })
      .first()
      .click();
  }

  async selectToLocation(nameContains: string) {
    await this.page.getByRole("combobox").nth(1).click();
    await this.page
      .getByRole("option", { name: new RegExp(nameContains, "i") })
      .first()
      .click();
  }

  async selectFirstProductAndAdd(quantity = 1) {
    const productCombo = this.page.getByRole("combobox").nth(2);
    await productCombo.click();
    const firstProductOption = this.page
      .getByRole("option")
      .filter({ hasNotText: /select product|loading/i })
      .first();
    await firstProductOption.waitFor({ state: "visible", timeout: 10000 });
    await firstProductOption.click();
    await this.page.getByPlaceholder("Qty").fill(quantity.toString());
    await this.page.getByRole("button", { name: "Add" }).click();
  }

  async enableCompleteNow() {
    await this.page.getByLabel(/complete transfer now/i).click();
  }

  async submitTransfer() {
    await this.page.getByRole("button", { name: /create transfer/i }).click();
  }

  async expectRedirectToTransfers() {
    await expect(this.page).toHaveURL(/\/transfers$/);
  }

  async expectSuccessToast() {
    await expect(
      this.page.getByText(/transfer completed|created successfully/i),
    ).toBeVisible({ timeout: 5000 });
  }
}
