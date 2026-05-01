/**
 * Gallery template blueprint
 */

import { resetIdCounter } from "../_shared/factories";
import { productsIndexLayout, offersLayout } from "../_shared";
import type { TemplateBlueprint } from "@repo/shared";
import { galleryHome } from "./home";
import { galleryPdp } from "./pdp";

export const galleryBlueprint: TemplateBlueprint = {
  slug: "gallery",
  layouts: {
    home: galleryHome(),
    "products-index": (() => {
      resetIdCounter();
      return productsIndexLayout();
    })(),
    offers: (() => {
      resetIdCounter();
      return offersLayout();
    })(),
    "product-detail": galleryPdp(),
  },
  defaultThemeTokens: {
    mode: "light",
    colors: {
      primary: "#1a1a1a",
      secondary: "#666666",
      accent: "#f5f5f5",
      background: "#ffffff",
      surface: "#fafafa",
      text: "#1a1a1a",
      muted: "#888888",
      border: "#eeeeee",
      ring: "#1a1a1a",
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
