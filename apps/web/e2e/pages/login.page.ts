import { Page, expect } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly usernameInput: ReturnType<Page["getByRole"]>;
  readonly passwordInput: ReturnType<Page["getByPlaceholder"]>;
  readonly loginButton: ReturnType<Page["getByRole"]>;
  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.getByRole("textbox", { name: "Username" });
    this.passwordInput = page.getByPlaceholder("Enter your password");
    this.loginButton = page.getByRole("button", { name: /^login$/i });
  }

  async goto(slug: string) {
    await this.page.goto(`/${slug}/login`);
  }

  async expectLoaded() {
    await expect(this.usernameInput).toBeVisible({ timeout: 10000 });
    await expect(this.passwordInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async expectError(message: string | RegExp) {
    const pattern =
      typeof message === "string" ? new RegExp(message, "i") : message;
    await expect(this.page.getByText(pattern)).toBeVisible({ timeout: 5000 });
  }
}
