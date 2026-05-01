/**
 * Organic template blueprint
 */

import { resetIdCounter } from "../_shared/factories";
import { productsIndexLayout, offersLayout } from "../_shared";
import type { TemplateBlueprint } from "@repo/shared";
import { organicHome } from "./home";
import { organicPdp } from "./pdp";

export const organicBlueprint: TemplateBlueprint = {
  slug: "organic",
  layouts: {
    home: organicHome(),
    "products-index": (() => {
      resetIdCounter();
      return productsIndexLayout();
    })(),
    offers: (() => {
      resetIdCounter();
      return offersLayout();
    })(),
    "product-detail": organicPdp(),
  },
  defaultThemeTokens: {
    mode: "light",
    colors: {
      primary: "#3d5a3d",
      secondary: "#6b8e6b",
      accent: "#f5f0e8",
      background: "#faf8f3",
      surface: "#f0ede5",
      text: "#2d2d2d",
      muted: "#7a7a6e",
      border: "#e0dbd0",
      ring: "#3d5a3d",
      onPrimary: "#ffffff",
    },
    typography: {
      heading: { family: "Georgia, 'Times New Roman', serif" },
      body: { family: "system-ui, sans-serif" },
      scaleRatio: 1.2,
      baseSize: 16,
    },
    spacing: { unit: 4, section: "balanced", container: 1200 },
    shape: { radius: "rounded", buttonStyle: "solid" },
    motion: { enableAnimations: true, duration: 200 },
  },
};
