/**
 * Fold template blueprint — Fashion · Apparel
 *
 * Swiss grid, ruthless typography. Inter 800 display, single oxblood accent,
 * sharp 0px radius, ruthless balanced rhythm.
 */

import type { TemplateBlueprint } from "@repo/shared";
import { resetIdCounter } from "../_shared/factories";
import {
  productsIndexLayout,
  offersLayout,
  buildTemplateNavSeed,
} from "../_shared";
import { foldHome } from "./home";
import { foldPdp } from "./pdp";
import { foldCart } from "./cart";

const foldNav = buildTemplateNavSeed({
  brandName: "Fold",
  brandTagline: "Apparel without ornament.",
  headerLayout: "minimal",
  footerLayout: "minimal",
});

export const foldBlueprint: TemplateBlueprint = {
  slug: "fold",
  ...foldNav,
  layouts: {
    home: foldHome(),
    "products-index": (() => {
      resetIdCounter();
      return productsIndexLayout();
    })(),
    "product-detail": foldPdp(),
    offers: (() => {
      resetIdCounter();
      return offersLayout();
    })(),
    cart: foldCart(),
  },
  defaultThemeTokens: {
    mode: "light",
    colors: {
      primary: "#0a0a0a",
      secondary: "#3a3a3a",
      accent: "#7a1c20",
      background: "#f5f5f3",
      surface: "#eceae5",
      text: "#0a0a0a",
      muted: "#6b6863",
      border: "#d8d4cb",
      ring: "#7a1c20",
      onPrimary: "#f5f5f3",
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
    motion: { enableAnimations: true, duration: 180 },
  },
};
