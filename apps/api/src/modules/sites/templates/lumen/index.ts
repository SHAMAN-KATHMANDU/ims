/**
 * Lumen template blueprint — Beauty · Cosmetics
 *
 * Soft blush gradients, italic Fraunces serif, generous whitespace.
 * Rounded shape, balanced rhythm.
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
import { lumenHome } from "./home";
import { lumenPdp } from "./pdp";
import { lumenCart } from "./cart";
import { lumenHeader } from "./header";
import { lumenFooter } from "./footer";

const lumenNav = buildTemplateNavSeed({
  brandName: "Lumen",
  brandTagline: "Skin rituals for soft-lit days.",
  headerLayout: "centered",
  footerLayout: "centered",
  enableNewsletter: true,
  newsletterHeading: "10% off your first ritual",
});

export const lumenBlueprint: TemplateBlueprint = {
  slug: "lumen",
  ...lumenNav,
  layouts: {
    header: lumenHeader(),
    home: lumenHome(),
    footer: lumenFooter(),
    "products-index": (() => {
      resetIdCounter();
      return productsIndexLayout();
    })(),
    "product-detail": lumenPdp(),
    offers: (() => {
      resetIdCounter();
      return offersLayout();
    })(),
    cart: lumenCart(),
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
    mode: "light",
    colors: {
      primary: "#6b3f33",
      secondary: "#8a5e51",
      accent: "#ecc8b9",
      background: "#f5dfd2",
      surface: "#fbf4ee",
      text: "#6b3f33",
      muted: "#9a7a6f",
      border: "#e8c8b8",
      ring: "#6b3f33",
      onPrimary: "#fbf4ee",
    },
    typography: {
      heading: {
        family: "Fraunces, 'Times New Roman', serif",
        weights: [300, 400],
      },
      body: { family: "Inter, system-ui, sans-serif" },
      display: { family: "Fraunces, 'Times New Roman', serif", weights: [300] },
      scaleRatio: 1.25,
      baseSize: 16,
    },
    spacing: { unit: 4, section: "balanced", container: 1200 },
    shape: { radius: "rounded", buttonStyle: "pill" },
    motion: { enableAnimations: true, duration: 240 },
  },
};
