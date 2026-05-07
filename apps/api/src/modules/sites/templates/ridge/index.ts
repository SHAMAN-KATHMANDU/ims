/**
 * Ridge// template blueprint — Sports · Fitness
 *
 * High-contrast performance. Inter 800 italic display, tactical orange,
 * sharp 0px radius, balanced rhythm.
 */

import type { TemplateBlueprint } from "@repo/shared";
import { resetIdCounter } from "../_shared/factories";
import {
  productsIndexLayout,
  offersLayout,
  buildTemplateNavSeed,
} from "../_shared";
import { ridgeHome } from "./home";
import { ridgePdp } from "./pdp";
import { ridgeCart } from "./cart";

const ridgeNav = buildTemplateNavSeed({
  brandName: "Ridge//",
  brandTagline: "Built for the climb.",
  headerCta: { label: "Shop gear", href: "/products", style: "primary" },
});

export const ridgeBlueprint: TemplateBlueprint = {
  slug: "ridge",
  ...ridgeNav,
  layouts: {
    home: ridgeHome(),
    "products-index": (() => {
      resetIdCounter();
      return productsIndexLayout();
    })(),
    "product-detail": ridgePdp(),
    offers: (() => {
      resetIdCounter();
      return offersLayout();
    })(),
    cart: ridgeCart(),
  },
  defaultThemeTokens: {
    mode: "light",
    colors: {
      primary: "#0a0a0a",
      secondary: "#3a3a3a",
      accent: "#ff5722",
      background: "#f5f4f0",
      surface: "#e8e6e0",
      text: "#0a0a0a",
      muted: "#6b6863",
      border: "#d6d3cc",
      ring: "#ff5722",
      onPrimary: "#f5f4f0",
    },
    typography: {
      heading: { family: "Inter, system-ui, sans-serif", weights: [700, 800] },
      body: { family: "Inter, system-ui, sans-serif" },
      display: { family: "Inter, system-ui, sans-serif", weights: [800] },
      scaleRatio: 1.333,
      baseSize: 15,
    },
    spacing: { unit: 4, section: "balanced", container: 1320 },
    shape: { radius: "sharp", buttonStyle: "solid" },
    motion: { enableAnimations: true, duration: 160 },
  },
};
