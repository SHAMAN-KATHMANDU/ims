/**
 * Apothecary template blueprint
 */

import { resetIdCounter } from "../_shared/factories";
import { productsIndexLayout, offersLayout } from "../_shared";
import type { TemplateBlueprint } from "@repo/shared";
import { apothecaryHome } from "./home";
import { apothecaryPdp } from "./pdp";

export const apothecaryBlueprint: TemplateBlueprint = {
  slug: "apothecary",
  layouts: {
    home: apothecaryHome(),
    "products-index": (() => {
      resetIdCounter();
      return productsIndexLayout();
    })(),
    offers: (() => {
      resetIdCounter();
      return offersLayout();
    })(),
    "product-detail": apothecaryPdp(),
  },
  defaultThemeTokens: {
    mode: "light",
    colors: {
      primary: "#5c4a3d",
      secondary: "#8b7355",
      accent: "#f5f0e8",
      background: "#faf8f3",
      surface: "#f0ede5",
      text: "#3e3530",
      muted: "#8b8b7e",
      border: "#ddd4c6",
      ring: "#5c4a3d",
      onPrimary: "#ffffff",
    },
    typography: {
      heading: { family: "Georgia, 'Times New Roman', serif" },
      body: { family: "system-ui, sans-serif" },
      scaleRatio: 1.25,
      baseSize: 16,
    },
    spacing: { unit: 4, section: "balanced", container: 1200 },
    shape: { radius: "rounded", buttonStyle: "solid" },
    motion: { enableAnimations: true, duration: 200 },
  },
};
