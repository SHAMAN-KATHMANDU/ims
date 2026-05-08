/**
 * Blank template blueprint — Empty canvas
 *
 * No pre-seeded blocks, no theme presets. All 12 scopes initialized as empty
 * arrays so the tenant can author from zero.
 */

import type { TemplateBlueprint } from "@repo/shared";
import { buildTemplateNavSeed } from "../_shared";

const blankNav = buildTemplateNavSeed({
  brandName: "Your Store",
  brandTagline: "",
  headerLayout: "left-logo",
  enableNewsletter: false,
});

export const blankBlueprint: TemplateBlueprint = {
  slug: "blank",
  ...blankNav,
  layouts: {
    header: [],
    home: [],
    footer: [],
    "products-index": [],
    "product-detail": [],
    offers: [],
    cart: [],
    "blog-index": [],
    "blog-post": [],
    contact: [],
    page: [],
    "404": [],
  },
  defaultThemeTokens: {
    mode: "light",
    colors: {
      primary: "#1a1a1a",
      secondary: "#525252",
      accent: "#3b82f6",
      background: "#ffffff",
      surface: "#fafafa",
      text: "#1a1a1a",
      muted: "#737373",
      border: "#e5e5e5",
      ring: "#3b82f6",
    },
    typography: {
      heading: "Inter",
      body: "Inter",
      display: "Inter",
      scaleRatio: 1.2,
      baseFontSize: 16,
    },
  },
};
