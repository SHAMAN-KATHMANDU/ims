/**
 * Foxglove & Co. template blueprint — Books · Stationery
 *
 * Library-paper warmth. Fraunces 400 italic display, hairline 1px radius,
 * spacious rhythm.
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
import { foxgloveHome } from "./home";
import { foxglovePdp } from "./pdp";
import { foxgloveCart } from "./cart";
import { foxgloveHeader } from "./header";
import { foxgloveFooter } from "./footer";

const foxgloveNav = buildTemplateNavSeed({
  brandName: "Foxglove & Co.",
  brandTagline: "Books, papers, and things to write with.",
  headerLayout: "centered",
  footerLayout: "stacked",
  enableNewsletter: true,
  newsletterHeading: "A monthly reading list",
});

export const foxgloveBlueprint: TemplateBlueprint = {
  slug: "foxglove",
  ...foxgloveNav,
  layouts: {
    header: foxgloveHeader(),
    home: foxgloveHome(),
    footer: foxgloveFooter(),
    "products-index": (() => {
      resetIdCounter();
      return productsIndexLayout();
    })(),
    "product-detail": foxglovePdp(),
    offers: (() => {
      resetIdCounter();
      return offersLayout();
    })(),
    cart: foxgloveCart(),
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
      primary: "#2a1f17",
      secondary: "#6b3a26",
      accent: "#2f4a3a",
      background: "#ece4d3",
      surface: "#ddd2bb",
      text: "#2a1f17",
      muted: "#6e5a48",
      border: "#c8b89c",
      ring: "#6b3a26",
      onPrimary: "#ece4d3",
    },
    typography: {
      heading: { family: "Fraunces, Georgia, serif", weights: [400, 500] },
      body: { family: "Inter, system-ui, sans-serif" },
      display: { family: "Fraunces, Georgia, serif", weights: [400] },
      scaleRatio: 1.25,
      baseSize: 17,
    },
    spacing: { unit: 4, section: "spacious", container: 1280 },
    shape: { radius: 1, buttonStyle: "outline" },
    motion: { enableAnimations: true, duration: 240 },
  },
};
