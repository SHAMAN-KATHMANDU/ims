/**
 * Zen template blueprint
 */

import { resetIdCounter } from "../_shared/factories";
import { productsIndexLayout, offersLayout } from "../_shared";
import type { TemplateBlueprint } from "@repo/shared";
import { zenHome } from "./home";
import { zenPdp } from "./pdp";

export const zenBlueprint: TemplateBlueprint = {
  slug: "zen",
  layouts: {
    home: zenHome(),
    "products-index": (() => {
      resetIdCounter();
      return productsIndexLayout();
    })(),
    offers: (() => {
      resetIdCounter();
      return offersLayout();
    })(),
    "product-detail": zenPdp(),
  },
  defaultThemeTokens: {
    mode: "light",
    colors: {
      primary: "#333333",
      secondary: "#666666",
      accent: "#f9f9f9",
      background: "#ffffff",
      surface: "#fafafa",
      text: "#333333",
      muted: "#999999",
      border: "#e0e0e0",
      ring: "#333333",
      onPrimary: "#ffffff",
    },
    typography: {
      heading: { family: "system-ui, sans-serif" },
      body: { family: "system-ui, sans-serif" },
      scaleRatio: 1.15,
      baseSize: 16,
    },
    spacing: { unit: 4, section: "balanced", container: 1200 },
    shape: { radius: "soft", buttonStyle: "outline" },
    motion: { enableAnimations: true, duration: 200 },
  },
};
