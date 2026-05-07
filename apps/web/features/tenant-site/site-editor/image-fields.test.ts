import { describe, it, expect } from "vitest";
import { isImageFieldName } from "./image-fields";
import { BLOCK_PROPS_SCHEMAS } from "@repo/shared";
import { z } from "zod";

describe("isImageFieldName", () => {
  it("matches always-image field names regardless of context", () => {
    for (const name of [
      "imageUrl",
      "logoUrl",
      "logoSrc",
      "faviconUrl",
      "backgroundImage",
      "posterImage",
      "videoPoster",
      "bgImage",
      "imageSrc",
      "thumbnailUrl",
      "coverImage",
      "heroImage",
    ]) {
      expect(
        isImageFieldName(name),
        `${name} should be recognized as an image field`,
      ).toBe(true);
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
    expect(isImageFieldName("src", { parentField: "gallery" })).toBe(true);
    expect(isImageFieldName("src", { parentField: "items" })).toBe(true);
  });

  it("does not match arbitrary string fields", () => {
    expect(isImageFieldName("title")).toBe(false);
    expect(isImageFieldName("ctaHref")).toBe(false);
    expect(isImageFieldName("description", { blockKind: "image" })).toBe(false);
  });

  it("covers image fields across known block schemas (audit)", () => {
    // This is an audit test that walks through actual block schemas
    // and ensures image-shaped fields are correctly identified.
    // Known image fields by block kind:
    const knownImageFields: Record<
      string,
      { name: string; parentField?: string; blockKind?: string }[]
    > = {
      hero: [{ name: "imageUrl" }, { name: "videoPoster" }],
      "logo-cloud": [
        { name: "src", parentField: "logos" }, // src under logos array
      ],
      gallery: [
        { name: "src", parentField: "images" }, // src under images array
      ],
      lookbook: [
        { name: "imageUrl", parentField: "scenes" }, // in scenes array
      ],
      section: [{ name: "backgroundImage" }],
      image: [{ name: "src", blockKind: "image" }],
      "logo-mark": [{ name: "src", blockKind: "logo-mark" }],
      collection: [{ name: "imageUrl" }],
      "story-split": [{ name: "imageUrl" }],
    };

    for (const [blockKindLabel, fields] of Object.entries(knownImageFields)) {
      for (const field of fields) {
        const ctx = {} as { blockKind?: string; parentField?: string };
        if (field.blockKind) ctx.blockKind = field.blockKind;
        if (field.parentField) ctx.parentField = field.parentField;

        const isImage = isImageFieldName(field.name, ctx);
        expect(
          isImage,
          `${field.name} in ${blockKindLabel} (context: ${JSON.stringify(ctx)}) should be recognized as image field`,
        ).toBe(true);
      }
    }
  });
});
