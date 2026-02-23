import { expect, test } from "@playwright/test";

const widths = [320, 360, 390, 430, 768, 1024, 1280];
const routes = ["/login", "/admin/login", "/system/login", "/ruby/login"];

for (const width of widths) {
  for (const route of routes) {
    test(`no root overflow at ${width}px on ${route}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);

      const hasOverflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth > doc.clientWidth + 1;
      });

      expect(hasOverflow).toBeFalsy();
    });
  }
}
