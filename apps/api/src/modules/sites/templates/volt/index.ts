/**
 * Volt template blueprint — Electronics · Gadgets
 *
 * Deep-night UI, lime accent, JetBrains Mono accents, soft 18px radius,
 * dark mode, balanced rhythm.
 */

import type { TemplateBlueprint } from "@repo/shared";
import { resetIdCounter } from "../_shared/factories";
import { productsIndexLayout, offersLayout } from "../_shared";
import { voltHome } from "./home";
import { voltPdp } from "./pdp";
import { voltCart } from "./cart";

export const voltBlueprint: TemplateBlueprint = {
  slug: "volt",
  layouts: {
    home: voltHome(),
    "products-index": (() => {
      resetIdCounter();
      return productsIndexLayout();
    })(),
    "product-detail": voltPdp(),
    offers: (() => {
      resetIdCounter();
      return offersLayout();
    })(),
    cart: voltCart(),
  },
  defaultThemeTokens: {
    mode: "dark",
    colors: {
      primary: "#d6f25a",
      secondary: "#9aa3b0",
      accent: "#d6f25a",
      background: "#07090d",
      surface: "#15191f",
      text: "#e8eaf0",
      muted: "#9aa3b0",
      border: "#2a2f38",
      ring: "#d6f25a",
      onPrimary: "#07090d",
    },
    typography: {
      heading: { family: "Inter, system-ui, sans-serif", weights: [600, 700] },
      body: { family: "Inter, system-ui, sans-serif" },
      display: {
        family: "'JetBrains Mono', ui-monospace, monospace",
        weights: [500],
      },
      scaleRatio: 1.2,
      baseSize: 14,
    },
    spacing: { unit: 4, section: "balanced", container: 1320 },
    shape: { radius: 18, buttonStyle: "solid" },
    motion: { enableAnimations: true, duration: 200 },
  },
};
