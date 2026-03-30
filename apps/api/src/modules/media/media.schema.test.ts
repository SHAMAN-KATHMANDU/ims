import { describe, it, expect } from "vitest";
import {
  PresignBodySchema,
  RegisterMediaAssetSchema,
  ListMediaQuerySchema,
} from "./media.schema";

describe("media.schema", () => {
  it("PresignBodySchema accepts product_photo with contentLength", () => {
    const r = PresignBodySchema.safeParse({
      purpose: "product_photo",
      mimeType: "image/png",
      contentLength: 100,
    });
    expect(r.success).toBe(true);
  });

  it("PresignBodySchema rejects when contentLength exceeds purpose max", () => {
    const r = PresignBodySchema.safeParse({
      purpose: "product_photo",
      mimeType: "image/png",
      contentLength: 20 * 1024 * 1024,
    });
    expect(r.success).toBe(false);
  });

  it("PresignBodySchema requires entityId for contact_attachment", () => {
    const r = PresignBodySchema.safeParse({
      purpose: "contact_attachment",
      mimeType: "application/pdf",
      contentLength: 1,
    });
    expect(r.success).toBe(false);
  });

  it("PresignBodySchema accepts contact_attachment with UUID entityId", () => {
    const r = PresignBodySchema.safeParse({
      purpose: "contact_attachment",
      mimeType: "application/pdf",
      contentLength: 500,
      entityId: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb",
    });
    expect(r.success).toBe(true);
  });

  it("RegisterMediaAssetSchema allows omitting publicUrl", () => {
    const r = RegisterMediaAssetSchema.safeParse({
      storageKey: "k",
      fileName: "a.png",
      mimeType: "image/png",
      purpose: "library",
    });
    expect(r.success).toBe(true);
  });

  it("RegisterMediaAssetSchema validates publicUrl when provided", () => {
    expect(
      RegisterMediaAssetSchema.safeParse({
        storageKey: "k",
        publicUrl: "not-a-url",
        fileName: "a.png",
        mimeType: "image/png",
        purpose: "library",
      }).success,
    ).toBe(false);
  });

  it("ListMediaQuerySchema defaults limit", () => {
    const r = ListMediaQuerySchema.parse({});
    expect(r.limit).toBe(20);
  });
});
