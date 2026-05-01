/**
 * Blank template blueprint — minimal theme tokens, full home/pdp structure
 */

import { resetIdCounter } from "../_shared/factories";
import { productsIndexLayout, offersLayout } from "../_shared";
import type { TemplateBlueprint } from "@repo/shared";
import { blankHome } from "./home";
import { blankPdp } from "./pdp";

export const blankBlueprint: TemplateBlueprint = {
  slug: "blank",
  layouts: {
    home: blankHome(),
    "products-index": (() => {
      resetIdCounter();
      return productsIndexLayout();
    })(),
    offers: (() => {
      resetIdCounter();
      return offersLayout();
    })(),
    "product-detail": blankPdp(),
  },
};
