/**
 * Maison template blueprint — Interior · Furniture
 *
 * Editorial warmth: oak/clay palette, Fraunces serif display, Inter body,
 * sharp 2px radius, spacious section rhythm.
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
import { maisonHome } from "./home";
import { maisonPdp } from "./pdp";
import { maisonCart } from "./cart";
import { maisonHeader } from "./header";
import { maisonFooter } from "./footer";

export const maisonBlueprint: TemplateBlueprint = {
  slug: "maison",
  layouts: {
    header: maisonHeader(),
    home: maisonHome(),
    footer: maisonFooter(),
    "products-index": (() => {
      resetIdCounter();
      return productsIndexLayout();
    })(),
    "product-detail": maisonPdp(),
    offers: (() => {
      resetIdCounter();
      return offersLayout();
    })(),
    cart: maisonCart(),
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
      primary: "#2a241a",
      secondary: "#7a6845",
      accent: "#c9a672",
      background: "#f7f1e3",
      surface: "#ede4cc",
      text: "#2a241a",
      muted: "#7a6845",
      border: "#d9caa3",
      ring: "#2a241a",
      onPrimary: "#f7f1e3",
    },
    typography: {
      heading: {
        family: "Fraunces, 'Times New Roman', serif",
        weights: [300, 400, 500],
      },
      body: { family: "Inter, system-ui, sans-serif" },
      display: { family: "Fraunces, 'Times New Roman', serif" },
      scaleRatio: 1.25,
      baseSize: 16,
    },
    spacing: { unit: 4, section: "spacious", container: 1320 },
    shape: { radius: "sharp", buttonStyle: "solid" },
    motion: { enableAnimations: true, duration: 220 },
  },
};
