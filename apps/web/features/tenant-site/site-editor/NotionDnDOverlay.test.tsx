import { describe, it, expect } from "vitest";
import type { BlockKind } from "@repo/shared";
import { isContainerKind } from "./NotionDnDOverlay";

describe("isContainerKind", () => {
  it("recognises the four container kinds", () => {
    expect(isContainerKind("section" as BlockKind)).toBe(true);
    expect(isContainerKind("row" as BlockKind)).toBe(true);
    expect(isContainerKind("columns" as BlockKind)).toBe(true);
    expect(isContainerKind("css-grid" as BlockKind)).toBe(true);
  });

  it("returns false for leaf kinds", () => {
    expect(isContainerKind("button" as BlockKind)).toBe(false);
    expect(isContainerKind("heading" as BlockKind)).toBe(false);
    expect(isContainerKind("image" as BlockKind)).toBe(false);
  });

  it("returns false for unknown / null / empty inputs", () => {
    expect(isContainerKind(null)).toBe(false);
    expect(isContainerKind("" as BlockKind)).toBe(false);
    expect(isContainerKind("not-a-block-kind" as BlockKind)).toBe(false);
  });
});
