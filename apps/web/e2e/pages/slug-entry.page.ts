import { Page, expect } from "@playwright/test";

export class SlugEntryPage {
  readonly page: Page;
  readonly slugInput: ReturnType<Page["getByRole"]>;
  readonly goButton: ReturnType<Page["getByRole"]>;

  constructor(page: Page) {
    this.page = page;
    this.slugInput = page.getByRole("textbox", { name: /organization slug/i });
    this.goButton = page.getByRole("button", { name: /^go$/i });
  }

  async goto() {
    await this.page.goto("/");
  }

  async expectLoaded() {
    await expect(
      this.page.getByRole("heading", { name: /inventory management system/i }),
    ).toBeVisible();
    await expect(this.slugInput).toBeVisible();
    await expect(this.goButton).toBeVisible();
  }

  async enterSlugAndGo(slug: string) {
    await this.slugInput.fill(slug);
    await this.goButton.click();
    await this.page.waitForURL(`**/${slug}/login`);
  }
}
