/**
 * Variant schema invariants for nav-bar. Mirrors the footer-columns
 * variants test — keeps the schema↔renderer dispatch table in sync.
 */

import { describe, it, expect } from "vitest";
import { NavBarSchema } from "./schema";

const VARIANTS = ["standard", "centered", "split", "transparent"] as const;

describe("NavBar variant schema", () => {
  for (const variant of VARIANTS) {
    it(`accepts variant="${variant}"`, () => {
      const result = NavBarSchema.safeParse({
        variant,
        brand: "Shop",
        items: [{ label: "Home", href: "/" }],
      });
      expect(result.success).toBe(true);
    });
  }

  it("rejects unknown variants so renderer dispatch can rely on the enum", () => {
    const result = NavBarSchema.safeParse({
      variant: "rainbow",
      brand: "Shop",
    });
    expect(result.success).toBe(false);
  });

  it("variant is optional — legacy blocks without one still validate", () => {
    const result = NavBarSchema.safeParse({
      brand: "Shop",
      items: [],
    });
    expect(result.success).toBe(true);
  });
});
