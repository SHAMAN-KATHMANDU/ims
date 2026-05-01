/**
 * Retro template blueprint
 */

import { resetIdCounter } from "../_shared/factories";
import { productsIndexLayout, offersLayout } from "../_shared";
import type { TemplateBlueprint } from "@repo/shared";
import { retroHome } from "./home";
import { retroPdp } from "./pdp";

export const retroBlueprint: TemplateBlueprint = {
  slug: "retro",
  layouts: {
    home: retroHome(),
    "products-index": (() => {
      resetIdCounter();
      return productsIndexLayout();
    })(),
    offers: (() => {
      resetIdCounter();
      return offersLayout();
    })(),
    "product-detail": retroPdp(),
  },
  defaultThemeTokens: {
    mode: "light",
    colors: {
      primary: "#d4441a",
      secondary: "#e67e22",
      accent: "#fef3e6",
      background: "#fffaf5",
      surface: "#fef3e6",
      text: "#2c2c2c",
      muted: "#7f7f7f",
      border: "#f0e0c0",
      ring: "#d4441a",
      onPrimary: "#ffffff",
    },
    typography: {
      heading: { family: "system-ui, sans-serif" },
      body: { family: "system-ui, sans-serif" },
      scaleRatio: 1.3,
      baseSize: 16,
    },
    spacing: { unit: 4, section: "balanced", container: 1200 },
    shape: { radius: "soft", buttonStyle: "solid" },
    motion: { enableAnimations: true, duration: 200 },
  },
};
