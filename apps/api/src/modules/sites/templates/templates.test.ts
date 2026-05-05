/**
 * Validates every registered template blueprint against BlockTreeSchema.
 *
 * Catches silent template corruption: a block referenced in a layout whose
 * props don't match its `.strict()` Zod schema would round-trip through the
 * DB on seed, then fail validation on the user's first editor save (which
 * surfaces as a confusing "Invalid block tree" 400). Failing here turns it
 * into a CI failure on the PR that introduced the bad template.
 */

import { describe, it, expect } from "vitest";
import { BlockTreeSchema } from "@repo/shared";
import { TEMPLATE_BLUEPRINTS, BLUEPRINT_SCOPES } from "./index";

describe("Template blueprints — schema validation", () => {
  for (const [slug, blueprint] of Object.entries(TEMPLATE_BLUEPRINTS)) {
    describe(slug, () => {
      for (const scope of BLUEPRINT_SCOPES) {
        it(`${scope} layout passes BlockTreeSchema`, () => {
          const blocks = blueprint.layouts[scope];
          if (!blocks || blocks.length === 0) return;
          const result = BlockTreeSchema.safeParse(blocks);
          if (!result.success) {
            const issues = result.error.issues
              .slice(0, 3)
              .map((i) => `${i.path.join(".")}: ${i.message}`)
              .join("; ");
            throw new Error(
              `Template "${slug}" layout "${scope}" invalid: ${issues}`,
            );
          }
          expect(result.success).toBe(true);
        });
      }
    });
  }
});
