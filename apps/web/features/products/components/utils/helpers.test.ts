import { describe, expect, it } from "vitest";
import type { ProductVariationForm } from "../types";
import {
  pruneVariationAttributes,
  variationWithAddedPhoto,
  variationWithPrimaryPhoto,
  variationWithRemovedPhoto,
} from "./helpers";

// Regression guard for #561: editing photos on an existing variation used to
// rebuild the variation object inline and drop `id`, `attributes`, and
// `locationId`. Without `id`, the API treated the row as a new variation on
// save and the update 500'd with "Error Saving Product".
const existingVariation: ProductVariationForm = {
  id: "var-123",
  stockQuantity: "42",
  locationId: "loc-1",
  locationName: "Warehouse A",
  subVariants: ["S", "M"],
  photos: [
    { photoUrl: "https://example.com/a.jpg", isPrimary: true },
    { photoUrl: "https://example.com/b.jpg", isPrimary: false },
  ],
  attributes: [{ attributeTypeId: "color", attributeValueId: "red" }],
};

describe("variationWithAddedPhoto", () => {
  it("preserves id, attributes, locationId and subVariants when adding a photo", () => {
    const result = variationWithAddedPhoto(
      existingVariation,
      "https://example.com/c.jpg",
      "c.jpg",
    );

    expect(result.id).toBe("var-123");
    expect(result.attributes).toEqual(existingVariation.attributes);
    expect(result.locationId).toBe("loc-1");
    expect(result.locationName).toBe("Warehouse A");
    expect(result.subVariants).toEqual(["S", "M"]);
    expect(result.stockQuantity).toBe("42");
  });

  it("appends the new photo without mutating the input", () => {
    const before = JSON.stringify(existingVariation);
    const result = variationWithAddedPhoto(
      existingVariation,
      "https://example.com/c.jpg",
    );

    expect(result.photos).toHaveLength(3);
    expect(result.photos[2]).toEqual({
      photoUrl: "https://example.com/c.jpg",
      isPrimary: false,
      fileName: undefined,
    });
    expect(JSON.stringify(existingVariation)).toBe(before);
  });

  it("marks the first photo as primary when there are none yet", () => {
    const empty: ProductVariationForm = {
      ...existingVariation,
      photos: [],
    };
    const result = variationWithAddedPhoto(empty, "https://example.com/x.jpg");
    expect(result.photos[0]?.isPrimary).toBe(true);
  });
});

describe("variationWithRemovedPhoto", () => {
  it("preserves id and other variation fields when removing a photo", () => {
    const result = variationWithRemovedPhoto(existingVariation, 1);

    expect(result.id).toBe("var-123");
    expect(result.attributes).toEqual(existingVariation.attributes);
    expect(result.locationId).toBe("loc-1");
    expect(result.photos).toHaveLength(1);
    expect(result.photos[0]?.photoUrl).toBe("https://example.com/a.jpg");
  });

  it("promotes the new first photo to primary when the primary was removed", () => {
    const result = variationWithRemovedPhoto(existingVariation, 0);

    expect(result.photos).toHaveLength(1);
    expect(result.photos[0]?.photoUrl).toBe("https://example.com/b.jpg");
    expect(result.photos[0]?.isPrimary).toBe(true);
  });

  it("does not mutate the input variation's photos", () => {
    const before = JSON.stringify(existingVariation);
    variationWithRemovedPhoto(existingVariation, 0);
    expect(JSON.stringify(existingVariation)).toBe(before);
  });
});

describe("variationWithPrimaryPhoto", () => {
  it("preserves id and other variation fields when changing primary", () => {
    const result = variationWithPrimaryPhoto(existingVariation, 1);

    expect(result.id).toBe("var-123");
    expect(result.attributes).toEqual(existingVariation.attributes);
    expect(result.locationId).toBe("loc-1");
    expect(result.stockQuantity).toBe("42");
  });

  it("sets exactly one photo as primary", () => {
    const result = variationWithPrimaryPhoto(existingVariation, 1);

    expect(result.photos[0]?.isPrimary).toBe(false);
    expect(result.photos[1]?.isPrimary).toBe(true);
    expect(result.photos.filter((p) => p.isPrimary)).toHaveLength(1);
  });

  it("does not mutate input photo objects", () => {
    const before = JSON.stringify(existingVariation);
    variationWithPrimaryPhoto(existingVariation, 1);
    expect(JSON.stringify(existingVariation)).toBe(before);
  });
});

// Regression guard for #599: re-creating/deselecting an attribute type after
// renaming a product used to leave orphan attribute rows on each variation, so
// the variant name leaked historical/duplicate values like "Grey / M / M / Black".
describe("pruneVariationAttributes", () => {
  it("drops attributes whose type is no longer selected", () => {
    const attrs = [
      { attributeTypeId: "color-old", attributeValueId: "grey" },
      { attributeTypeId: "size", attributeValueId: "m" },
      { attributeTypeId: "color", attributeValueId: "black" },
    ];
    const result = pruneVariationAttributes(attrs, ["size", "color"]);
    expect(result).toEqual([
      { attributeTypeId: "size", attributeValueId: "m" },
      { attributeTypeId: "color", attributeValueId: "black" },
    ]);
  });

  it("collapses duplicate entries for the same type, keeping the last", () => {
    const attrs = [
      { attributeTypeId: "size", attributeValueId: "s" },
      { attributeTypeId: "size", attributeValueId: "m" },
    ];
    const result = pruneVariationAttributes(attrs, ["size"]);
    expect(result).toEqual([
      { attributeTypeId: "size", attributeValueId: "m" },
    ]);
  });

  it("passes attributes through untouched when no types are selected", () => {
    const attrs = [{ attributeTypeId: "size", attributeValueId: "m" }];
    expect(pruneVariationAttributes(attrs, [])).toEqual(attrs);
  });

  it("returns an empty array for missing/empty attributes", () => {
    expect(pruneVariationAttributes(undefined, ["size"])).toEqual([]);
    expect(pruneVariationAttributes([], ["size"])).toEqual([]);
  });
});
