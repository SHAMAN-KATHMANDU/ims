/**
 * Auric template blueprint — Jewelry · Accessories
 *
 * Cream-on-cream luxury. Italic Fraunces display, gold accent,
 * hairline radius, museum-tier whitespace.
 */

import type { TemplateBlueprint } from "@repo/shared";
import { resetIdCounter } from "../_shared/factories";
import { productsIndexLayout, offersLayout } from "../_shared";
import { auricHome } from "./home";
import { auricPdp } from "./pdp";
import { auricCart } from "./cart";

export const auricBlueprint: TemplateBlueprint = {
  slug: "auric",
  layouts: {
    home: auricHome(),
    "products-index": (() => {
      resetIdCounter();
      return productsIndexLayout();
    })(),
    "product-detail": auricPdp(),
    offers: (() => {
      resetIdCounter();
      return offersLayout();
    })(),
    cart: auricCart(),
  },
  defaultThemeTokens: {
    mode: "light",
    colors: {
      primary: "#2a1f17",
      secondary: "#6b4a1f",
      accent: "#b8924a",
      background: "#f5ede0",
      surface: "#fbf6ec",
      text: "#2a1f17",
      muted: "#9a8770",
      border: "#dcc69a",
      ring: "#b8924a",
      onPrimary: "#f5ede0",
    },
    typography: {
      heading: {
        family: "Fraunces, 'Times New Roman', serif",
        weights: [300, 400],
      },
      body: { family: "Inter, system-ui, sans-serif" },
      display: {
        family: "Fraunces, 'Times New Roman', serif",
        weights: [300],
      },
      scaleRatio: 1.25,
      baseSize: 16,
    },
    spacing: { unit: 4, section: "spacious", container: 1320 },
    shape: { radius: "sharp", buttonStyle: "outline" },
    motion: { enableAnimations: true, duration: 280 },
  },
};
