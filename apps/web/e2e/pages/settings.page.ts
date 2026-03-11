import { Page, expect } from "@playwright/test";

export class SettingsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(slug: string) {
    await this.page.goto(`/${slug}/settings`);
  }

  async expectLoaded() {
    await expect(
      this.page.getByRole("heading", { name: /^Settings$/ }),
    ).toBeVisible({ timeout: 10000 });
  }

  async expectAccountSection() {
    await expect(
      this.page.getByText(/account information|change password/i),
    ).toBeVisible();
  }

  async gotoAuditLogs(slug: string) {
    await this.page.goto(`/${slug}/settings/logs`);
  }

  async expectAuditLogsLoaded() {
    await expect(
      this.page.getByRole("heading", { name: /user logs|audit log/i }),
    ).toBeVisible({ timeout: 10000 });
  }

  async gotoErrorReports(slug: string) {
    await this.page.goto(`/${slug}/settings/error-reports`);
  }

  async expectErrorReportsLoaded() {
    await expect(
      this.page.getByRole("heading", { name: /error reports/i }),
    ).toBeVisible({ timeout: 10000 });
  }
}
