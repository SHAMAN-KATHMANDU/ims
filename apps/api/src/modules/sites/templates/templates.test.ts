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
import {
  TEMPLATE_BLUEPRINTS,
  BLUEPRINT_SCOPES,
  getTemplateBlueprint,
} from "./index";

describe("getTemplateBlueprint — fallback resolution", () => {
  it("falls back to in-code blueprint when canonical row has only empty defaults (regression)", () => {
    // The DB seed writes `defaultPages: []` (empty array) and leaves
    // `defaultLayouts` / `defaultThemeTokens` null. The previous all-or-nothing
    // logic short-circuited on the truthy `[]` and returned a blueprint with
    // no layouts ⇒ "No blocks yet" after every Apply. Verify the resolver now
    // looks past empty overrides and uses the in-code blueprint's layouts.
    const blueprint = getTemplateBlueprint("maison", {
      canonicalTemplate: {
        defaultLayouts: null,
        defaultThemeTokens: null,
        defaultPages: [],
      },
    });
    expect(blueprint).not.toBeNull();
    expect(blueprint?.layouts?.home).toBeDefined();
    expect((blueprint?.layouts?.home ?? []).length).toBeGreaterThan(0);
  });

  it("uses canonical layouts when they're non-empty", () => {
    const fakeLayouts = { home: [{ id: "x", type: "spacer", props: {} }] };
    const blueprint = getTemplateBlueprint("maison", {
      canonicalTemplate: {
        defaultLayouts: fakeLayouts,
        defaultThemeTokens: null,
        defaultPages: [],
      },
    });
    expect(blueprint?.layouts).toEqual(fakeLayouts);
  });

  it("returns null for an unknown slug with no overrides", () => {
    expect(getTemplateBlueprint("does-not-exist")).toBeNull();
  });
});

describe("Template blueprints — schema validation", () => {
  for (const [slug, blueprint] of Object.entries(TEMPLATE_BLUEPRINTS)) {
    describe(slug, () => {
      for (const scope of BLUEPRINT_SCOPES) {
        it(`${scope} layout passes BlockTreeSchema`, () => {
          const blocks = blueprint.layouts?.[scope];
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
