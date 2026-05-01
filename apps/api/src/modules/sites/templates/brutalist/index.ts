/**
 * Brutalist template blueprint
 */

import { resetIdCounter } from "../_shared/factories";
import { productsIndexLayout, offersLayout } from "../_shared";
import type { TemplateBlueprint } from "@repo/shared";
import { brutalistHome } from "./home";
import { brutalistPdp } from "./pdp";

export const brutalistBlueprint: TemplateBlueprint = {
  slug: "brutalist",
  layouts: {
    home: brutalistHome(),
    "products-index": (() => {
      resetIdCounter();
      return productsIndexLayout();
    })(),
    offers: (() => {
      resetIdCounter();
      return offersLayout();
    })(),
    "product-detail": brutalistPdp(),
  },
  defaultThemeTokens: {
    mode: "light",
    colors: {
      primary: "#000000",
      secondary: "#333333",
      accent: "#ffffff",
      background: "#ffffff",
      surface: "#f5f5f5",
      text: "#000000",
      muted: "#666666",
      border: "#cccccc",
      ring: "#000000",
      onPrimary: "#ffffff",
    },
    typography: {
      heading: { family: "system-ui, sans-serif" },
      body: { family: "system-ui, sans-serif" },
      scaleRatio: 1.2,
      baseSize: 16,
    },
    spacing: { unit: 4, section: "balanced", container: 1200 },
    shape: { radius: "sharp", buttonStyle: "solid" },
    motion: { enableAnimations: true, duration: 200 },
  },
};
