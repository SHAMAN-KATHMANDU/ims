/**
 * Artisan template blueprint
 */

import { resetIdCounter } from "../_shared/factories";
import { productsIndexLayout, offersLayout } from "../_shared";
import type { TemplateBlueprint } from "@repo/shared";
import { artisanHome } from "./home";
import { artisanPdp } from "./pdp";

export const artisanBlueprint: TemplateBlueprint = {
  slug: "artisan",
  layouts: {
    home: artisanHome(),
    "products-index": (() => {
      resetIdCounter();
      return productsIndexLayout();
    })(),
    offers: (() => {
      resetIdCounter();
      return offersLayout();
    })(),
    "product-detail": artisanPdp(),
  },
  defaultThemeTokens: {
    mode: "light",
    colors: {
      primary: "#6b5344",
      secondary: "#a39080",
      accent: "#fef7f3",
      background: "#fffbf8",
      surface: "#fef7f3",
      text: "#3d3530",
      muted: "#9a8b7e",
      border: "#e8ddd0",
      ring: "#6b5344",
      onPrimary: "#ffffff",
    },
    typography: {
      heading: { family: "Georgia, 'Times New Roman', serif" },
      body: { family: "system-ui, sans-serif" },
      scaleRatio: 1.2,
      baseSize: 16,
    },
    spacing: { unit: 4, section: "balanced", container: 1200 },
    shape: { radius: "soft", buttonStyle: "solid" },
    motion: { enableAnimations: true, duration: 200 },
  },
};
