import { describe, it, expect } from "vitest";
import { ImageRefSchema } from "./media";

describe("ImageRefSchema", () => {
  describe("valid inputs", () => {
    it("accepts { assetId } with valid UUID", () => {
      const result = ImageRefSchema.safeParse({
        assetId: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          assetId: "550e8400-e29b-41d4-a716-446655440000",
        });
      }
    });

    it("accepts { url } with valid URL", () => {
      const result = ImageRefSchema.safeParse({
        url: "https://example.com/image.jpg",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          url: "https://example.com/image.jpg",
        });
      }
    });

    it("accepts relative URLs", () => {
      const result = ImageRefSchema.safeParse({
        url: "/images/photo.png",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          url: "/images/photo.png",
        });
      }
    });

    it("accepts data URIs", () => {
      const result = ImageRefSchema.safeParse({
        url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("rejects invalid UUID in assetId", () => {
      const result = ImageRefSchema.safeParse({
        assetId: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty string URL", () => {
      const result = ImageRefSchema.safeParse({
        url: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects URL exceeding max length", () => {
      const result = ImageRefSchema.safeParse({
        url: "https://example.com/" + "x".repeat(2000),
      });
      expect(result.success).toBe(false);
    });

    it("rejects both assetId and url (must be one or the other)", () => {
      const result = ImageRefSchema.safeParse({
        assetId: "550e8400-e29b-41d4-a716-446655440000",
        url: "https://example.com/image.jpg",
      });
      expect(result.success).toBe(false);
    });

    it("rejects neither assetId nor url", () => {
      const result = ImageRefSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("rejects extra fields (strict mode)", () => {
      const result = ImageRefSchema.safeParse({
        assetId: "550e8400-e29b-41d4-a716-446655440000",
        extra: "field",
      });
      expect(result.success).toBe(false);
    });

    it("rejects null values", () => {
      const result = ImageRefSchema.safeParse({
        assetId: null,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("trims whitespace from URL", () => {
      const result = ImageRefSchema.safeParse({
        url: "  https://example.com/image.jpg  ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.url).toBe("https://example.com/image.jpg");
      }
    });

    it("accepts very short URLs", () => {
      const result = ImageRefSchema.safeParse({
        url: "a",
      });
      expect(result.success).toBe(true);
    });
  });
});
