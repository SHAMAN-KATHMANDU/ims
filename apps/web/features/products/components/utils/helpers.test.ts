import { describe, expect, it } from "vitest";
import type { ProductVariationForm } from "../types";
import {
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
