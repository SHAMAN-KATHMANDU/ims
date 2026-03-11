import { Page, expect } from "@playwright/test";

export class DashboardPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async expectLoaded(slug: string) {
    await expect(this.page).toHaveURL(new RegExp(`/${slug}(/)?$`));
    await expect(
      this.page.getByRole("heading", { name: /dashboard/i }),
    ).toBeVisible({ timeout: 10000 });
  }

  async gotoProducts(slug: string) {
    await this.page.goto(`/${slug}/products`);
  }

  async gotoSales(slug: string) {
    await this.page.goto(`/${slug}/sales`);
  }

  async gotoNewSale(slug: string) {
    await this.page.goto(`/${slug}/sales/new`);
  }
}
