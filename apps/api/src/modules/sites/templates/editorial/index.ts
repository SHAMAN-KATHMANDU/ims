/**
 * Editorial template blueprint
 */

import { resetIdCounter } from "../_shared/factories";
import { productsIndexLayout, offersLayout } from "../_shared";
import type { TemplateBlueprint } from "@repo/shared";
import { editorialHome } from "./home";
import { editorialPdp } from "./pdp";

export const editorialBlueprint: TemplateBlueprint = {
  slug: "editorial",
  layouts: {
    home: editorialHome(),
    "products-index": (() => {
      resetIdCounter();
      return productsIndexLayout();
    })(),
    offers: (() => {
      resetIdCounter();
      return offersLayout();
    })(),
    "product-detail": editorialPdp(),
  },
  defaultThemeTokens: {
    mode: "light",
    colors: {
      primary: "#1a1a2e",
      secondary: "#4a4a6a",
      accent: "#f0ebe3",
      background: "#fdfcfa",
      surface: "#f5f3ef",
      text: "#1a1a2e",
      muted: "#6b7280",
      border: "#e5e0d8",
      ring: "#1a1a2e",
      onPrimary: "#ffffff",
    },
    typography: {
      heading: { family: "Georgia, 'Times New Roman', serif" },
      body: { family: "system-ui, sans-serif" },
      scaleRatio: 1.25,
      baseSize: 16,
    },
    spacing: { unit: 4, section: "balanced", container: 1200 },
    shape: { radius: "soft", buttonStyle: "solid" },
    motion: { enableAnimations: true, duration: 200 },
  },
};
