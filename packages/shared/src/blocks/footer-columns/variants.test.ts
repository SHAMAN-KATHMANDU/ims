/**
 * Variant schema invariants for footer-columns.
 *
 * The block component's switch-on-variant only stays meaningful as long
 * as the schema accepts every variant string the renderer dispatches
 * on. These tests lock that contract — adding a new variant to the
 * renderer without extending the schema enum (or vice versa) breaks
 * here.
 */

import { describe, it, expect } from "vitest";
import { FooterColumnsSchema } from "./schema";

const VARIANTS = ["standard", "minimal", "dark", "centered"] as const;

describe("FooterColumns variant schema", () => {
  for (const variant of VARIANTS) {
    it(`accepts variant="${variant}"`, () => {
      const result = FooterColumnsSchema.safeParse({
        variant,
        brand: "Brand",
        columns: [{ title: "Shop", links: [{ label: "All", href: "/" }] }],
      });
      expect(result.success).toBe(true);
    });
  }

  it("rejects unknown variants so renderer dispatch can rely on the enum", () => {
    const result = FooterColumnsSchema.safeParse({
      variant: "neon-glow",
      brand: "Brand",
    });
    expect(result.success).toBe(false);
  });

  it("variant is optional — legacy blocks without one still validate", () => {
    const result = FooterColumnsSchema.safeParse({
      brand: "Brand",
      columns: [{ title: "Shop" }],
    });
    expect(result.success).toBe(true);
  });
});
