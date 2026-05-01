/**
 * Dark template blueprint
 */

import { resetIdCounter } from "../_shared/factories";
import { productsIndexLayout, offersLayout } from "../_shared";
import type { TemplateBlueprint } from "@repo/shared";
import { darkHome } from "./home";
import { darkPdp } from "./pdp";

export const darkBlueprint: TemplateBlueprint = {
  slug: "dark",
  layouts: {
    home: darkHome(),
    "products-index": (() => {
      resetIdCounter();
      return productsIndexLayout();
    })(),
    offers: (() => {
      resetIdCounter();
      return offersLayout();
    })(),
    "product-detail": darkPdp(),
  },
  defaultThemeTokens: {
    mode: "dark",
    colors: {
      primary: "#e0e0e0",
      secondary: "#888888",
      accent: "#1a1a2e",
      background: "#0a0a0a",
      surface: "#141414",
      text: "#e8e8e8",
      muted: "#777777",
      border: "#2a2a2a",
      ring: "#e0e0e0",
      onPrimary: "#0a0a0a",
    },
    typography: {
      heading: { family: "system-ui, sans-serif" },
      body: { family: "system-ui, sans-serif" },
      scaleRatio: 1.25,
      baseSize: 16,
    },
    spacing: { unit: 4, section: "balanced", container: 1200 },
    shape: { radius: "sharp", buttonStyle: "solid" },
    motion: { enableAnimations: true, duration: 200 },
  },
};
