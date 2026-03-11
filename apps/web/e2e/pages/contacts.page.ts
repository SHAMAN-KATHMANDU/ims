import { Page, expect } from "@playwright/test";

export class ContactsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(slug: string) {
    await this.page.goto(`/${slug}/crm/contacts`);
  }

  async expectLoaded() {
    await expect(
      this.page.getByRole("heading", { name: /^Contacts$/ }),
    ).toBeVisible({ timeout: 10000 });
  }

  async clickAddContact() {
    await this.page.getByRole("button", { name: /add contact/i }).click();
  }

  async fillContactForm(data: {
    firstName: string;
    lastName?: string;
    email?: string;
  }) {
    const form = this.page.locator("form");
    await form.getByLabel(/first name/i).fill(data.firstName);
    if (data.lastName) await form.getByLabel(/last name/i).fill(data.lastName);
    if (data.email) await form.getByLabel(/email/i).fill(data.email);
  }

  async submitContactForm() {
    await this.page
      .getByRole("button", { name: /^Save$/ })
      .first()
      .click();
  }

  async expectSuccessToast() {
    await expect(
      this.page.getByText(/contact created|updated|imported/i),
    ).toBeVisible({ timeout: 5000 });
  }

  async gotoNewContact(slug: string) {
    await this.page.goto(`/${slug}/crm/contacts/new`);
  }

  async expectNewContactLoaded() {
    await expect(
      this.page.getByRole("heading", { name: /new contact|add contact/i }),
    ).toBeVisible({ timeout: 10000 });
  }

  async fillNewContactForm(data: {
    firstName: string;
    lastName?: string;
    email?: string;
  }) {
    await this.page.getByLabel(/first name/i).fill(data.firstName);
    if (data.lastName)
      await this.page.getByLabel(/last name/i).fill(data.lastName);
    if (data.email) await this.page.getByLabel(/email/i).fill(data.email);
  }

  async submitNewContactForm() {
    await this.page.getByRole("button", { name: /^Save$/ }).click();
  }

  async expectRedirectToContacts() {
    await expect(this.page).toHaveURL(/\/crm\/contacts$/);
  }
}
