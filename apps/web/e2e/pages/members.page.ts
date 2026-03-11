import { Page, expect } from "@playwright/test";

export class MembersPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(slug: string) {
    await this.page.goto(`/${slug}/members`);
  }

  async expectLoaded() {
    await expect(
      this.page.getByRole("heading", { name: /^Members$/ }),
    ).toBeVisible({ timeout: 10000 });
  }

  async clickAddMember() {
    await this.page.getByRole("button", { name: /add member/i }).click();
  }

  async fillMemberForm(data: { phone: string; name?: string; email?: string }) {
    const dialog = this.page.getByRole("dialog");
    await dialog.getByLabel(/phone/i).fill(data.phone);
    if (data.name) await dialog.getByLabel(/^name$/i).fill(data.name);
    if (data.email) await dialog.getByLabel(/email/i).fill(data.email);
  }

  async submitMemberForm() {
    const dialog = this.page.getByRole("dialog");
    await dialog.getByRole("button", { name: /^(Save|Add) Member$/i }).click();
  }

  async expectSuccessToast() {
    await expect(
      this.page.getByText(/member created|updated successfully/i),
    ).toBeVisible({ timeout: 5000 });
  }

  async gotoBulkUpload(slug: string) {
    await this.page.goto(`/${slug}/members/bulk-upload`);
  }

  async expectBulkUploadLoaded() {
    await expect(
      this.page.getByText(/bulk upload|upload members/i),
    ).toBeVisible({ timeout: 10000 });
  }

  async gotoNewMember(slug: string) {
    await this.page.goto(`/${slug}/members/new`);
  }

  async expectNewMemberLoaded() {
    await expect(
      this.page.getByRole("heading", { name: /add member|new member/i }),
    ).toBeVisible({ timeout: 10000 });
  }

  async fillInlineMemberForm(data: { phone: string; name?: string }) {
    await this.page.getByLabel(/phone/i).fill(data.phone);
    if (data.name) await this.page.getByLabel(/name/i).fill(data.name);
  }

  async submitInlineMemberForm() {
    await this.page
      .getByRole("button", { name: /^(Save|Add) Member$/i })
      .click();
  }

  async expectRedirectToMembers() {
    await expect(this.page).toHaveURL(/\/members$/);
  }
}
