/**
 * Pantry & Co. template blueprint — Food · Gourmet
 *
 * Hand-feel labels, warm reds, recipe-style. Fraunces 500 display,
 * 4px radius, balanced rhythm.
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
import { pantryHome } from "./home";
import { pantryPdp } from "./pdp";
import { pantryCart } from "./cart";
import { pantryHeader } from "./header";
import { pantryFooter } from "./footer";

export const pantryBlueprint: TemplateBlueprint = {
  slug: "pantry",
  layouts: {
    header: pantryHeader(),
    home: pantryHome(),
    footer: pantryFooter(),
    "products-index": (() => {
      resetIdCounter();
      return productsIndexLayout();
    })(),
    "product-detail": pantryPdp(),
    offers: (() => {
      resetIdCounter();
      return offersLayout();
    })(),
    cart: pantryCart(),
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
      primary: "#b53626",
      secondary: "#3a4a2a",
      accent: "#b53626",
      background: "#f1e6d2",
      surface: "#ebd9b9",
      text: "#2a1a14",
      muted: "#6e5a48",
      border: "#d8c19d",
      ring: "#b53626",
      onPrimary: "#f1e6d2",
    },
    typography: {
      heading: { family: "Fraunces, Georgia, serif", weights: [400, 500, 600] },
      body: { family: "Inter, system-ui, sans-serif" },
      display: { family: "Fraunces, Georgia, serif", weights: [500] },
      scaleRatio: 1.25,
      baseSize: 16,
    },
    spacing: { unit: 4, section: "balanced", container: 1280 },
    shape: { radius: 4, buttonStyle: "solid" },
    motion: { enableAnimations: true, duration: 200 },
  },
};
