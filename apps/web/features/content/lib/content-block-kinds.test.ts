import { describe, it, expect } from "vitest";
import {
  CONTENT_BODY_KINDS,
  listContentBodyCatalog,
  isContentBodyKind,
} from "./content-block-kinds";

describe("content-block-kinds", () => {
  it("CONTENT_BODY_KINDS has no duplicates", () => {
    expect(new Set(CONTENT_BODY_KINDS).size).toBe(CONTENT_BODY_KINDS.length);
  });

  it("listContentBodyCatalog returns only allowlisted kinds", () => {
    const catalog = listContentBodyCatalog();
    expect(catalog.length).toBeGreaterThan(0);
    const allowed = new Set(CONTENT_BODY_KINDS);
    for (const entry of catalog) {
      expect(allowed.has(entry.kind)).toBe(true);
    }
  });

  it("listContentBodyCatalog excludes commerce / pdp / header-footer kinds", () => {
    const catalog = listContentBodyCatalog();
    const kinds = catalog.map((e) => e.kind);
    // sanity: a handful of kinds we know should NOT be in a content body
    for (const k of [
      "product-grid",
      "pdp-buybox",
      "nav-bar",
      "footer-columns",
      "cart-line-items",
      "order-summary",
    ]) {
      expect(kinds).not.toContain(k);
    }
  });

  it("isContentBodyKind reflects allowlist membership", () => {
    expect(isContentBodyKind("heading")).toBe(true);
    expect(isContentBodyKind("image")).toBe(true);
    expect(isContentBodyKind("product-grid")).toBe(false);
    expect(isContentBodyKind("nonsense")).toBe(false);
  });
});
