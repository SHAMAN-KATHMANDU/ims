import { expect, test } from "@playwright/test";

/**
 * Mobile QA spec: viewport matrix per README UI/UX optimization.
 * Target widths: 320, 360, 390, 430 (mobile)
 * Target heights: 568, 667, 844, 900 (common mobile heights)
 */
const viewports = [
  { width: 320, height: 568 },
  { width: 360, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 900 },
];

const publicRoutes = ["/", "/system/login", "/ruby/login"];

for (const viewport of viewports) {
  for (const route of publicRoutes) {
    test(`mobile no overflow ${viewport.width}x${viewport.height} on ${route}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto(route);

      const hasOverflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth > doc.clientWidth + 1;
      });

      expect(hasOverflow).toBeFalsy();
    });
  }
}
