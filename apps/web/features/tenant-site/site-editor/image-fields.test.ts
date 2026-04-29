import { describe, it, expect } from "vitest";
import { isImageFieldName } from "./image-fields";

describe("isImageFieldName", () => {
  it("matches always-image field names regardless of context", () => {
    for (const name of [
      "imageUrl",
      "logoUrl",
      "logoSrc",
      "faviconUrl",
      "backgroundImage",
      "posterImage",
    ]) {
      expect(isImageFieldName(name)).toBe(true);
    }
  });

  it("matches `src` only on known image block kinds", () => {
    expect(isImageFieldName("src", { blockKind: "image" })).toBe(true);
    expect(isImageFieldName("src", { blockKind: "logo-mark" })).toBe(true);
    // Embed and video also use `src`, but those are URLs to non-image media.
    expect(isImageFieldName("src", { blockKind: "embed" })).toBe(false);
    expect(isImageFieldName("src", { blockKind: "video" })).toBe(false);
  });

  it("matches `src` when nested under an image-shaped array parent", () => {
    expect(isImageFieldName("src", { parentField: "images" })).toBe(true);
    expect(isImageFieldName("src", { parentField: "logos" })).toBe(true);
    expect(isImageFieldName("src", { parentField: "slides" })).toBe(true);
  });

  it("does not match arbitrary string fields", () => {
    expect(isImageFieldName("title")).toBe(false);
    expect(isImageFieldName("ctaHref")).toBe(false);
    expect(isImageFieldName("description", { blockKind: "image" })).toBe(false);
  });
});
