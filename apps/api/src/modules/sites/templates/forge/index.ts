/**
 * Forge template blueprint — Wholesale · B2B
 *
 * Industrial dark steel + hazard-amber accent. JetBrains Mono headings,
 * Inter body, sharp 2px radius, dark mode, compact rhythm.
 */

import type { TemplateBlueprint } from "@repo/shared";
import { resetIdCounter } from "../_shared/factories";
import {
  productsIndexLayout,
  offersLayout,
  buildTemplateNavSeed,
  blogIndexLayout,
  blogPostLayout,
  contactLayout,
  pageLayout,
  notFoundLayout,
} from "../_shared";
import { forgeHome } from "./home";
import { forgePdp } from "./pdp";
import { forgeCart } from "./cart";

const forgeNav = buildTemplateNavSeed({
  brandName: "Forge",
  brandTagline: "Industrial supply for working teams.",
  headerCta: { label: "Request a quote", href: "/contact", style: "primary" },
  footerLayout: "stacked",
});

export const forgeBlueprint: TemplateBlueprint = {
  slug: "forge",
  ...forgeNav,
  layouts: {
    home: forgeHome(),
    "products-index": (() => {
      resetIdCounter();
      return productsIndexLayout();
    })(),
    "product-detail": forgePdp(),
    offers: (() => {
      resetIdCounter();
      return offersLayout();
    })(),
    cart: forgeCart(),
    "blog-index": (() => {
      resetIdCounter();
      return blogIndexLayout();
    })(),
    "blog-post": (() => {
      resetIdCounter();
      return blogPostLayout();
    })(),
    contact: (() => {
      resetIdCounter();
      return contactLayout();
    })(),
    page: (() => {
      resetIdCounter();
      return pageLayout();
    })(),
    "404": (() => {
      resetIdCounter();
      return notFoundLayout();
    })(),
  },
  defaultThemeTokens: {
    mode: "dark",
    colors: {
      primary: "#d4af3a",
      secondary: "#3d4148",
      accent: "#d4af3a",
      background: "#14171c",
      surface: "#1a1d22",
      text: "#e8e4d8",
      muted: "#8a8e96",
      border: "#2a2e35",
      ring: "#d4af3a",
      onPrimary: "#14171c",
    },
    typography: {
      heading: { family: "Inter, system-ui, sans-serif", weights: [600, 700] },
      body: { family: "Inter, system-ui, sans-serif" },
      display: {
        family: "'JetBrains Mono', ui-monospace, monospace",
        weights: [500, 600],
      },
      scaleRatio: 1.2,
      baseSize: 14,
    },
    spacing: { unit: 4, section: "compact", container: 1480 },
    shape: { radius: "sharp", buttonStyle: "solid" },
    motion: { enableAnimations: false, duration: 120 },
  },
};
