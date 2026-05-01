/**
 * Coastal template blueprint
 */

import { resetIdCounter } from "../_shared/factories";
import { productsIndexLayout, offersLayout } from "../_shared";
import type { TemplateBlueprint } from "@repo/shared";
import { coastalHome } from "./home";
import { coastalPdp } from "./pdp";

export const coastalBlueprint: TemplateBlueprint = {
  slug: "coastal",
  layouts: {
    home: coastalHome(),
    "products-index": (() => {
      resetIdCounter();
      return productsIndexLayout();
    })(),
    offers: (() => {
      resetIdCounter();
      return offersLayout();
    })(),
    "product-detail": coastalPdp(),
  },
  defaultThemeTokens: {
    mode: "light",
    colors: {
      primary: "#0a7a9e",
      secondary: "#4fa3bb",
      accent: "#fef3e6",
      background: "#ffffff",
      surface: "#f7f3ef",
      text: "#1a1a1a",
      muted: "#888888",
      border: "#e8e4e0",
      ring: "#0a7a9e",
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
