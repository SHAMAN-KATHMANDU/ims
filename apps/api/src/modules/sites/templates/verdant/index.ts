/**
 * Verdant template blueprint — Plants · Garden
 *
 * Forest-floor palette. Fraunces 400 italic display, soil-tone surfaces,
 * dark mode, balanced rhythm.
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
import { verdantHome } from "./home";
import { verdantPdp } from "./pdp";
import { verdantCart } from "./cart";

const verdantNav = buildTemplateNavSeed({
  brandName: "Verdant",
  brandTagline: "Living things, grown well.",
  enableNewsletter: true,
  newsletterHeading: "Care notes from the greenhouse",
});

export const verdantBlueprint: TemplateBlueprint = {
  slug: "verdant",
  ...verdantNav,
  layouts: {
    home: verdantHome(),
    "products-index": (() => {
      resetIdCounter();
      return productsIndexLayout();
    })(),
    "product-detail": verdantPdp(),
    offers: (() => {
      resetIdCounter();
      return offersLayout();
    })(),
    cart: verdantCart(),
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
      primary: "#6b8458",
      secondary: "#a89270",
      accent: "#a89270",
      background: "#2f3a2f",
      surface: "#3a4838",
      text: "#e3ddc8",
      muted: "#a8b29a",
      border: "#475744",
      ring: "#6b8458",
      onPrimary: "#e3ddc8",
    },
    typography: {
      heading: { family: "Fraunces, Georgia, serif", weights: [400, 500] },
      body: { family: "Inter, system-ui, sans-serif" },
      display: { family: "Fraunces, Georgia, serif", weights: [400] },
      scaleRatio: 1.25,
      baseSize: 16,
    },
    spacing: { unit: 4, section: "balanced", container: 1280 },
    shape: { radius: 2, buttonStyle: "solid" },
    motion: { enableAnimations: true, duration: 220 },
  },
};
